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

function getBoxesForLayout(layout, w, h, footerH = 0) {
  const marginX = Math.round(w * 0.06);
  const marginY = Math.round(h * 0.055);
  const gap = Math.round(w * 0.025);
  const footerGap = footerH ? Math.round(h * 0.025) : 0;
  const usableW = w - marginX * 2;
  const usableH = h - marginY * 2 - footerH - footerGap;

  if (layout === 'Single Full Photo') {
    return [[marginX, marginY, usableW, usableH]];
  }
  if (layout === 'Two Side by Side') {
    const w2 = Math.floor((usableW - gap) / 2);
    return [
      [marginX, marginY, w2, usableH],
      [marginX + w2 + gap, marginY, usableW - w2 - gap, usableH],
    ];
  }
  if (layout === 'Two Stacked') {
    const h2 = Math.floor((usableH - gap) / 2);
    return [
      [marginX, marginY, usableW, h2],
      [marginX, marginY + h2 + gap, usableW, usableH - h2 - gap],
    ];
  }
  if (layout === 'Feature Left + One Right') {
    const leftW = Math.round(usableW * 0.6);
    return [
      [marginX, marginY, leftW, usableH],
      [marginX + leftW + gap, marginY, usableW - leftW - gap, usableH],
    ];
  }
  if (layout === 'One Top + Two Bottom') {
    const topH = Math.round(usableH * 0.56);
    const bottomH = usableH - topH - gap;
    const w2 = Math.floor((usableW - gap) / 2);
    return [
      [marginX, marginY, usableW, topH],
      [marginX, marginY + topH + gap, w2, bottomH],
      [marginX + w2 + gap, marginY + topH + gap, usableW - w2 - gap, bottomH],
    ];
  }
  if (layout === 'One Left + Two Right') {
    const leftW = Math.round(usableW * 0.56);
    const rightW = usableW - leftW - gap;
    const h2 = Math.floor((usableH - gap) / 2);
    return [
      [marginX, marginY, leftW, usableH],
      [marginX + leftW + gap, marginY, rightW, h2],
      [marginX + leftW + gap, marginY + h2 + gap, rightW, usableH - h2 - gap],
    ];
  }
  if (layout === 'Feature + Three') {
    const topH = Math.round(usableH * 0.57);
    const bottomH = usableH - topH - gap;
    const w3 = Math.floor((usableW - gap * 2) / 3);
    return [
      [marginX, marginY, usableW, topH],
      [marginX, marginY + topH + gap, w3, bottomH],
      [marginX + w3 + gap, marginY + topH + gap, w3, bottomH],
      [marginX + (w3 + gap) * 2, marginY + topH + gap, usableW - (w3 + gap) * 2, bottomH],
    ];
  }
  if (layout === 'Wide Top + Three') {
    const topH = Math.round(usableH * 0.46);
    const bottomH = usableH - topH - gap;
    const w3 = Math.floor((usableW - gap * 2) / 3);
    return [
      [marginX, marginY, usableW, topH],
      [marginX, marginY + topH + gap, w3, bottomH],
      [marginX + w3 + gap, marginY + topH + gap, w3, bottomH],
      [marginX + (w3 + gap) * 2, marginY + topH + gap, usableW - (w3 + gap) * 2, bottomH],
    ];
  }

  const bw = Math.floor((usableW - gap) / 2);
  const bh = Math.floor((usableH - gap) / 2);
  return [
    [marginX, marginY, bw, bh],
    [marginX + bw + gap, marginY, usableW - bw - gap, bh],
    [marginX, marginY + bh + gap, bw, usableH - bh - gap],
    [marginX + bw + gap, marginY + bh + gap, usableW - bw - gap, usableH - bh - gap],
  ];
}

function getBoxes(w, h) {
  return getBoxesForLayout(layoutSelect.value, w, h, getFooterHeight(h));
}

