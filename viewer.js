import { supabase } from "./supabase.js";
import { readCafeteria, renderCafeteria, formatPrediction, formatConnectionStatus } from "./cafeteria.js";
import { readForecastContext, forecastCrowding, renderForecast } from "./forecast.js";

const connection = document.getElementById("connectionStatus");
let loading = false;

async function loadCafeteriaData() {
    if (loading) return;
    loading = true;
    try {
        const [data, context] = await Promise.all([
            readCafeteria(supabase),
            readForecastContext(supabase).catch(error => {
                console.warn("予測履歴の取得に失敗しました", error);
                return null;
            })
        ]);
        if (!data) {
            document.getElementById("statusText").textContent = "データがありません";
            connection.textContent = "管理画面からデータを保存してください";
            renderForecast(document, forecastCrowding(context), formatPrediction);
            return;
        }
        renderCafeteria(document, data);
        renderForecast(document, forecastCrowding(context), formatPrediction);
        connection.textContent = formatConnectionStatus(data.updated_at);
    } catch (error) {
        console.error("混雑状況の取得に失敗しました", error);
        connection.textContent = "接続できません。再接続を試みています";
        renderForecast(document, { status: "unavailable" }, formatPrediction);
    } finally {
        loading = false;
    }
}

loadCafeteriaData();
// 学内ネットでWebSocketが制限されていてもHTTP取得で更新します。
const refreshTimer = setInterval(loadCafeteriaData, 15000);
const channel = supabase.channel("cafeteria-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "cafeteria" }, loadCafeteriaData)
    .subscribe((status, error) => {
        if (status === "SUBSCRIBED") loadCafeteriaData();
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.warn("リアルタイム接続失敗。15秒ごとの取得を継続します", error);
        }
    });

window.addEventListener("pagehide", () => {
    clearInterval(refreshTimer);
    supabase.removeChannel(channel);
});
