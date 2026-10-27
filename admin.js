import { supabase } from "./supabase.js";
import { buildCafeteriaData, readCafeteria, saveCafeteria, MENU_IDS, CAPACITY } from "./cafeteria.js";
import { resolveLoginEmail, loginDisplayName } from "./login.js";

const element = id => document.getElementById(id);
element("capacityDisplay").textContent = CAPACITY;
let authorized = false;
let authorizedUserId = null;
let authVersion = 0;
let saving = false;
let countReady = false;
let detectedPeople = null;
let lastSavedPeople = null;
let model;
let stream;
let detectionTimer;
let cameraVersion = 0;
let cameraRunning = false;

function stopCamera() {
    cameraVersion++;
    clearTimeout(detectionTimer);
    stream?.getTracks().forEach(track => track.stop());
    stream = null;
    element("video").srcObject = null;
    cameraRunning = false;
    countReady = false;
    detectedPeople = null;
    element("cameraButton").disabled = false;
    element("stopCameraButton").hidden = true;
    element("detectedPeople").textContent = "カメラ停止中";
    element("peopleDisplay").textContent = lastSavedPeople === null ? "未計測" : `前回保存: ${lastSavedPeople}人`;
}

async function applySession(session) {
    const version = ++authVersion;
    authorized = false;
    authorizedUserId = null;
    lastSavedPeople = null;
    stopCamera();
    element("saveButton").disabled = true;
    element("adminPanel").hidden = true;
    element("loginPanel").hidden = false;
    element("logoutButton").hidden = !session?.user;
    if (!session?.user) return;
    try {
        const { data, error } = await supabase.from("cafeteria_admins")
            .select("user_id").eq("user_id", session.user.id).maybeSingle();
        if (version !== authVersion) return;
        if (error) throw error;
        if (!data) {
            element("loginResult").textContent = "このアカウントには管理者権限がありません。";
            element("logoutButton").hidden = false;
            element("loginPanel").append(element("logoutButton"));
            return;
        }
        const current = await readCafeteria(supabase);
        if (version !== authVersion) return;
        if (current) {
            lastSavedPeople = Number.isInteger(current.people) && current.people >= 0 ? current.people : null;
            element("noticeInput").value = current.notice ?? "";
            for (const id of MENU_IDS) element(id).checked = Boolean(current[id]);
            element("peopleDisplay").textContent = `前回保存: ${current.people}人`;
        }
        authorized = true;
        authorizedUserId = session.user.id;
        element("signedInUser").textContent = `ログイン中: ${loginDisplayName(session.user.email)}`;
        element("adminPanel").firstElementChild.append(element("logoutButton"));
        element("adminPanel").hidden = false;
        element("loginPanel").hidden = true;
        element("saveButton").disabled = false;
        element("result").textContent = "人数はカメラで自動計測します。販売状況とお知らせもここで更新できます。";
    } catch (error) {
        console.error("管理画面の初期化に失敗しました", error);
        element("loginResult").textContent = "管理者情報を取得できません。接続とDB設定を確認してください。";
        element("loginPanel").append(element("logoutButton"));
    }
}

element("loginForm").addEventListener("submit", async event => {
    event.preventDefault();
    element("loginButton").disabled = true;
    element("loginResult").textContent = "ログイン中...";
    try {
        const { error } = await supabase.auth.signInWithPassword({
            email: resolveLoginEmail(element("loginId").value),
            password: element("password").value
        });
        if (error) throw error;
        element("password").value = "";
        element("loginResult").textContent = "";
    } catch (error) {
        console.error("ログイン失敗", error);
        element("loginResult").textContent = "ログインできません。ログインID・パスワードと接続を確認してください。";
    } finally {
        element("loginButton").disabled = false;
    }
});

element("logoutButton").addEventListener("click", async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        element("result").textContent = "ログアウトに失敗しました。";
        return;
    }
    element("loginResult").textContent = "";
    element("logoutButton").hidden = true;
});