function makeLayoutThumbnailSvg(layoutName) {
  const w = 120;
  const h = 86;
  const boxes = getBoxesForLayout(layoutName, w, h, 0);
  const rects = boxes.map(([x, y, bw, bh]) => `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="3" ry="3" fill="#d8e5eb" stroke="#c0d0d8" stroke-width="1" />`).join('');
  return `
    <svg class="layout-mini-svg" viewBox="0 0 ${w} ${h}" aria-hidden="true" role="img">
      <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="7" ry="7" fill="#f9fbfc" stroke="#d7e1e6" stroke-width="2" />
      ${rects}
    </svg>
  `;
}

function getPreviewCanvasPoint(evt) {
  const rect = previewCanvas.getBoundingClientRect();
  return {
    rect,
    x: (evt.clientX - rect.left) * (PREVIEW_W / rect.width),
    y: (evt.clientY - rect.top) * (PREVIEW_H / rect.height),
  };
}

function getBoxIndexAtPoint(x, y) {
  const boxes = getBoxes(PREVIEW_W, PREVIEW_H);
  for (let i = 0; i < boxes.length; i++) {
    const [bx, by, bw, bh] = boxes[i];
    if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) {
      return { index: i, box: boxes[i] };
    }
  }
  return null;
}

function getImageDisplayGeometry(state, bw, bh) {
  if (!state || !state.img) return { extraX: 0, extraY: 0 };
  let iw = state.img.naturalWidth;
  let ih = state.img.naturalHeight;
  if (state.cropBox) {
    const [l, t, r, b] = state.cropBox;
    iw = Math.max(1, Math.round(iw * (r - l)));
    ih = Math.max(1, Math.round(ih * (b - t)));
  }
  const angle = ((state.rotation % 360) + 360) % 360;
  if (angle === 90 || angle === 270) {
    [iw, ih] = [ih, iw];
  }
  const baseScale = Math.max(bw / iw, bh / ih);
  const scale = baseScale * clamp(state.zoom, 1, 2.5);
  const rw = Math.max(bw, Math.round(iw * scale));
  const rh = Math.max(bh, Math.round(ih * scale));
  return { rw, rh, extraX: Math.max(0, rw - bw), extraY: Math.max(0, rh - bh) };
}

function createProcessedCanvas(state) {
  const img = state.img;
  if (!img) return null;

  const srcCanvas = document.createElement('canvas');
  const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });

  if (state.cropBox) {
    const [l, t, r, b] = state.cropBox;
    const sx = Math.round(img.naturalWidth * l);
    const sy = Math.round(img.naturalHeight * t);
    const sw = Math.max(1, Math.round(img.naturalWidth * (r - l)));
    const sh = Math.max(1, Math.round(img.naturalHeight * (b - t)));
    srcCanvas.width = sw;
    srcCanvas.height = sh;
    srcCtx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  } else {
    srcCanvas.width = img.naturalWidth;
    srcCanvas.height = img.naturalHeight;
    srcCtx.drawImage(img, 0, 0);
  }

  let baseCanvas = srcCanvas;
  if (state.rotation % 360 !== 0) {
    const rotCanvas = document.createElement('canvas');
    const rotCtx = rotCanvas.getContext('2d');
    const angle = ((state.rotation % 360) + 360) % 360;
    if (angle === 90 || angle === 270) {
      rotCanvas.width = baseCanvas.height;
      rotCanvas.height = baseCanvas.width;
    } else {
      rotCanvas.width = baseCanvas.width;
      rotCanvas.height = baseCanvas.height;
    }
    rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
    rotCtx.rotate(angle * Math.PI / 180);
    rotCtx.drawImage(baseCanvas, -baseCanvas.width / 2, -baseCanvas.height / 2);
    baseCanvas = rotCanvas;
  }

  const filtered = document.createElement('canvas');
  filtered.width = baseCanvas.width;
  filtered.height = baseCanvas.height;
  const fctx = filtered.getContext('2d', { willReadFrequently: true });

  const filters = [
    `brightness(${state.brightness})`,
    `contrast(${state.contrast})`,
    `saturate(${state.saturation})`,
    `hue-rotate(${state.hue}deg)`,
  ];
  if (state.style === 'Black & White') filters.push('grayscale(1)');
  if (state.style === 'Sepia') filters.push('sepia(0.85)');
  fctx.filter = filters.join(' ');
  fctx.drawImage(baseCanvas, 0, 0);
  fctx.filter = 'none';

  if (state.warmth !== 0 || Math.abs(state.sharpness - 1) > 0.01) {
    adjustPixels(filtered, state.warmth, state.sharpness);
  }
  return filtered;
}

