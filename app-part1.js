const OUTPUT_W = 2400;
const OUTPUT_H = 3000;
const PREVIEW_W = 560;
const PREVIEW_H = 700;

const previewCanvas = document.getElementById('previewCanvas');
const previewCtx = previewCanvas.getContext('2d');
const previewStage = document.getElementById('previewStage');
const previewButtons = document.getElementById('previewButtons');
const slotContainer = document.getElementById('photoSlots');
const layoutThumbs = document.getElementById('layoutThumbs');
const layoutSelect = document.getElementById('layoutSelect');
const layoutSummary = document.getElementById('layoutSummary');
const showSafeArea = document.getElementById('showSafeArea');
const babyName = document.getElementById('babyName');
const birthday = document.getElementById('birthday');
const memorialFont = document.getElementById('memorialFont');
const selectedTitle = document.getElementById('selectedTitle');
const leftSelectedPhoto = document.getElementById('leftSelectedPhoto');
const basicControls = document.getElementById('basicControls');
const advancedControls = document.getElementById('advancedControls');
const advancedWrap = document.getElementById('advancedWrap');
const fileInput = document.getElementById('fileInput');
const cropDialog = document.getElementById('cropDialog');
const cropCanvas = document.getElementById('cropCanvas');
const cropCtx = cropCanvas.getContext('2d');
const printBtn = document.getElementById('printBtn');
const installAppBtn = document.getElementById('installAppBtn');
let deferredInstallPrompt = null;

const BASIC_DEFS = [
  ['brightness', 'Brightness', 50, 150, 100],
  ['contrast', 'Contrast', 50, 150, 100],
  ['zoom', 'Zoom', 100, 250, 100],
];

const ADVANCED_DEFS = [
  ['saturation', 'Saturation', 0, 200, 100],
  ['hue', 'Hue', -180, 180, 0],
  ['warmth', 'Warmth', -100, 100, 0],
  ['sharpness', 'Sharpness', 0, 200, 100],
  ['panX', 'Horizontal Position', -100, 100, 0],
  ['panY', 'Vertical Position', -100, 100, 0],
];

const LAYOUTS = [
  { name: 'Single Full Photo', slots: 1, icon: ['1111', '1111', '1111', '1111'] },
  { name: 'Two Side by Side', slots: 2, icon: ['1122', '1122', '1122', '1122'] },
  { name: 'Two Stacked', slots: 2, icon: ['1111', '1111', '2222', '2222'] },
  { name: 'Feature Left + One Right', slots: 2, icon: ['1122', '1122', '1122', '1122'] },
  { name: 'One Top + Two Bottom', slots: 3, icon: ['1111', '1111', '2233', '2233'] },
  { name: 'One Left + Two Right', slots: 3, icon: ['1222', '1222', '1333', '1333'] },
  { name: 'Classic 4-Photo', slots: 4, icon: ['1122', '1122', '3344', '3344'] },
  { name: 'Feature + Three', slots: 4, icon: ['1111', '1111', '2344', '2344'] },
  { name: 'Wide Top + Three', slots: 4, icon: ['1111', '2223', '4444', '4444'] },
];

function makeDefaultState() {
  return {
    fileName: null,
    img: null,
    previewUrl: null,
    brightness: 1,
    contrast: 1,
    saturation: 1,
    hue: 0,
    warmth: 0,
    sharpness: 1,
    zoom: 1,
    panX: 0,
    panY: 0,
    rotation: 0,
    style: 'Color',
    cropBox: null,
  };
}

let states = Array.from({ length: 4 }, makeDefaultState);
let selected = 0;
let pendingSlot = 0;
let renderQueued = false;
let cropState = null;
let currentStep = 1;
let showAdvanced = false;
let previewDrag = null;
let suppressPreviewClick = false;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function getLayoutConfig() {
  return LAYOUTS.find(x => x.name === layoutSelect.value) || LAYOUTS[6];
}

function getRequiredSlots() {
  return getLayoutConfig().slots;
}

function buildLayoutSelect() {
  layoutSelect.innerHTML = '';
  LAYOUTS.forEach(layout => {
    const opt = document.createElement('option');
    opt.value = layout.name;
    opt.textContent = layout.name;
    if (layout.name === 'Classic 4-Photo') opt.selected = true;
    layoutSelect.appendChild(opt);
  });
}

function buildLayoutThumbs() {
  layoutThumbs.innerHTML = '';
  LAYOUTS.forEach(layout => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'layout-thumb';
    btn.dataset.layout = layout.name;
    btn.innerHTML = `
      <div class="layout-mini">${makeLayoutThumbnailSvg(layout.name)}</div>
      <div class="layout-name">${layout.name}</div>
      <div class="layout-count">${layout.slots} photo${layout.slots === 1 ? '' : 's'}</div>
    `;
    btn.addEventListener('click', () => {
      layoutSelect.value = layout.name;
      onLayoutChanged();
    });
    layoutThumbs.appendChild(btn);
  });
  syncLayoutThumbSelection();
}

