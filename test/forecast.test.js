import test from "node:test";
import assert from "node:assert/strict";
import { forecastCrowding, readForecastContext, renderForecast } from "../forecast.js";
import { formatPrediction } from "../cafeteria.js";

const MINUTE = 60_000;
const DAY = 1440 * MINUTE;
const NOW = Date.parse("2026-10-23T03:00:00Z"); // 金曜12時(JST)
const point = (time, people) => ({ at: new Date(time).toISOString(), people });
const context = counts => ({ as_of: new Date(NOW).toISOString(),
    recent: counts.map((people, i) => point(NOW - (counts.length - 1 - i) * MINUTE, people)), historical: [] });

test("履歴不足・重複保存・中断・古い計測では予測値を作らない", () => {
    assert.equal(forecastCrowding(null).status, "unavailable");
    assert.equal(forecastCrowding(context([])).status, "insufficient");
    const duplicate = context([10]);
    duplicate.recent = Array.from({ length: 20 }, () => duplicate.recent[0]);
    assert.equal(forecastCrowding(duplicate).status, "insufficient");
    const gap = context([10, 11, 12, 13, 14, 15]);
    gap.recent.splice(2, 2);
    assert.equal(forecastCrowding(gap).status, "insufficient");
    const stale = context([10, 11, 12, 13, 14, 15]);
    stale.as_of = new Date(NOW + 4 * MINUTE).toISOString();
    assert.equal(forecastCrowding(stale).status, "stale");
});

test("実際の増加・減少の推移から10分後と20分後の別々の値を計算する", () => {
    const growing = forecastCrowding(context([10, 11, 12, 13, 14, 15]));
    assert.equal(growing.status, "ready");
    assert.equal(growing.ten, 23);
    assert.equal(growing.twenty, 28);
    const declining = forecastCrowding(context([20, 19, 18, 17, 16, 15]));
    assert.equal(declining.ten, 7);
    assert.equal(declining.twenty, 2);
    const zero = forecastCrowding(context([0, 0, 0, 0, 0, 0]));
    assert.equal(zero.ten, 0);
    assert.equal(zero.twenty, 0);
});

test("単発の大きな誤検出に引きずられず、予測は0〜40人に収める", () => {
    const noisy = forecastCrowding(context([10, 11, 12, 13, 14, 100]));
    const clean = forecastCrowding(context([10, 11, 12, 13, 14, 15]));
    assert.equal(noisy.ten, clean.ten);
    assert.equal(noisy.twenty, clean.twenty);
    const full = forecastCrowding(context([30, 32, 34, 36, 38, 40]));
    assert.equal(full.ten, 40);
    assert.equal(full.twenty, 40);
    const empty = forecastCrowding(context([10, 8, 6, 4, 2, 0]));
    assert.equal(empty.ten, 0);
});

test("同じ曜日の履歴が3日あれば、別の曜日より優先して予測へ反映する", () => {
    const input = context([20, 20, 20, 20, 20, 20]);
    for (const daysAgo of [7, 14, 21]) {
        input.historical.push(point(NOW - daysAgo * DAY, 20),
            point(NOW - daysAgo * DAY + 10 * MINUTE, 30),
            point(NOW - daysAgo * DAY + 20 * MINUTE, 35));
    }
    for (const daysAgo of [1, 2, 3]) {
        input.historical.push(point(NOW - daysAgo * DAY, 20),
            point(NOW - daysAgo * DAY + 10 * MINUTE, 0),
            point(NOW - daysAgo * DAY + 20 * MINUTE, 0));
    }
    const forecast = forecastCrowding(input);
    assert.equal(forecast.historicalDays, 3);
    assert.equal(forecast.ten, 24);
    assert.equal(forecast.twenty, 26);
});

test("未来・不正な観測を学習に使わず、日付をまたいでも過去の対応時刻を探す", () => {
    const input = context([10, 11, 12, 13, 14, 15]);
    input.recent.push(point(NOW + MINUTE, 1000), { at: "bad-date", people: 1000 }, point(NOW, -1));
    assert.equal(forecastCrowding(input).ten, 23);
    const midnight = context([20, 20, 20, 20, 20, 20]);
    const shift = Date.parse("2026-10-23T14:55:00Z") - NOW;
    midnight.as_of = new Date(NOW + shift).toISOString();
    midnight.recent = midnight.recent.map(row => point(Date.parse(row.at) + shift, row.people));
    for (const daysAgo of [7, 14, 21]) {
        midnight.historical.push(point(NOW + shift - daysAgo * DAY, 20),
            point(NOW + shift - daysAgo * DAY + 10 * MINUTE, 30),
            point(NOW + shift - daysAgo * DAY + 20 * MINUTE, 35));
    }
    assert.equal(forecastCrowding(midnight).ten, 24);
});

test("履歴の取得失敗を成功扱いにせず、予測値と不足状態を表示し分ける", async () => {
    await assert.rejects(() => readForecastContext({ rpc: async () => ({ error: new Error("offline") }) }), /offline/);
    const input = context([10, 11, 12, 13, 14, 15]);
    assert.equal(await readForecastContext({ rpc: async name => {
        assert.equal(name, "cafeteria_forecast_context"); return { data: input, error: null };
    } }), input);
    const nodes = new Map();
    const document = { getElementById(id) {
        if (!nodes.has(id)) nodes.set(id, { textContent: "" });
        return nodes.get(id);
    } };
    renderForecast(document, forecastCrowding(input), formatPrediction);
    assert.match(nodes.get("predict10").textContent, /約23人/);
    assert.match(nodes.get("predict20").textContent, /約28人/);
    assert.equal(nodes.get("predict10Label").textContent, "10分後（12:10）");
    renderForecast(document, { status: "insufficient" }, formatPrediction);
    assert.equal(nodes.get("predict10").textContent, "予測データ不足");
    renderForecast(document, { status: "stale" }, formatPrediction);
    assert.equal(nodes.get("predict20").textContent, "計測待ち");
});