function adjustPixels(canvas, warmth, sharpness) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const { width, height } = canvas;
  const imgData = ctx.getImageData(0, 0, width, height);
  const d = imgData.data;
  const warmthAmt = clamp(warmth / 100, -1, 1);
  for (let i = 0; i < d.length; i += 4) {
    d[i] = clamp(d[i] * (1 + 0.18 * warmthAmt), 0, 255);
    d[i + 1] = clamp(d[i + 1] * (1 + 0.04 * warmthAmt), 0, 255);
    d[i + 2] = clamp(d[i + 2] * (1 - 0.18 * warmthAmt), 0, 255);
  }
  ctx.putImageData(imgData, 0, 0);

  if (sharpness > 1.02) {
    const amount = Math.min(1, (sharpness - 1) * 0.8);
    const src = ctx.getImageData(0, 0, width, height);
    const out = ctx.createImageData(width, height);
    const s = src.data;
    const o = out.data;
    const k = [0, -1, 0, -1, 5, -1, 0, -1, 0];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          let ki = 0;
          for (let yy = -1; yy <= 1; yy++) {
            for (let xx = -1; xx <= 1; xx++) {
              const si = ((y + yy) * width + (x + xx)) * 4 + c;
              sum += s[si] * k[ki++];
            }
          }
          o[idx + c] = clamp(s[idx + c] * (1 - amount) + sum * amount, 0, 255);
        }
        o[idx + 3] = s[idx + 3];
      }
    }
    for (let i = 0; i < o.length; i += 4) {
      if (o[i + 3] === 0) {
        o[i] = s[i]; o[i + 1] = s[i + 1]; o[i + 2] = s[i + 2]; o[i + 3] = s[i + 3];
      }
    }
    ctx.putImageData(out, 0, 0);
  }
}

function drawCover(ctx, sourceCanvas, dx, dy, dw, dh, state) {
  const iw = sourceCanvas.width;
  const ih = sourceCanvas.height;
  const baseScale = Math.max(dw / iw, dh / ih);
  const scale = baseScale * clamp(state.zoom, 1, 2.5);
  const rw = Math.max(dw, Math.round(iw * scale));
  const rh = Math.max(dh, Math.round(ih * scale));
  const extraX = Math.max(0, rw - dw);
  const extraY = Math.max(0, rh - dh);
  const sx = (extraX / 2) * (1 + clamp(state.panX, -1, 1));
  const sy = (extraY / 2) * (1 + clamp(state.panY, -1, 1));
  ctx.drawImage(sourceCanvas, 0, 0, iw, ih, dx - sx, dy - sy, rw, rh);
}

function getMemorialFontFamily() {
  return memorialFont?.value || 'Arial, Helvetica, sans-serif';
}

function drawSafeArea(ctx, w, h) {
  if (!showSafeArea.checked) return;
  const inset = Math.round(w * 0.035);
  ctx.strokeStyle = '#8a8a88';
  ctx.lineWidth = Math.max(1, Math.round(w / 1000));
  ctx.setLineDash([Math.max(6, Math.round(w / 150)), Math.max(6, Math.round(w / 150))]);
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  ctx.setLineDash([]);
}

function drawMemorialText(ctx, w, h) {
  const lines = getMemorialLines();
  if (!lines.length) return;
  const footerH = getFooterHeight(h);
  const footerTop = h - Math.round(h * 0.05) - footerH;
  const lineY = footerTop - Math.max(2, Math.round(h / 1000));
  const fontFamily = getMemorialFontFamily();
  ctx.strokeStyle = '#d9d7d2';
  ctx.lineWidth = Math.max(1, Math.round(w / 1400));
  ctx.beginPath();
  ctx.moveTo(Math.round(w * 0.14), lineY);
  ctx.lineTo(Math.round(w * 0.86), lineY);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#4a4a4a';
  ctx.font = `600 ${Math.max(18, Math.round(h * 0.024))}px ${fontFamily}`;
  const nameY = footerTop + Math.round(footerH * 0.34);
  if (lines[0]) ctx.fillText(lines[0], w / 2, nameY);
  if (lines[1]) {
    ctx.fillStyle = '#6a6a6a';
    ctx.font = `${Math.max(13, Math.round(h * 0.014))}px ${fontFamily}`;
    ctx.fillText(lines[1], w / 2, nameY + Math.round(h * 0.03));
  }
}