function syncLayoutThumbSelection() {
  document.querySelectorAll('.layout-thumb').forEach(el => {
    el.classList.toggle('selected', el.dataset.layout === layoutSelect.value);
  });
  layoutSummary.textContent = `${getRequiredSlots()} Photo${getRequiredSlots() === 1 ? '' : 's'}`;
}

function setupSlots() {
  slotContainer.innerHTML = '';
  const required = getRequiredSlots();
  for (let idx = 0; idx < required; idx++) {
    const state = states[idx];
    const card = document.createElement('div');
    card.className = 'slot-card' + (idx === selected ? ' selected' : '');
    card.addEventListener('click', () => selectSlot(idx));

    const top = document.createElement('div');
    top.className = 'slot-top';
    top.innerHTML = `<div class="slot-label">PHOTO ${idx + 1}</div>`;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = state.previewUrl ? 'Replace' : 'Add Photo';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      pendingSlot = idx;
      fileInput.click();
    });
    top.appendChild(btn);
    card.appendChild(top);

    const prev = document.createElement('div');
    prev.className = 'slot-preview';
    if (state.previewUrl) {
      const img = document.createElement('img');
      img.src = state.previewUrl;
      prev.appendChild(img);
    } else {
      prev.textContent = 'No photo loaded';
    }
    card.appendChild(prev);
    slotContainer.appendChild(card);
  }
}

function createControls(container, defs, prefix) {
  container.innerHTML = '';
  defs.forEach(([key, label, min, max, defaultVal]) => {
    const row = document.createElement('div');
    row.className = 'control-row';
    row.innerHTML = `
      <div class="control-header">
        <span>${label}</span>
        <span id="${prefix}${key}Value" class="control-value">${defaultVal}</span>
      </div>
      <input id="${prefix}${key}Input" type="range" min="${min}" max="${max}" value="${defaultVal}" />
    `;
    container.appendChild(row);
  });

  defs.forEach(([key]) => {
    const el = document.getElementById(`${prefix}${key}Input`);
    el.addEventListener('input', () => {
      const raw = Number(el.value);
      document.getElementById(`${prefix}${key}Value`).textContent = Math.round(raw);
      const s = states[selected];
      if (['brightness', 'contrast', 'saturation', 'sharpness', 'zoom'].includes(key)) {
        s[key] = raw / 100;
      } else if (['panX', 'panY'].includes(key)) {
        s[key] = raw / 100;
      } else {
        s[key] = raw;
      }
      queueRender();
    });
  });
}

function syncControlsFromState() {
  const s = states[selected];
  selectedTitle.textContent = `Photo ${selected + 1} Adjustments`;
  leftSelectedPhoto.textContent = `Photo ${selected + 1}`;
  const values = {
    brightness: s.brightness * 100,
    contrast: s.contrast * 100,
    zoom: s.zoom * 100,
    saturation: s.saturation * 100,
    hue: s.hue,
    warmth: s.warmth,
    sharpness: s.sharpness * 100,
    panX: s.panX * 100,
    panY: s.panY * 100,
  };

  [...BASIC_DEFS, ...ADVANCED_DEFS].forEach(([key], index) => {
    const prefix = index < BASIC_DEFS.length ? 'basic_' : 'adv_';
    const input = document.getElementById(`${prefix}${key}Input`);
    const val = document.getElementById(`${prefix}${key}Value`);
    if (input && val) {
      input.value = values[key];
      val.textContent = Math.round(values[key]);
    }
  });

  document.querySelectorAll('input[name="style"]').forEach(r => {
    r.checked = r.value === s.style;
  });
  setupSlots();
}

function selectSlot(idx) {
  selected = clamp(idx, 0, getRequiredSlots() - 1);
  syncControlsFromState();
  queueRender();
}

function onLayoutChanged() {
  const required = getRequiredSlots();
  if (selected >= required) selected = required - 1;
  syncLayoutThumbSelection();
  setupSlots();
  syncControlsFromState();
  updateReadiness();
  queueRender();
}

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const img = await loadImageFromFile(file);
  if (states[pendingSlot].previewUrl) URL.revokeObjectURL(states[pendingSlot].previewUrl);
  const state = makeDefaultState();
  state.fileName = file.name;
  state.img = img;
  state.previewUrl = URL.createObjectURL(file);
  states[pendingSlot] = state;
  selected = pendingSlot;
  syncControlsFromState();
  updateReadiness();
  queueRender();
  fileInput.value = '';
});

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function getMemorialLines() {
  const lines = [];
  const name = babyName.value.trim();
  const bday = birthday.value.trim();
  if (name) lines.push(name);
  if (bday) lines.push(`Birthday: ${bday}`);
  return lines;
}

function getFooterHeight(h) {
  return getMemorialLines().length ? Math.round(h * 0.095) : 0;
}

