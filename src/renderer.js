// ── Config ──────────────────────────────────────────
const TILE = 36;
const COLS = 32;
const ROWS = 22;

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
canvas.addEventListener('mousedown', e => {
  saveHistory();
  isPainting = true;
  paintAt(e.offsetX, e.offsetY);
});
canvas.addEventListener('mousemove', e => {
  const c = Math.floor(e.offsetX / TILE);
  const r = Math.floor(e.offsetY / TILE);
  document.getElementById('coordDisplay').textContent = `Tile: ${c}, ${r}`;
  if (isPainting) paintAt(e.offsetX, e.offsetY);
});
canvas.addEventListener('mouseup',    () => isPainting = false);
canvas.addEventListener('mouseleave', () => isPainting = false);

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

