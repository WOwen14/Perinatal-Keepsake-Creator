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
  radio.addEventListener('change', () => { states[selected].style = radio.value; queueRender(); });
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
  previewDrag = { index, startClientX: evt.clientX, startClientY: evt.clientY, startPanX: state.panX, startPanY: state.panY, extraX: geom.extraX, extraY: geom.extraY, moved: false };
  previewCanvas.setPointerCapture?.(evt.pointerId);
});

previewCanvas.addEventListener('pointermove', (evt) => {
  if (!previewDrag) return;
  const rect = previewCanvas.getBoundingClientRect();
  const dx = (evt.clientX - previewDrag.startClientX) * (PREVIEW_W / rect.width);
  const dy = (evt.clientY - previewDrag.startClientY) * (PREVIEW_H / rect.height);
  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) { previewDrag.moved = true; suppressPreviewClick = true; }
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
  syncControlsFromState(); queueRender();
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
  if (!states[index].img) { pendingSlot = index; fileInput.click(); }
});

window.addEventListener('resize', queueRender);
window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); deferredInstallPrompt = event; if (installAppBtn) installAppBtn.hidden = false; });
if (installAppBtn) {
  installAppBtn.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    try { await deferredInstallPrompt.userChoice; } catch (_) {}
    deferredInstallPrompt = null;
    installAppBtn.hidden = true;
  });
}
window.addEventListener('appinstalled', () => { deferredInstallPrompt = null; if (installAppBtn) installAppBtn.hidden = true; });
if (window.matchMedia('(display-mode: standalone)').matches) { if (installAppBtn) installAppBtn.hidden = true; }

setupSlots();
syncControlsFromState();
updateReadiness();
updateStepUI();
queueRender();
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
}
