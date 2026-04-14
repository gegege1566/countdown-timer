const $ = (id) => document.getElementById(id);

const state = {
  totalMs: 5 * 60 * 1000,
  remainingMs: 5 * 60 * 1000,
  running: false,
  ended: false,
  overshootMs: 0,
  lastTick: 0,
  raf: null,
};

const settings = {
  theme: 'dark',
  bg: '#111111', fg: '#ffffff', warn: '#ffa726', end: '#5a0000',
  transparent: false,
};

function fmt(ms) {
  const totalSec = Math.max(0, Math.floor(Math.abs(ms) / 1000));
  const m = Math.min(99, Math.floor(totalSec / 60));
  const s = totalSec % 60;
  return [String(m).padStart(2, '0'), String(s).padStart(2, '0')];
}

function render() {
  const ms = state.ended ? state.overshootMs : state.remainingMs;
  const [m, s] = fmt(ms);
  $('segMin').textContent = m;
  $('segSec').textContent = s;

  const body = document.body;
  body.classList.toggle('ended', state.ended);
  body.classList.toggle('warn', !state.ended && state.remainingMs > 0 && state.remainingMs <= 60 * 1000);
  body.classList.toggle('running', state.running);

  $('btnPlay').classList.toggle('pausing', state.running);
}

function tick(now) {
  if (!state.running) return;
  const dt = now - state.lastTick;
  state.lastTick = now;
  if (state.ended) {
    state.overshootMs += dt;
  } else {
    state.remainingMs -= dt;
    if (state.remainingMs <= 0) {
      state.remainingMs = 0;
      state.ended = true;
      state.overshootMs = 0;
      document.body.classList.add('blinking');
      setTimeout(() => document.body.classList.remove('blinking'), 2500);
    }
  }
  render();
  state.raf = requestAnimationFrame(tick);
}

function getTabSpace() {
  const tab = $('tab');
  if (!tab || tab.offsetHeight === 0) return 0;
  const cs = getComputedStyle(tab);
  return tab.offsetHeight + parseFloat(cs.marginTop || 0) + parseFloat(cs.marginBottom || 0);
}

async function resizeWindowBy(dh) {
  if (!dh) return;
  const [w, h] = await window.api.getWindowSize();
  await window.api.resizeWindow(w, h + dh);
}

function start() {
  if (state.running) return;
  if (state.totalMs <= 0 && !state.ended) return;
  const tabSpace = getTabSpace();
  state.savedTabSpace = tabSpace;
  state.running = true;
  window.api.setRunning(true);
  state.lastTick = performance.now();
  state.raf = requestAnimationFrame(tick);
  render();
  if (tabSpace > 0) resizeWindowBy(-tabSpace);
}

function pause() {
  if (state.raf) cancelAnimationFrame(state.raf);
  const wasRunning = state.running;
  state.running = false;
  render();
  if (wasRunning && state.savedTabSpace > 0) {
    const space = state.savedTabSpace;
    state.savedTabSpace = 0;
    resizeWindowBy(space);
  }
  window.api.setRunning(false);
}

function reset() {
  pause();
  state.remainingMs = state.totalMs;
  state.ended = false;
  state.overshootMs = 0;
  document.body.classList.remove('blinking');
  render();
}

const timeEl = $('time');
const wrapEl = $('timeWrap');
function fitFont() {
  if (!wrapEl.clientWidth || !wrapEl.clientHeight) return;
  const controlsEl = $('controls');
  const cw = controlsEl ? controlsEl.offsetWidth + 10 : 0;
  timeEl.style.fontSize = '100px';
  const r = timeEl.getBoundingClientRect();
  if (!r.width || !r.height) return;
  // Asymmetric buffers:
  //   left = overtime "+" width (~0.22em = 22px at ref 100)
  //   right = controls width (cw)
  // At scale S: content width = wrapWidth - 22*S - cw ≥ r.width * S
  //   → S ≤ (wrapWidth - cw) / (r.width + 22)
  const scaleW = (wrapEl.clientWidth - cw) / (r.width + 22);
  const scaleH = wrapEl.clientHeight / r.height;
  const fontSize = Math.max(8, Math.floor(100 * Math.min(scaleW, scaleH) * 0.96));
  timeEl.style.fontSize = fontSize + 'px';
  wrapEl.style.paddingLeft = Math.max(4, Math.round(0.22 * fontSize)) + 'px';
  wrapEl.style.paddingRight = cw + 'px';
}
new ResizeObserver(fitFont).observe(wrapEl);

const editor = $('editor');
const inMin = $('inMin');
const inSec = $('inSec');

function openEditor() {
  pause();
  const [m, s] = fmt(state.totalMs);
  inMin.value = m;
  inSec.value = s;
  editor.hidden = false;
  inMin.focus();
  inMin.select();
}

