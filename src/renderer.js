// ── Config ──────────────────────────────────────────
const TILE = 20;
const COLS = 128;
const ROWS = 96;

// ── Terrain definition ───────────────────────────────
const TERRAIN = [
  { id: 'grass',    label: 'Grass',    color: '#5a8a3c' },
  { id: 'dirt',     label: 'Dirt',     color: '#9b7653' },
  { id: 'sand',     label: 'Sand',     color: '#c8b464' },
  { id: 'water',    label: 'Water',    color: '#2e7fb8' },
  { id: 'deepwater',label: 'Deep Water',color: '#1a4f80' },
  { id: 'forest',   label: 'Forest',   color: '#2d5e1e' },
  { id: 'mountain', label: 'Mountain', color: '#7a6a5a' },
  { id: 'snow',     label: 'Snow',     color: '#ddeeff' },
  { id: 'swamp',    label: 'Swamp',    color: '#4a6040' },
  { id: 'lava',     label: 'Lava',     color: '#cc3300' },
  { id: 'stone',    label: 'Stone',    color: '#888888' },
  { id: 'void',     label: 'Void',     color: '#111111' },
];

// ── State ────────────────────────────────────────────
const canvas  = document.getElementById('mapCanvas');
const ctx     = canvas.getContext('2d');
canvas.width  = COLS * TILE;
canvas.height = ROWS * TILE;

let mapData       = newMap();
let selectedId    = 'grass';
let brushSize     = 1;
let isPainting    = false;
let history       = [];          // for undo
let scale         = 1;           // zoom level
let panX          = 0;           // pan offset X
let panY          = 0;           // pan offset Y
const MIN_SCALE   = 0.1;
const MAX_SCALE   = 3;
const SCROLL_SENSITIVITY = 0.001;

function newMap() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill('grass'));
}

// ── Build terrain toolbar ─────────────────────────────
const toolsEl = document.getElementById('terrainTools');
TERRAIN.forEach(t => {
  const btn = document.createElement('button');
  btn.className = 'tool' + (t.id === 'grass' ? ' active' : '');
  btn.dataset.id = t.id;
  btn.innerHTML  = `<span class="swatch" style="background:${t.color}"></span>${t.label}`;
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tool').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedId = t.id;
    document.getElementById('terrainDisplay').textContent = 'Terrain: ' + t.label;
  });
  toolsEl.appendChild(btn);
});

// ── Brush size ────────────────────────────────────────
const brushSlider = document.getElementById('brushSize');
const brushLabel  = document.getElementById('brushLabel');
brushSlider.addEventListener('input', () => {
  brushSize = parseInt(brushSlider.value);
  brushLabel.textContent = brushSize;
});

// ── Draw ──────────────────────────────────────────────
function drawTile(c, r) {
  const t = TERRAIN.find(t => t.id === mapData[r][c]);
  const x = c * TILE, y = r * TILE;
  ctx.fillStyle = t ? t.color : '#000';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.strokeRect(x, y, TILE, TILE);
}

function drawMap() {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawTile(c, r);
}

// ── Paint with brush ──────────────────────────────────
function paintAt(px, py) {
  const cc = Math.floor(px / TILE);
  const rr = Math.floor(py / TILE);
  const half = Math.floor(brushSize / 2);

  for (let dr = -half; dr <= half; dr++) {
    for (let dc = -half; dc <= half; dc++) {
      const c = cc + dc, r = rr + dr;
      if (c >= 0 && c < COLS && r >= 0 && r < ROWS) {
        mapData[r][c] = selectedId;
        drawTile(c, r);
      }
    }
  }
}

// ── Mouse events ──────────────────────────────────────
let isPanning = false;
let lastPanX = 0, lastPanY = 0;

canvas.addEventListener('mousedown', e => {
  // Middle mouse button or Ctrl+Left click for panning
  if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
    e.preventDefault();
    isPanning = true;
    lastPanX = e.clientX;
    lastPanY = e.clientY;
    canvas.style.cursor = 'grabbing';
    return;
  }
  if (e.button === 0) {
    saveHistory();
    isPainting = true;
    paintAt(e.offsetX, e.offsetY);
  }
});

