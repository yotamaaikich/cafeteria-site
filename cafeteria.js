import { CAPACITY } from "./config.js";
export { CAPACITY } from "./config.js";
export const MENU_IDS = ["curry", "ramen", "karaage", "daily"];
export const DATA_COLUMNS = "id,people,occupancy,status,status_icon,predict10,predict20,notice,curry,ramen,karaage,daily,updated_at,is_measurement";

export function formatConnectionStatus(updatedAt, now = Date.now()) {
    const updated = Date.parse(updatedAt);
    if (!Number.isFinite(updated) || updated > now || now - updated > 3 * 60_000) {
        return "🟡 更新が止まっています（保存済みデータ）";
    }
    return "🟢 最新データを表示中";
}

export function formatPrediction(people) {
    if (people == null) return "データなし";
    const ratio = people / CAPACITY;
    const label = ratio < 0.3 ? "🟢 空いている" : ratio < 0.7 ? "🟡 普通" : "🔴 混雑";
    return `${label}（約${people}人・目安）`;
}

export function buildCafeteriaData(people, menu, notice, isMeasurement = false) {
    if (!Number.isInteger(people) || people < 0) {
        throw new Error("人数は0以上の整数で入力してください。");
    }
    const occupancy = Math.round(people / CAPACITY * 100);
    const status = occupancy < 30 ? "空いている" : occupancy < 70 ? "普通" : "混雑";
    const statusIcon = occupancy < 30 ? "🟢" : occupancy < 70 ? "🟡" : "🔴";
    return {
        people,
        occupancy,
        status,
        status_icon: statusIcon,
        // 旧カラムへ仮の予測値は保存せず、利用者画面で実測履歴から計算します。
        predict10: null,
        predict20: null,
        is_measurement: Boolean(isMeasurement),
        notice: String(notice).slice(0, 2000),
        ...Object.fromEntries(MENU_IDS.map(id => [id, Boolean(menu[id])])),
        updated_at: new Date().toISOString()
    };
}

export async function readCafeteria(client) {
    const { data, error } = await client.from("cafeteria")
        .select(DATA_COLUMNS).order("updated_at", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return data;
}

export async function saveCafeteria(client, record) {
    const { data, error } = await client.from("cafeteria")
        .insert(record).select(DATA_COLUMNS).single();
    if (error) throw error;
    return data;
}

export function renderCafeteria(document, data) {
    const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };
    // 以前の定員で保存した履歴も、現在の定員を基準に表示します。
    const occupancy = Math.round((data.people ?? 0) / CAPACITY * 100);
    setText("statusText", occupancy < 30 ? "空いている" : occupancy < 70 ? "普通" : "混雑");
    setText("statusIcon", occupancy < 30 ? "🟢" : occupancy < 70 ? "🟡" : "🔴");
    setText("people", `現在${data.people ?? 0}人利用中`);
    setText("occupancy", `利用率 ${occupancy}%（定員${CAPACITY}人）`);
    setText("noticeText", data.notice || "お知らせはありません");
    const progress = document.getElementById("progressBar");
    if (progress) {
        progress.style.width = `${Math.min(100, Math.max(0, occupancy))}%`;
        progress.style.backgroundColor = occupancy < 30 ? "#22C55E" : occupancy < 70 ? "#F59E0B" : "#EF4444";
    }
    for (const id of MENU_IDS) {
        const badge = document.getElementById(`${id}Status`);
        if (!badge) continue;
        badge.textContent = data[id] ? "販売中" : "売り切れ";
        badge.className = `badge ${data[id] ? "badge-green" : "badge-red"}`;
    }
    const updated = new Date(data.updated_at);
    setText("lastUpdate", Number.isNaN(updated.getTime()) ? "最終更新日時なし" : `最終更新 ${updated.toLocaleString("ja-JP")}`);
}