function closeEditor() {
  const m = clamp(parseInt(inMin.value, 10) || 0, 0, 99);
  const s = clamp(parseInt(inSec.value, 10) || 0, 0, 59);
  state.totalMs = (m * 60 + s) * 1000;
  state.remainingMs = state.totalMs;
  state.ended = false;
  state.overshootMs = 0;
  editor.hidden = true;
  render();
  window.api.setConfig({ totalMs: state.totalMs });
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

let drag = null;
timeEl.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  drag = { sx: e.screenX, sy: e.screenY, moved: false };
  e.preventDefault();
});
window.addEventListener('mousemove', (e) => {
  if (!drag) return;
  const dx = e.screenX - drag.sx;
  const dy = e.screenY - drag.sy;
  if (!drag.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) drag.moved = true;
  if (drag.moved) {
    window.api.moveBy(dx, dy);
    drag.sx = e.screenX;
    drag.sy = e.screenY;
  }
});
window.addEventListener('mouseup', () => { drag = null; });

let resizeState = null;
document.querySelectorAll('.resize-handle').forEach(handle => {
  handle.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    resizeState = { dir: handle.dataset.dir, sx: e.screenX, sy: e.screenY };
  });
});
window.addEventListener('mousemove', (e) => {
  if (!resizeState) return;
  const dx = e.screenX - resizeState.sx;
  const dy = e.screenY - resizeState.sy;
  if (dx === 0 && dy === 0) return;
  window.api.resizeFrom(resizeState.dir, dx, dy);
  resizeState.sx = e.screenX;
  resizeState.sy = e.screenY;
});
window.addEventListener('mouseup', () => { resizeState = null; });
timeEl.addEventListener('dblclick', openEditor);

document.querySelectorAll('.spin').forEach(b => {
  b.addEventListener('click', () => {
    const t = b.dataset.target, dir = parseInt(b.dataset.dir, 10);
    const inp = t === 'min' ? inMin : inSec;
    const max = t === 'min' ? 99 : 59;
    const v = clamp((parseInt(inp.value, 10) || 0) + dir, 0, max);
    inp.value = String(v).padStart(2, '0');
  });
});

[inMin, inSec].forEach(inp => {
  const max = inp === inMin ? 99 : 59;
  inp.addEventListener('input', () => {
    inp.value = inp.value.replace(/\D/g, '').slice(0, 2);
  });
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') closeEditor();
    if (e.key === 'Escape') { editor.hidden = true; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const dir = e.key === 'ArrowUp' ? 1 : -1;
      const v = clamp((parseInt(inp.value, 10) || 0) + dir, 0, max);
      inp.value = String(v).padStart(2, '0');
    }
  });
});

$('editOk').addEventListener('click', closeEditor);

$('btnPlay').addEventListener('click', () => state.running ? pause() : start());
$('btnReset').addEventListener('click', reset);
$('btnClose').addEventListener('click', () => window.api.closeWindow());
const THEMES = [
  { theme: 'dark',  bg: '#111111', fg: '#ffffff', warn: '#ffa726', end: '#5a0000' },
  { theme: 'light', bg: '#f5f5f5', fg: '#111111', warn: '#e64a19', end: '#ef9a9a' },
];

$('btnTheme').addEventListener('click', () => {
  const idx = THEMES.findIndex(t => t.theme === settings.theme);
  Object.assign(settings, THEMES[(idx + 1) % THEMES.length]);
  applySettings();
});

$('btnTransparent').addEventListener('click', () => {
  settings.transparent = !settings.transparent;
  applySettings();
});

function applySettings() {
  document.body.className = '';
  if (settings.transparent) document.body.classList.add('transparent');
  document.documentElement.style.setProperty('--bg', settings.bg);
  document.documentElement.style.setProperty('--fg', settings.fg);
  document.documentElement.style.setProperty('--warn', settings.warn);
  document.documentElement.style.setProperty('--end', settings.end);
  saveSettings();
  render();
  fitFont();
}

function saveSettings() {
  window.api.setConfig({ settings });
}

(async () => {
  const cfg = await window.api.getConfig();
  if (cfg && cfg.settings) Object.assign(settings, cfg.settings);
  if (cfg && typeof cfg.totalMs === 'number' && cfg.totalMs > 0) {
    state.totalMs = cfg.totalMs;
    state.remainingMs = cfg.totalMs;
  }
  applySettings();
  render();
  fitFont();
})();

window.addEventListener('keydown', (e) => {
  if (!editor.hidden) return;
  if (e.key === ' ') { e.preventDefault(); state.running ? pause() : start(); }
  if (e.key === 'r' || e.key === 'R') reset();
  if (e.key === 'Escape') window.api.closeWindow();
});
