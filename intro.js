const show = document.getElementById("show");
const scenes = [...document.querySelectorAll(".scene")];
const timeline = document.getElementById("timeline");
const pauseButton = document.getElementById("pause");
const time = document.getElementById("time");
const durations = scenes.map(scene => Number(scene.dataset.seconds) * 1000);
const offsets = durations.map((_, i) => durations.slice(0, i).reduce((sum, ms) => sum + ms, 0));
const total = offsets.at(-1) + durations.at(-1);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

let index = 0;
let elapsed = 0;
let lastFrame = null;
let frame = null;
let paused = false;

const buttons = scenes.map((scene, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", scene.querySelector(".chapter").textContent.trim());
    button.innerHTML = '<span class="track" aria-hidden="true"><i></i></span>';
    button.addEventListener("click", () => {
        if (i === index) return;
        setScene(i);
        syncPlayback();
    });
    return button;
});
timeline.append(...buttons);
timeline.hidden = false;
pauseButton.hidden = false;

function renderProgress() {
    buttons[index].style.setProperty("--progress", Math.min(elapsed / durations[index], 1));
    const seconds = Math.ceil((total - offsets[index] - elapsed) / 1000);
    const label = `${index + 1} / ${scenes.length}　残り ${Math.max(0, seconds)}秒`;
    if (time.textContent !== label) time.textContent = label;
}

function setScene(next) {
    index = next;
    elapsed = 0;
    lastFrame = null;
    scenes.forEach((scene, i) => {
        scene.hidden = i !== index;
        buttons[i].style.setProperty("--progress", i < index ? 1 : 0);
        if (i === index) buttons[i].setAttribute("aria-current", "step");
        else buttons[i].removeAttribute("aria-current");
    });
    if (!reducedMotion.matches) scenes[index].querySelector(".walker")?.beginElement?.();
    renderProgress();
}

function tick(timestamp) {
    frame = null;
    if (paused || document.hidden) return;
    if (lastFrame !== null) elapsed += timestamp - lastFrame;
    lastFrame = timestamp;
    if (elapsed >= durations[index]) {
        if (index === scenes.length - 1) {
            // Returning from the crowd screen should not replay the introduction.
            location.replace(new URL("./", location.href));
            return;
        }
        setScene(index + 1);
    }
    renderProgress();
    frame = requestAnimationFrame(tick);
}

function syncPlayback() {
    const stopped = paused || document.hidden;
    show.dataset.paused = String(stopped);
    pauseButton.textContent = paused ? "再生" : "一時停止";
    const motion = scenes[index].querySelector(".walker")?.ownerSVGElement;
    if (stopped) motion?.pauseAnimations?.();
    else motion?.unpauseAnimations?.();
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    lastFrame = null;
    if (!stopped) frame = requestAnimationFrame(tick);
}

pauseButton.addEventListener("click", () => {
    paused = !paused;
    syncPlayback();
});
document.addEventListener("visibilitychange", syncPlayback);
setScene(0);
syncPlayback();
