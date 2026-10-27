import { CAPACITY } from "./config.js";

const MINUTE = 60_000;
const DAY = 1440 * MINUTE;
const median = values => {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const jstDate = time => new Date(time + 9 * 60 * MINUTE).toISOString().slice(0, 10);
const jstWeekday = time => new Date(time + 9 * 60 * MINUTE).getUTCDay();
const isWeekend = day => day === 0 || day === 6;

function cleanPoints(rows, now) {
    const minutes = new Map();
    for (const row of rows ?? []) {
        const time = Date.parse(row.at);
        const people = row.people;
        if (!Number.isFinite(time) || time > now || !Number.isFinite(people) || people < 0) continue;
        const minute = Math.floor(time / MINUTE);
        const bucket = minutes.get(minute) ?? [];
        bucket.push({ time, people });
        minutes.set(minute, bucket);
    }
    return [...minutes.values()].map(bucket => ({
        time: Math.max(...bucket.map(point => point.time)),
        people: median(bucket.map(point => point.people))
    })).sort((a, b) => a.time - b.time);
}

function historicalChange(points, now, horizon) {
    const candidates = new Map();
    for (const point of points) {
        const age = now - point.time;
        const daysAgo = Math.round(age / DAY);
        const distance = Math.abs(age - daysAgo * DAY);
        if (daysAgo < 1 || daysAgo > 28 || distance > 3 * MINUTE) continue;
        const day = jstDate(point.time);
        const previous = candidates.get(day);
        if (!previous || distance < previous.distance) candidates.set(day, { point, distance });
    }
    const pairs = [];
    for (const { point } of candidates.values()) {
        const target = point.time + horizon * MINUTE;
        const closest = points.filter(other => Math.abs(other.time - target) <= 3 * MINUTE)
            .sort((a, b) => Math.abs(a.time - target) - Math.abs(b.time - target))[0];
        if (closest) pairs.push({ change: closest.people - point.people, weekday: jstWeekday(point.time) });
    }
    const weekday = jstWeekday(now);
    const sameWeekday = pairs.filter(pair => pair.weekday === weekday);
    const sameDayType = pairs.filter(pair => isWeekend(pair.weekday) === isWeekend(weekday));
    const selected = sameWeekday.length >= 3 ? sameWeekday : sameDayType;
    if (selected.length < 3) return null;
    return { change: median(selected.map(pair => pair.change)), days: selected.length };
}

/** 実測履歴から短期の人数を推定します。外部AIサービスは呼び出しません。 */
export function forecastCrowding(context) {
    const now = Date.parse(context?.as_of);
    if (!Number.isFinite(now)) return { status: "unavailable" };
    const recent = cleanPoints(context.recent, now).filter(point => now - point.time <= 15 * MINUTE);
    const latest = recent.at(-1);
    if (!latest) return { status: "insufficient", samples: 0, asOf: now };
    if (now - latest.time > 3 * MINUTE) return { status: "stale", asOf: now };
    let start = recent.length - 1;
    // カメラ停止をまたがず、連続して計測できた区間だけを使います。
    while (start > 0 && recent[start].time - recent[start - 1].time <= 2.5 * MINUTE) start--;
    const points = recent.slice(start);
    const span = (latest.time - points[0].time) / MINUTE;
    if (points.length < 6 || span < 5) return { status: "insufficient", samples: points.length, asOf: now };
    // Theil–Senの傾き推定で、単発の誤検出に影響されにくくします。
    const slopes = [];
    for (let a = 0; a < points.length; a++) {
        for (let b = a + 1; b < points.length; b++) {
            const minutes = (points[b].time - points[a].time) / MINUTE;
            if (minutes >= 2) slopes.push((points[b].people - points[a].people) / minutes);
        }
    }
    const slope = clamp(median(slopes), -CAPACITY / 10, CAPACITY / 10);
    const baseline = clamp(median(points.map(point =>
        point.people + slope * (latest.time - point.time) / MINUTE)), 0, CAPACITY);
    const historical = cleanPoints(context.historical, now);
    const age = (now - latest.time) / MINUTE;
    const predictions = {};
    let historicalDays = 0;
    for (const horizon of [10, 20]) {
        // 長い時間同じ速さで増減し続けるのを避け、20分の時定数で減衰します。
        const trendChange = slope * 20 * (1 - Math.exp(-(horizon + age) / 20));
        const season = historicalChange(historical, now, horizon);
        const weight = season ? 0.4 : 0;
        const change = trendChange * (1 - weight) + (season?.change ?? 0) * weight;
        predictions[horizon] = Math.round(clamp(baseline + change, 0, CAPACITY));
        historicalDays = Math.max(historicalDays, season?.days ?? 0);
    }
    return {
        status: "ready", ten: predictions[10], twenty: predictions[20],
        samples: points.length, spanMinutes: Math.round(span), historicalDays, asOf: now
    };
}

export async function readForecastContext(client) {
    const { data, error } = await client.rpc("cafeteria_forecast_context");
    if (error) throw error;
    return data;
}

export function renderForecast(document, forecast, formatPrediction) {
    const setText = (id, value) => {
        const target = document.getElementById(id);
        if (target) target.textContent = value;
    };
    if (forecast.status === "ready") {
        setText("predict10", formatPrediction(forecast.ten));
        setText("predict20", formatPrediction(forecast.twenty));
        const past = forecast.historicalDays ? `・過去${forecast.historicalDays}日の同時間帯も参照` : "";
        setText("predictionStatus", `直近${forecast.spanMinutes}分の計測から予測${past}。予測は目安です。`);
    } else {
        const waiting = forecast.status === "stale" ? "計測待ち" : forecast.status === "unavailable" ? "予測を取得できません" : "予測データ不足";
        setText("predict10", waiting);
        setText("predict20", waiting);
        setText("predictionStatus", forecast.status === "stale"
            ? "計測が止まっています。カメラの再開後に予測を更新します。"
            : forecast.status === "unavailable" ? "次の自動更新で再取得します。"
                : "カメラで約5分間の計測・保存を続けると、予測を表示します。");
    }
    for (const horizon of [10, 20]) {
        const time = forecast.asOf ? new Date(forecast.asOf + horizon * MINUTE).toLocaleTimeString("ja-JP", {
            timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false
        }) : "";
        setText(`predict${horizon}Label`, `${horizon}分後${time ? `（${time}）` : ""}`);
    }
}