// Authコールバック内で追加のAuth処理を待たないよう、別タスクで初期化します。
supabase.auth.onAuthStateChange((event, session) => {
    if ((event === "TOKEN_REFRESHED" || event === "SIGNED_IN") && authorized && session?.user.id === authorizedUserId) return;
    setTimeout(() => applySession(session), 0);
});

async function detectPeople(version) {
    if (!authorized || !cameraRunning || version !== cameraVersion) return;
    try {
        const predictions = await model.detect(element("video"));
        if (version !== cameraVersion || !authorized) return;
        const count = predictions.filter(item => item.class === "person").length;
        detectedPeople = count;
        element("peopleDisplay").textContent = `${count}人`;
        element("detectedPeople").textContent = `検出人数: ${count}人`;
        countReady = true;
        detectionTimer = setTimeout(() => detectPeople(version), 3000);
    } catch (error) {
        console.error("人数認識に失敗しました", error);
        stopCamera();
        element("detectedPeople").textContent = "認識に失敗しました。カメラを再起動してください。";
    }
}

element("cameraButton").addEventListener("click", async () => {
    if (!authorized) return;
    const version = ++cameraVersion;
    countReady = false;
    cameraRunning = true;
    element("cameraButton").disabled = true;
    element("detectedPeople").textContent = "カメラとAIモデルを起動中...";
    try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera requires HTTPS or localhost");
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (version !== cameraVersion || !authorized) {
            newStream.getTracks().forEach(track => track.stop());
            return;
        }
        stream = newStream;
        element("video").srcObject = stream;
        await element("video").play();
        if (!model) {
            const tf = await import("@tensorflow/tfjs");
            await tf.ready();
            const cocoSsd = await import("@tensorflow-models/coco-ssd");
            model = await cocoSsd.load({
                base: "lite_mobilenet_v2",
                modelUrl: new URL("./models/coco-ssd/model.json", window.location.href).href
            });
        }
        if (version !== cameraVersion || !authorized) return;
        cameraRunning = true;
        element("stopCameraButton").hidden = false;
        await detectPeople(version);
    } catch (error) {
        if (version !== cameraVersion) return;
        console.error("カメラ起動失敗", error);
        stopCamera();
        element("detectedPeople").textContent = "カメラを使用できません。ブラウザのカメラ権限と接続を確認してください。";
    }
});

element("stopCameraButton").addEventListener("click", stopCamera);

async function saveData(automatic = false) {
    if (!authorized || saving) return;
    if (automatic && (!countReady || !element("autoSave").checked)) return;
    const people = countReady ? detectedPeople : lastSavedPeople;
    if (!Number.isInteger(people) || people < 0 || (cameraRunning && !countReady)) {
        element("result").textContent = "カメラを起動して、人数の計測が完了するまで待ってください。";
        return;
    }
    saving = true;
    element("saveButton").disabled = true;
    element("result").textContent = "保存中...";
    try {
        const record = buildCafeteriaData(
            people,
            Object.fromEntries(MENU_IDS.map(id => [id, element(id).checked])),
            element("noticeInput").value,
            countReady && cameraRunning
        );
        const saved = await saveCafeteria(supabase, record);
        lastSavedPeople = saved.people;
        element("result").textContent = `保存完了 ${new Date(saved.updated_at).toLocaleTimeString("ja-JP")}`;
    } catch (error) {
        console.error("保存失敗", error);
        element("result").textContent = "保存に失敗しました。接続と管理者権限を確認してください。";
    } finally {
        saving = false;
        element("saveButton").disabled = !authorized;
    }
}

element("saveButton").addEventListener("click", () => saveData());
const saveTimer = setInterval(() => saveData(true), 30000);
window.addEventListener("pagehide", () => {
    clearInterval(saveTimer);
    stopCamera();
    model?.dispose();
});
