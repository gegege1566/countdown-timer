const $ = (id) => document.getElementById(id);

const THEMES = [
  { id: 'dark',  bg: '#111111', fg: '#ffffff', warn: '#ffa726', end: '#5a0000', label: '黒' },
  { id: 'light', bg: '#f5f5f5', fg: '#111111', warn: '#e64a19', end: '#ef9a9a', label: '白' },
];

const settings = {
  theme: 'dark',
  bg: '#111111', fg: '#ffffff', warn: '#5a3a00', end: '#5a0000',
  transparent: false,
};

function renderActive() {
  document.querySelectorAll('.swatch').forEach((el, i) => {
    el.classList.toggle('active', THEMES[i].id === settings.theme);
  });
  $('bgColor').value = settings.bg;
  $('fgColor').value = settings.fg;
  $('warnColor').value = settings.warn;
  $('endColor').value = settings.end;
  $('transparentMode').checked = !!settings.transparent;
}

function apply() {
  window.api.applySettings(settings);
  renderActive();
}

function build() {
  const tl = $('themeList');
  THEMES.forEach(t => {
    const el = document.createElement('div');
    el.className = 'swatch';
    el.style.background = t.bg;
    el.style.color = t.fg;
    el.textContent = t.label;
    el.title = t.id;
    el.addEventListener('click', () => {
      settings.theme = t.id;
      settings.bg = t.bg;
      settings.fg = t.fg;
      settings.warn = t.warn;
      settings.end = t.end;
      apply();
    });
    tl.appendChild(el);
  });
  $('bgColor').addEventListener('input', e => { settings.bg = e.target.value; apply(); });
  $('fgColor').addEventListener('input', e => { settings.fg = e.target.value; apply(); });
  $('warnColor').addEventListener('input', e => { settings.warn = e.target.value; apply(); });
  $('endColor').addEventListener('input', e => { settings.end = e.target.value; apply(); });
  $('transparentMode').addEventListener('change', e => { settings.transparent = e.target.checked; apply(); });
}

(async () => {
  build();
  const saved = await window.api.getSettings();
  if (saved) Object.assign(settings, saved);
  renderActive();
})();
