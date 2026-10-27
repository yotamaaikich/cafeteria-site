import test from "node:test";
import assert from "node:assert/strict";
import { buildCafeteriaData, readCafeteria, saveCafeteria, renderCafeteria, formatPrediction, formatConnectionStatus } from "../cafeteria.js";

const menu = { curry: true, ramen: false, karaage: true, daily: false };

test("古い保存データや日時不明のデータを最新の計測として表示しない", () => {
    const now = Date.parse("2026-10-27T06:00:00Z");
    assert.match(formatConnectionStatus("2026-10-27T05:59:00Z", now), /最新データ/);
    assert.match(formatConnectionStatus("2026-10-23T07:16:39Z", now), /更新が止まっています/);
    assert.match(formatConnectionStatus("invalid", now), /保存済みデータ/);
    assert.match(formatConnectionStatus("2026-10-27T07:00:00Z", now), /保存済みデータ/);
});

test("定員40人で混雑度と利用率を計算し、実人数は定員超過でも保持する", () => {
    for (const [people, status, prediction] of [
        [0, "空いている", "🟢 空いている"],
        [9, "空いている", "🟢 空いている"],
        [11, "空いている", "🟢 空いている"],
        [12, "普通", "🟡 普通"],
        [15, "普通", "🟡 普通"],
        [24, "普通", "🟡 普通"],
        [27, "普通", "🟡 普通"],
        [28, "混雑", "🔴 混雑"],
        [35, "混雑", "🔴 混雑"],
        [60, "混雑", "🔴 混雑"]
    ]) {
        const record = buildCafeteriaData(people, menu, "お知らせ\n2行目");
        assert.equal(record.id, undefined);
        assert.equal(record.people, people);
        assert.equal(record.occupancy, Math.round(people / 40 * 100));
        assert.equal(record.status, status);
        assert.equal(record.predict10, null);
        assert.equal(record.predict20, null);
        assert.equal(record.is_measurement, false);
        assert.equal(formatPrediction(people), `${prediction}（約${people}人・目安）`);
        assert.equal(record.notice, "お知らせ\n2行目");
        assert.deepEqual(Object.fromEntries(Object.keys(menu).map(id => [id, record[id]])), menu);
        assert.ok(!Number.isNaN(Date.parse(record.updated_at)));
    }
});

test("不正な人数をDBへ送らない", () => {
    for (const count of [-1, 0.5, NaN, Infinity, "3"]) {
        assert.throws(() => buildCafeteriaData(count, menu, ""), /整数/);
    }
});

test("既存履歴を上書きせず保存し、最新日時・IDの順で取得する", async () => {
    const record = buildCafeteriaData(23, menu, "テスト");
    const calls = [];
    const query = {
        select() { return this; },
        order(column, options) { calls.push(["order", column, options]); return this; },
        limit(value) { calls.push(["limit", value]); return this; },
        insert(value) { calls.push(["insert", value]); return this; },
        maybeSingle: async () => ({ data: record, error: null }),
        single: async () => ({ data: record, error: null })
    };
    const client = { from(table) { assert.equal(table, "cafeteria"); return query; } };
    assert.deepEqual(await readCafeteria(client), record);
    assert.deepEqual(await saveCafeteria(client, record), record);
    assert.deepEqual(calls, [
        ["order", "updated_at", { ascending: false, nullsFirst: false }],
        ["order", "id", { ascending: false }], ["limit", 1], ["insert", record]
    ]);
});

test("権限エラーやネットワークエラーを成功扱いにしない", async () => {
    const expected = new Error("permission denied");
    const query = {
        select() { return this; }, order() { return this; }, limit() { return this; }, insert() { return this; },
        single: async () => ({ data: null, error: expected }),
        maybeSingle: async () => ({ data: null, error: expected })
    };
    const client = { from: () => query };
    await assert.rejects(() => readCafeteria(client), expected);
    await assert.rejects(() => saveCafeteria(client, {}), expected);
});

test("移行後は人数・利用率・予測・全メニュー・お知らせ・更新日時を表示する", () => {
    const elements = new Map();
    const document = { getElementById(id) {
        if (!elements.has(id)) elements.set(id, { textContent: "", style: {}, className: "" });
        return elements.get(id);
    } };
    const record = buildCafeteriaData(60, menu, "<script>alert(1)</script>\nお知らせ");
    renderCafeteria(document, record);
    assert.equal(elements.get("people").textContent, "現在60人利用中");
    assert.equal(elements.get("occupancy").textContent, "利用率 150%（定員40人）");
    assert.equal(elements.get("progressBar").style.width, "100%");
    assert.equal(elements.get("statusIcon").textContent, "🔴");
    assert.equal(elements.get("noticeText").textContent, record.notice);
    assert.equal(elements.has("predict10"), false, "旧カラムの仮予測は表示しない");
    assert.equal(elements.get("curryStatus").textContent, "販売中");
    assert.equal(elements.get("ramenStatus").textContent, "売り切れ");
    assert.equal(elements.get("karaageStatus").className, "badge badge-green");
    assert.equal(elements.get("dailyStatus").className, "badge badge-red");
    assert.match(elements.get("lastUpdate").textContent, /^最終更新 /);
});