function buildCanvas(w, h, includeGuides) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, w, h);

  const boxes = getBoxes(w, h);
  boxes.forEach(([x, y, bw, bh], i) => {
    const s = states[i];
    if (!s.img) {
      ctx.fillStyle = '#efefec';
      ctx.strokeStyle = '#d2d1cc';
      ctx.lineWidth = Math.max(1, Math.round(w / 800));
      ctx.fillRect(x, y, bw, bh);
      ctx.strokeRect(x, y, bw, bh);
      ctx.fillStyle = '#8a8a86';
      ctx.textAlign = 'center';
      ctx.font = `${Math.max(11, Math.round(h * 0.022))}px Arial`;
      ctx.fillText(`Photo ${i + 1}`, x + bw / 2, y + bh / 2 - Math.max(8, Math.round(h * 0.01)));
      ctx.font = `${Math.max(10, Math.round(h * 0.017))}px Arial`;
      ctx.fillText('+ Add Photo', x + bw / 2, y + bh / 2 + Math.max(12, Math.round(h * 0.015)));
    } else {
      const processed = createProcessedCanvas(s);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, bw, bh);
      ctx.clip();
      drawCover(ctx, processed, x, y, bw, bh, s);
      ctx.restore();
    }
    ctx.strokeStyle = i === selected && currentStep >= 2 && currentStep <= 4 ? '#2f93a6' : 'white';
    ctx.lineWidth = i === selected && currentStep >= 2 && currentStep <= 4 ? Math.max(3, Math.round(w / 450)) : Math.max(2, Math.round(w / 600));
    ctx.strokeRect(x, y, bw, bh);
  });

  drawMemorialText(ctx, w, h);
  if (includeGuides) drawSafeArea(ctx, w, h);
  return canvas;
}

function updatePreviewButtons() {
  previewButtons.innerHTML = '';
  const boxes = getBoxes(PREVIEW_W, PREVIEW_H);
  const rect = previewCanvas.getBoundingClientRect();
  const scaleX = rect.width / PREVIEW_W;
  const scaleY = rect.height / PREVIEW_H;

  boxes.forEach(([x, y, bw, bh], i) => {
    const state = states[i];
    if (state.img) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preview-add-btn';
    btn.textContent = `+ Add Photo ${i + 1}`;
    btn.style.left = `${x * scaleX + bw * scaleX * 0.18}px`;
    btn.style.top = `${y * scaleY + bh * scaleY * 0.42}px`;
    btn.style.width = `${bw * scaleX * 0.64}px`;
    btn.style.height = `${Math.min(44, Math.max(30, bh * scaleY * 0.18))}px`;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectSlot(i);
      pendingSlot = i;
      fileInput.click();
    });
    previewButtons.appendChild(btn);
  });
}

function renderPreview() {
  renderQueued = false;
  const canvas = buildCanvas(PREVIEW_W, PREVIEW_H, true);
  previewCtx.clearRect(0, 0, PREVIEW_W, PREVIEW_H);
  previewCtx.drawImage(canvas, 0, 0);
  updatePreviewButtons();
}

function queueRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(renderPreview);
}