canvas.addEventListener('mousemove', e => {
  const c = Math.floor(e.offsetX / TILE);
  const r = Math.floor(e.offsetY / TILE);
  document.getElementById('coordDisplay').textContent = `Tile: ${c}, ${r}`;

  if (isPanning) {
    const dx = (e.clientX - lastPanX) / scale;
    const dy = (e.clientY - lastPanY) / scale;
    panX -= dx;
    panY -= dy;
    clampPan();
    updateTransform();
    lastPanX = e.clientX;
    lastPanY = e.clientY;
  } else if (isPainting) {
    paintAt(e.offsetX, e.offsetY);
  }
});

canvas.addEventListener('mouseup',    e => {
  if (isPanning) {
    isPanning = false;
    canvas.style.cursor = 'crosshair';
  } else {
    isPainting = false;
  }
});
canvas.addEventListener('mouseleave', () => {
  isPainting = false;
  isPanning = false;
  canvas.style.cursor = 'crosshair';
});

// Prevent context menu on canvas (for right-click panning)
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ── Zoom with pan and boundary constraints ───────────
function clampPan() {
  const container = document.getElementById('canvas-container');
  const containerRect = container.getBoundingClientRect();
  const scaledWidth = canvas.width * scale;
  const scaledHeight = canvas.height * scale;

  // Maximum pan values (how far we can scroll)
  const maxPanX = Math.max(0, scaledWidth - containerRect.width);
  const maxPanY = Math.max(0, scaledHeight - containerRect.height);

  // Clamp pan values: min is 0 (can't go above/left of canvas), max prevents overflow
  panX = Math.max(0, Math.min(panX, maxPanX));
  panY = Math.max(0, Math.min(panY, maxPanY));
}

function updateTransform() {
  canvas.style.transform = `scale(${scale}) translate(${panX / scale}px, ${panY / scale}px)`;
}

canvas.addEventListener('wheel', e => {
  e.preventDefault();

  const container = document.getElementById('canvas-container');
  const containerRect = container.getBoundingClientRect();
  const rect = canvas.getBoundingClientRect();

  // Mouse position relative to canvas (accounting for current transform)
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const delta = -e.deltaY * SCROLL_SENSITIVITY;
  const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale + delta));

  if (newScale !== scale) {
    // Calculate the point under mouse before zoom
    const worldX = (mouseX / scale) - panX;
    const worldY = (mouseY / scale) - panY;

    scale = newScale;

    // Calculate new pan to keep the same point under mouse
    const newPanX = (mouseX / scale) - worldX;
    const newPanY = (mouseY / scale) - worldY;

    panX = newPanX;
    panY = newPanY;

    // Apply boundary constraints
    clampPan();
    updateTransform();

    document.getElementById('zoomDisplay').textContent = `Zoom: ${Math.round(scale * 100)}%`;
  }
}, { passive: false });

// ── Undo ─────────────────────────────────────────────
function saveHistory() {
  history.push(mapData.map(row => [...row]));
  if (history.length > 50) history.shift(); // max 50 steps
}

document.getElementById('undoBtn').addEventListener('click', () => {
  if (history.length === 0) return;
  mapData = history.pop();
  drawMap();
});

// ── Clear ─────────────────────────────────────────────
document.getElementById('clearBtn').addEventListener('click', () => {
  if (!confirm('Clear the entire map?')) return;
  saveHistory();
  mapData = newMap();
  drawMap();
});

// ── Save ─────────────────────────────────────────────
document.getElementById('saveBtn').addEventListener('click', () => {
  const json = JSON.stringify({ version: 1, cols: COLS, rows: ROWS, mapData });
  const blob = new Blob([json], { type: 'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'map.json';
  a.click();
});

// ── Load ─────────────────────────────────────────────
document.getElementById('loadBtn').addEventListener('click', () => {
  const input    = document.createElement('input');
  input.type     = 'file';
  input.accept   = '.json';
  input.onchange = e => {
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const loaded = JSON.parse(ev.target.result);
        saveHistory();
        for (let r = 0; r < ROWS; r++)
          for (let c = 0; c < COLS; c++)
            mapData[r][c] = (loaded.mapData[r] && loaded.mapData[r][c]) || 'grass';
        drawMap();
      } catch {
        alert('Invalid map file.');
      }
    };
    reader.readAsText(e.target.files[0]);
  };
  input.click();
});

// ── Init ─────────────────────────────────────────────
drawMap();

