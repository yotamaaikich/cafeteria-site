import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { buildCafeteriaData, MENU_IDS, CAPACITY } from "../cafeteria.js";
import { resolveLoginEmail, loginDisplayName } from "../login.js";

async function createAdminHarness() {
    const elements = new Map();
    const getElementById = id => {
        if (id === "manualPeople") return null;
        if (!elements.has(id)) elements.set(id, {
            hidden: false, disabled: false, value: "", checked: true,
            textContent: "", validity: { valid: true }, handlers: {},
            firstElementChild: { append() {} }, append() {},
            addEventListener(name, callback) { this.handlers[name] = callback; }
        });
        return elements.get(id);
    };
    const jobs = [];
    const intervals = [];
    const saved = [];
    const signIns = [];
    let authCallback;
    let member = true;
    const source = (await readFile(new URL("../admin.js", import.meta.url), "utf8"))
        .replace(/^import[^\r\n]*;\r?\n/gm, "");
    const supabase = {
        auth: {
            onAuthStateChange(callback) { authCallback = callback; },
            async signInWithPassword(credentials) { signIns.push(credentials); return { error: null }; }
        },
        from: () => ({ select() { return this; }, eq() { return this; },
            maybeSingle: async () => ({ data: member ? { user_id: "admin" } : null, error: null }) })
    };
    const camera = vm.runInNewContext(source + `\n({
        async detectCount(count) {
            model = { detect: async () => Array.from({length:count}, () => ({class:"person"})) };
            cameraRunning = true;
            return detectPeople(cameraVersion);
        }
    });`, {
        document: { getElementById }, window: { addEventListener() {} },
        navigator: {}, supabase, MENU_IDS, CAPACITY, buildCafeteriaData, resolveLoginEmail, loginDisplayName,
        console: { error() {}, warn() {} },
        setTimeout(callback, delay) { if (delay !== 3000) jobs.push(callback); return jobs.length; }, clearTimeout() {},
        setInterval(callback) { intervals.push(callback); return intervals.length; }, clearInterval() {},
        readCafeteria: async () => ({ people: 25, notice: "既存のお知らせ", curry: true, ramen: true, karaage: false, daily: true }),
        saveCafeteria: async (_client, record) => { saved.push(record); return record; }
    });
    return {
        element: getElementById, saved, signIns, detectCount: camera.detectCount,
        async auth(event, session, isMember = true) {
            member = isMember;
            authCallback(event, session);
            while (jobs.length) await jobs.shift()();
        },
        async tick() { for (const interval of intervals) await interval(); }
    };
}

test("cafeteriaというIDをSupabaseの認証用アドレスへ変換してログインする", async () => {
    const app = await createAdminHarness();
    app.element("loginId").value = "cafeteria";
    app.element("password").value = "test-password";
    await app.element("loginForm").handlers.submit({ preventDefault() {} });
    assert.equal(app.signIns.length, 1);
    assert.equal(app.signIns[0].email, "cafeteria@aikichin.example");
    assert.equal(app.signIns[0].password, "test-password");
    assert.equal(app.element("password").value, "");
    assert.equal(app.element("loginButton").disabled, false);
    assert.equal(resolveLoginEmail(" CAFETERIA "), "cafeteria@aikichin.example");
    assert.equal(resolveLoginEmail("owner@example.test"), "owner@example.test");
    assert.throws(() => resolveLoginEmail("unknown"));
    assert.equal(loginDisplayName("cafeteria@aikichin.example"), "cafeteria");
});

test("未ログイン・権限なしでは自動保存せず、カメラが検出した0人は保存する", async () => {
    const app = await createAdminHarness();
    await app.tick();
    assert.equal(app.saved.length, 0);
    await app.auth("SIGNED_IN", { user: { id: "not-admin" } }, false);
    await app.tick();
    assert.equal(app.saved.length, 0);
    assert.equal(app.element("adminPanel").hidden, true);
    await app.auth("SIGNED_IN", { user: { id: "admin", email: "admin@example.test" } });
    await app.tick();
    assert.equal(app.saved.length, 0, "初期データを読み込んだだけでは保存しない");
    await app.detectCount(0);
    await app.tick();
    assert.equal(app.saved.length, 1);
    assert.equal(app.saved[0].people, 0);
    assert.equal(app.saved[0].is_measurement, true);
    app.element("autoSave").checked = false;
    await app.tick();
    assert.equal(app.saved.length, 1);
});

test("別のアカウントへの切り替え・ログアウトで保存を停止する", async () => {
    const app = await createAdminHarness();
    await app.auth("SIGNED_IN", { user: { id: "admin" } });
    await app.detectCount(12);
    await app.auth("TOKEN_REFRESHED", { user: { id: "admin" } });
    await app.tick();
    assert.equal(app.saved.length, 1);
    await app.auth("SIGNED_IN", { user: { id: "other-user" } }, false);
    await app.tick();
    assert.equal(app.saved.length, 1);
    assert.equal(app.element("adminPanel").hidden, true);
    await app.auth("SIGNED_OUT", null);
    await app.tick();
    assert.equal(app.saved.length, 1);
    assert.equal(app.element("saveButton").disabled, true);
});

test("カメラ停止中のメニュー保存では前回人数を保持し、0人で上書きしない", async () => {
    const app = await createAdminHarness();
    await app.auth("SIGNED_IN", { user: { id: "admin" } });
    assert.equal(app.element("manualPeople"), null);
    app.element("noticeInput").value = "メニュー更新";
    await app.element("saveButton").handlers.click();
    assert.equal(app.saved.length, 1);
    assert.equal(app.saved[0].people, 25);
    assert.equal(app.saved[0].is_measurement, false);
    assert.equal(app.element("capacityDisplay").textContent, 40);
    assert.equal(app.saved[0].notice, "メニュー更新");
    await app.tick();
    assert.equal(app.saved.length, 1);
});