function updateReadiness() {
  const required = getRequiredSlots();
  const loaded = states.slice(0, required).filter(s => !!s.img).length;
  const items = [
    { label: `Layout selected`, ok: !!layoutSelect.value },
    { label: `${required} required photo${required === 1 ? '' : 's'} loaded`, ok: loaded === required, detail: `${loaded} of ${required}` },
    { label: `Baby's name entered`, ok: babyName.value.trim().length > 0 },
    { label: `Birthday entered`, ok: birthday.value.trim().length > 0 },
    { label: `Preview ready`, ok: true },
  ];

  const html = items.map(item => `<li class="${item.ok ? 'ok' : 'not-ok'}"><span class="check-icon">${item.ok ? '✓' : '•'}</span><span>${item.label}${item.detail ? ` (${item.detail})` : ''}</span></li>`).join('');
  document.getElementById('readinessList').innerHTML = html;
  document.getElementById('readinessListRight').innerHTML = html;

  const ready = items.every(item => item.ok);
  document.getElementById('readinessSummary').textContent = ready
    ? 'Everything needed for a typical keepsake is ready.'
    : 'Complete the items above before printing.';

  printBtn.disabled = !ready;
  return ready;
}

function downloadCanvas(type) {
  const canvas = buildCanvas(OUTPUT_W, OUTPUT_H, false);
  const mime = type === 'png' ? 'image/png' : 'image/jpeg';
  const quality = type === 'png' ? undefined : 0.96;
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keepsake_8x10.${type}`;
    a.click();
    URL.revokeObjectURL(url);
  }, mime, quality);
}

function printCanvas() {
  if (!updateReadiness()) {
    currentStep = 5;
    updateStepUI();
    alert('Please complete the Print Readiness Check before printing.');
    return;
  }
  const canvas = buildCanvas(OUTPUT_W, OUTPUT_H, false);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.98);
  const win = window.open('', '_blank');
  if (!win) {
    alert('The print window was blocked. Please allow pop-ups for this app and try again.');
    return;
  }
  win.document.write(`<!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
      <title></title>
      <style>
        @page { size: 8in 10in; margin: 0; }
        html, body {
          width: 8in; height: 10in; margin: 0; padding: 0; overflow: hidden; background: #fff;
        }
        img { display:block; width:8in; height:10in; margin:0; padding:0; object-fit:fill; }
        @media print {
          html, body { width:8in !important; height:10in !important; margin:0 !important; padding:0 !important; }
          img { width:8in !important; height:10in !important; margin:0 !important; }
        }
      </style>
    </head>
    <body>
      <img src="${dataUrl}" alt="Keepsake" onload="setTimeout(function(){window.print();}, 150);">
    </body>
  </html>`);
  win.document.close();
}

function resetSelected() {
  const old = states[selected];
  const fresh = makeDefaultState();
  fresh.fileName = old.fileName;
  fresh.img = old.img;
  fresh.previewUrl = old.previewUrl;
  states[selected] = fresh;
  syncControlsFromState();
  updateReadiness();
  queueRender();
}

function newKeepsake() {
  if (!confirm('Start a new keepsake? The current photos and adjustments will be cleared.')) return;
  states.forEach(s => { if (s.previewUrl) URL.revokeObjectURL(s.previewUrl); });
  states = Array.from({ length: 4 }, makeDefaultState);
  selected = 0;
  babyName.value = '';
  birthday.value = '';
  if (memorialFont) memorialFont.value = 'Arial, Helvetica, sans-serif';
  layoutSelect.value = 'Classic 4-Photo';
  showSafeArea.checked = true;
  currentStep = 1;
  showAdvanced = false;
  advancedWrap.hidden = true;
  document.getElementById('toggleAdvancedBtn').textContent = 'Show Advanced';
  syncLayoutThumbSelection();
  setupSlots();
  syncControlsFromState();
  updateReadiness();
  updateStepUI();
  queueRender();
}

function applyStyleToAll() {
  const style = states[selected].style;
  const required = getRequiredSlots();
  for (let i = 0; i < required; i++) states[i].style = style;
  syncControlsFromState();
  queueRender();
}

function applySelectedSettingsToAll() {
  const src = states[selected];
  const required = getRequiredSlots();
  const keys = ['brightness', 'contrast', 'saturation', 'hue', 'warmth', 'sharpness', 'zoom', 'panX', 'panY', 'rotation', 'style'];
  for (let i = 0; i < required; i++) {
    if (i === selected) continue;
    keys.forEach(key => { states[i][key] = src[key]; });
  }
  syncControlsFromState();
  queueRender();
}

function rotateSelected(delta) {
  states[selected].rotation = (states[selected].rotation + delta + 360) % 360;
  queueRender();
}

function clearCrop() {
  states[selected].cropBox = null;
  queueRender();
}

function toggleAdvancedControls() {
  showAdvanced = !showAdvanced;
  advancedWrap.hidden = !showAdvanced;
  document.getElementById('toggleAdvancedBtn').textContent = showAdvanced ? 'Hide Advanced' : 'Show Advanced';
}

function updateStepUI() {
  document.querySelectorAll('.step-chip').forEach(btn => {
    const step = Number(btn.dataset.step);
    btn.classList.toggle('active', step === currentStep);
    btn.classList.toggle('done', step < currentStep);
  });

  document.querySelectorAll('.step-section').forEach(sec => {
    sec.hidden = Number(sec.dataset.step) !== currentStep;
  });
  document.querySelectorAll('.step-pane').forEach(sec => {
    sec.hidden = Number(sec.dataset.step) !== currentStep;
  });

  document.getElementById('backStepBtn').disabled = currentStep === 1;
  document.getElementById('nextStepBtn').textContent = currentStep === 5 ? 'Print Keepsake' : 'Next';
  updateReadiness();
  queueRender();
}

function nextStep() {
  if (currentStep === 2) {
    const required = getRequiredSlots();
    const loaded = states.slice(0, required).filter(s => !!s.img).length;
    if (loaded < required && !confirm(`Only ${loaded} of ${required} required photos are loaded. Continue anyway?`)) return;
  }
  if (currentStep === 5) {
    printCanvas();
    return;
  }
  currentStep += 1;
  updateStepUI();
}

function prevStep() {
  if (currentStep === 1) return;
  currentStep -= 1;
  updateStepUI();
}

// Crop tool
function openCropTool() {
  const state = states[selected];
  if (!state.img) {
    alert('Load a photo first, then crop it.');
    return;
  }
  const maxW = 860;
  const maxH = 620;
  const scale = Math.min(maxW / state.img.naturalWidth, maxH / state.img.naturalHeight, 1);
  cropCanvas.width = Math.max(1, Math.round(state.img.naturalWidth * scale));
  cropCanvas.height = Math.max(1, Math.round(state.img.naturalHeight * scale));
  cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
  cropCtx.drawImage(state.img, 0, 0, cropCanvas.width, cropCanvas.height);

  let sel;
  if (state.cropBox) {
    const [l, t, r, b] = state.cropBox;
    sel = { x1: l * cropCanvas.width, y1: t * cropCanvas.height, x2: r * cropCanvas.width, y2: b * cropCanvas.height };
  } else {
    sel = { x1: cropCanvas.width * 0.07, y1: cropCanvas.height * 0.07, x2: cropCanvas.width * 0.93, y2: cropCanvas.height * 0.93 };
  }
  cropState = { sel, dragging: false, startX: 0, startY: 0 };
  drawCropOverlay();
  cropDialog.showModal();
}

function normalizedSel(sel) {
  const x1 = clamp(Math.min(sel.x1, sel.x2), 0, cropCanvas.width);
  const y1 = clamp(Math.min(sel.y1, sel.y2), 0, cropCanvas.height);
  const x2 = clamp(Math.max(sel.x1, sel.x2), 0, cropCanvas.width);
  const y2 = clamp(Math.max(sel.y1, sel.y2), 0, cropCanvas.height);
  return { x1, y1, x2: Math.max(x1 + 12, x2), y2: Math.max(y1 + 12, y2) };
}

function drawCropOverlay() {
  const state = states[selected];
  cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
  cropCtx.drawImage(state.img, 0, 0, cropCanvas.width, cropCanvas.height);
  const sel = normalizedSel(cropState.sel);
  cropState.sel = sel;
  cropCtx.fillStyle = 'rgba(0,0,0,0.35)';
  cropCtx.fillRect(0, 0, cropCanvas.width, sel.y1);
  cropCtx.fillRect(0, sel.y2, cropCanvas.width, cropCanvas.height - sel.y2);
  cropCtx.fillRect(0, sel.y1, sel.x1, sel.y2 - sel.y1);
  cropCtx.fillRect(sel.x2, sel.y1, cropCanvas.width - sel.x2, sel.y2 - sel.y1);
  cropCtx.strokeStyle = '#ffd24d';
  cropCtx.lineWidth = 2;
  cropCtx.strokeRect(sel.x1, sel.y1, sel.x2 - sel.x1, sel.y2 - sel.y1);
}

function cropPointerPos(evt) {
  const rect = cropCanvas.getBoundingClientRect();
  const scaleX = cropCanvas.width / rect.width;
  const scaleY = cropCanvas.height / rect.height;
  return { x: (evt.clientX - rect.left) * scaleX, y: (evt.clientY - rect.top) * scaleY };
}

cropCanvas.addEventListener('pointerdown', (evt) => {
  if (!cropState) return;
  const pos = cropPointerPos(evt);
  cropState.dragging = true;
  cropState.startX = pos.x;
  cropState.startY = pos.y;
  cropState.sel = { x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y };
  drawCropOverlay();
});

cropCanvas.addEventListener('pointermove', (evt) => {
  if (!cropState?.dragging) return;
  const pos = cropPointerPos(evt);
  cropState.sel = { x1: cropState.startX, y1: cropState.startY, x2: pos.x, y2: pos.y };
  drawCropOverlay();
});
['pointerup', 'pointerleave'].forEach(type => cropCanvas.addEventListener(type, () => { if (cropState) cropState.dragging = false; }));
document.getElementById('useFullPhotoBtn').addEventListener('click', () => { if (!cropState) return; cropState.sel = { x1: 0, y1: 0, x2: cropCanvas.width, y2: cropCanvas.height }; drawCropOverlay(); });
document.getElementById('applyCropBtn').addEventListener('click', () => {
  if (!cropState) return;
  const sel = normalizedSel(cropState.sel);
  const l = clamp(sel.x1 / cropCanvas.width, 0, 1);
  const t = clamp(sel.y1 / cropCanvas.height, 0, 1);
  const r = clamp(sel.x2 / cropCanvas.width, 0, 1);
  const b = clamp(sel.y2 / cropCanvas.height, 0, 1);
  states[selected].cropBox = (l <= 0.001 && t <= 0.001 && r >= 0.999 && b >= 0.999) ? null : [l, t, r, b];
  cropDialog.close();
  cropState = null;
  queueRender();
});
cropDialog.addEventListener('close', () => { cropState = null; });

// Events
buildLayoutSelect();
buildLayoutThumbs();
createControls(basicControls, BASIC_DEFS, 'basic_');
createControls(advancedControls, ADVANCED_DEFS, 'adv_');
advancedWrap.hidden = true;

babyName.addEventListener('input', () => { updateReadiness(); queueRender(); });
birthday.addEventListener('input', () => { updateReadiness(); queueRender(); });
if (memorialFont) memorialFont.addEventListener('change', queueRender);
layoutSelect.addEventListener('change', onLayoutChanged);
showSafeArea.addEventListener('change', queueRender);
document.querySelectorAll('input[name="style"]').forEach(radio => {
  radio.addEventListener('change', () => {
    states[selected].style = radio.value;
    queueRender();
  });
});

document.getElementById('applyStyleAllBtn').addEventListener('click', applyStyleToAll);
document.getElementById('applySettingsAllBtn').addEventListener('click', applySelectedSettingsToAll);
document.getElementById('newKeepsakeBtn').addEventListener('click', newKeepsake);
document.getElementById('saveJpgBtn').addEventListener('click', () => downloadCanvas('jpg'));
document.getElementById('savePngBtn').addEventListener('click', () => downloadCanvas('png'));
document.getElementById('printBtn').addEventListener('click', printCanvas);
document.getElementById('rotateLeftBtn').addEventListener('click', () => rotateSelected(-90));
document.getElementById('rotateRightBtn').addEventListener('click', () => rotateSelected(90));
document.getElementById('cropBtn').addEventListener('click', openCropTool);
document.getElementById('clearCropBtn').addEventListener('click', clearCrop);
document.getElementById('resetSelectedBtn').addEventListener('click', resetSelected);
document.getElementById('toggleAdvancedBtn').addEventListener('click', toggleAdvancedControls);
document.getElementById('nextStepBtn').addEventListener('click', nextStep);
document.getElementById('backStepBtn').addEventListener('click', prevStep);
document.querySelectorAll('.step-chip').forEach(btn => btn.addEventListener('click', () => { currentStep = Number(btn.dataset.step); updateStepUI(); }));

previewCanvas.addEventListener('pointerdown', (evt) => {
  const point = getPreviewCanvasPoint(evt);
  const hit = getBoxIndexAtPoint(point.x, point.y);
  if (!hit) return;
  const { index, box } = hit;
  selectSlot(index);
  if (currentStep < 2) { currentStep = 2; updateStepUI(); }

  const state = states[index];
  if (!state.img) return;

  const [, , bw, bh] = box;
  const geom = getImageDisplayGeometry(state, bw, bh);
  previewDrag = {
    index,
    startClientX: evt.clientX,
    startClientY: evt.clientY,
    startPanX: state.panX,
    startPanY: state.panY,
    extraX: geom.extraX,
    extraY: geom.extraY,
    moved: false,
  };
  previewCanvas.setPointerCapture?.(evt.pointerId);
});

previewCanvas.addEventListener('pointermove', (evt) => {
  if (!previewDrag) return;
  const rect = previewCanvas.getBoundingClientRect();
  const dx = (evt.clientX - previewDrag.startClientX) * (PREVIEW_W / rect.width);
  const dy = (evt.clientY - previewDrag.startClientY) * (PREVIEW_H / rect.height);
  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
    previewDrag.moved = true;
    suppressPreviewClick = true;
  }

  const state = states[previewDrag.index];
  if (previewDrag.extraX > 0) {
    const startSx = (previewDrag.extraX / 2) * (1 + clamp(previewDrag.startPanX, -1, 1));
    const newSx = clamp(startSx - dx, 0, previewDrag.extraX);
    state.panX = clamp((newSx / (previewDrag.extraX / 2)) - 1, -1, 1);
  }
  if (previewDrag.extraY > 0) {
    const startSy = (previewDrag.extraY / 2) * (1 + clamp(previewDrag.startPanY, -1, 1));
    const newSy = clamp(startSy - dy, 0, previewDrag.extraY);
    state.panY = clamp((newSy / (previewDrag.extraY / 2)) - 1, -1, 1);
  }
  syncControlsFromState();
  queueRender();
});

function finishPreviewDrag(evt) {
  if (!previewDrag) return;
  if (evt?.pointerId !== undefined) previewCanvas.releasePointerCapture?.(evt.pointerId);
  previewDrag = null;
  setTimeout(() => { suppressPreviewClick = false; }, 0);
}
previewCanvas.addEventListener('pointerup', finishPreviewDrag);
previewCanvas.addEventListener('pointercancel', finishPreviewDrag);
previewCanvas.addEventListener('pointerleave', (evt) => { if (previewDrag?.moved) finishPreviewDrag(evt); });

previewCanvas.addEventListener('click', (evt) => {
  if (suppressPreviewClick) return;
  const point = getPreviewCanvasPoint(evt);
  const hit = getBoxIndexAtPoint(point.x, point.y);
  if (!hit) return;
  const { index } = hit;
  selectSlot(index);
  if (currentStep < 2) { currentStep = 2; updateStepUI(); }
  if (!states[index].img) {
    pendingSlot = index;
    fileInput.click();
  }
});

window.addEventListener('resize', queueRender);

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (installAppBtn) installAppBtn.hidden = false;
});

if (installAppBtn) {
  installAppBtn.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    try {
      await deferredInstallPrompt.userChoice;
    } catch (_) {}
    deferredInstallPrompt = null;
    installAppBtn.hidden = true;
  });
}

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  if (installAppBtn) installAppBtn.hidden = true;
});

if (window.matchMedia('(display-mode: standalone)').matches) {
  if (installAppBtn) installAppBtn.hidden = true;
}

setupSlots();
syncControlsFromState();
updateReadiness();
updateStepUI();
queueRender();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
