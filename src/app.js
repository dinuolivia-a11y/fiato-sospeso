(() => {
'use strict';

/* ================= utilità ================= */
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const now = () => performance.now();
const pick = a => a[Math.floor(Math.random() * a.length)];
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
const fmtSec = s => s.toFixed(1).replace('.', ',') + ' s';
const pts = n => (n === 1 ? '1 punto' : n + ' punti');
const listNames = arr => arr.length <= 1 ? (arr[0] || '') : arr.slice(0, -1).join(', ') + ' e ' + arr[arr.length - 1];
const percentile = (arr, q) => { const s = arr.filter(Number.isFinite).sort((a, b) => a - b); if (!s.length) return -60; return s[clamp(Math.floor(q * (s.length - 1)), 0, s.length - 1)]; };
const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const camel = s => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

const el = {};
$$('[id]').forEach(n => { el[camel(n.id)] = n; });

/* ================= costanti ================= */
const LEVELS = ['soft', 'ironico', 'piccante'];
const SENS = {
  facile:   { T0: 4.6, Tf: 1.45, transit: 3.2, tilt: 54, dB: 24, touchSpeed: 0.72, touchSize: 1.22, touchReach: 0.82 },
  normale:  { T0: 3.6, Tf: 1.05, transit: 2.5, tilt: 48, dB: 20, touchSpeed: 1, touchSize: 1, touchReach: 1 },
  chirurgo: { T0: 2.7, Tf: 0.75, transit: 1.9, tilt: 42, dB: 16, touchSpeed: 1.45, touchSize: 0.78, touchReach: 1.18 }
};
const TAU = 22;          // secondi: velocità con cui la fiala diventa instabile
const COMP_EVERY = 15;   // secondi tra una complicazione e l'altra
const MIN_BANK = 5;      // secondi prima di poter incassare
const ROT_W = 0.018;     // peso della rotazione nel tremore

const CAUSE = {
  shake: 'Hai tremato troppo.',
  tilt: 'L’hai inclinata troppo.',
  noise: 'Troppo rumore in sala.',
  slip: 'Il dito è scivolato fuori dal cerchio.',
  lift: 'Hai staccato il dito.'
};
const CAUSE_TRANSIT = {
  shake: 'Troppi scossoni nel passaggio.',
  tilt: 'Inclinata troppo nel passaggio.',
  noise: 'Troppo rumore in sala.'
};
const HINT = { shake: 'Stai tremando!', tilt: 'Tienila in piano!', noise: 'Silenzio!', slip: 'Resta nel cerchio!', lift: '' };

/* ================= stato ================= */
const G = {
  names: [], level: 'ironico', rounds: 3, sens: 'normale',
  night: false, pen: true, sound: true, forceTouch: false,
  players: [], round: 1, played: new Set(), cur: 0, prev: 0,
  mode: 'touch', active: false, noiseBase: null, decks: null
};
const P = {
  phase: 'idle', held: 0, loot: 0, mult: 1, T0: 3.6, Tf: 1.05, compNext: COMP_EVERY,
  fx: { blind: false, hot: false, calmUntil: 0 }, exceedAt: 0, lastUI: 0, grace: 0,
  calibOk: 0, calibSamples: [], micSamples: [], changeUsed: false, beatNext: 0, r: 0,
  vp: {}, touch: { id: null, x: 0, y: 0 }, ph: [0, 0, 0, 0], wander: 0,
  shownLoot: -1, shownBank: -1, hint: '', live: false, prepOk: 0, after: null, cause: ''
};
let screen = 'home';
const V = {};

/* ================= preferenze ================= */
const STORE = 'fiato-sospeso-v1';
function loadPrefs() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (!s || typeof s !== 'object') return;
    if (Array.isArray(s.names)) G.names = s.names.filter(n => typeof n === 'string' && n.trim()).slice(0, 10);
    if (LEVELS.indexOf(s.level) >= 0) G.level = s.level;
    if ([2, 3, 5].indexOf(s.rounds) >= 0) G.rounds = s.rounds;
    if (SENS[s.sens]) G.sens = s.sens;
    ['night', 'pen', 'sound', 'forceTouch'].forEach(k => { if (typeof s[k] === 'boolean') G[k] = s[k]; });
  } catch (e) { /* niente preferenze salvate */ }
}
function savePrefs() {
  try {
    localStorage.setItem(STORE, JSON.stringify({ names: G.names, level: G.level, rounds: G.rounds, sens: G.sens, night: G.night, pen: G.pen, sound: G.sound, forceTouch: G.forceTouch }));
  } catch (e) { /* salvataggio non disponibile */ }
}

/* ================= tema ================= */
const theme = { edge: '#1F2150' };
function refreshTheme() {
  try { const v = getComputedStyle(document.documentElement).getPropertyValue('--edge').trim(); if (v) theme.edge = v; } catch (e) {}
}
if (window.matchMedia) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (mq.addEventListener) mq.addEventListener('change', refreshTheme); else if (mq.addListener) mq.addListener(refreshTheme);
}
try { new MutationObserver(refreshTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); } catch (e) {}

/* ================= audio ================= */
const Snd = {
  ctx: null, out: null, noise: null, hs: null, hg: null,
  ensure() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.out = this.ctx.createGain(); this.out.gain.value = 0.8; this.out.connect(this.ctx.destination);
        const len = Math.floor(this.ctx.sampleRate * 1.5), b = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.noise = b;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { /* audio non disponibile */ }
  },
  can() { return !!(this.ctx && G.sound); },
  env(g, t, peak, a, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); },
  thump(t, v) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(72, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.14);
    this.env(g, t, v, 0.012, 0.19); o.connect(g); g.connect(this.out); o.start(t); o.stop(t + 0.24);
  },
  beat(i) {
    if (!this.can() || G.night) return;
    try { const t = this.ctx.currentTime + 0.01, v = 0.3 + 0.5 * clamp(i, 0, 1); this.thump(t, v); this.thump(t + 0.17, v * 0.55); } catch (e) {}
  },
  hissOn() {
    if (!this.can() || G.night || this.hs) return;
    try {
      const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = this.noise; s.loop = true; f.type = 'bandpass'; f.frequency.value = 2800; f.Q.value = 0.7; g.gain.value = 0;
      s.connect(f); f.connect(g); g.connect(this.out); s.start(); this.hs = s; this.hg = g;
    } catch (e) {}
  },
  hiss(v) { if (this.hg) { try { this.hg.gain.setTargetAtTime(clamp(v, 0, 1) * 0.1, this.ctx.currentTime, 0.05); } catch (e) {} } },
  hissOff() { if (this.hs) { try { this.hs.stop(); } catch (e) {} } this.hs = null; this.hg = null; },
  boom() {
    if (!this.can()) return;
    try {
      const c = this.ctx, t = c.currentTime + 0.005, soft = G.night;
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = this.noise; f.type = 'lowpass';
      f.frequency.setValueAtTime(soft ? 900 : 2400, t); f.frequency.exponentialRampToValueAtTime(110, t + 1.3);
      g.gain.setValueAtTime(soft ? 0.22 : 1, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (soft ? 0.7 : 1.5));
      s.connect(f); f.connect(g); g.connect(this.out); s.start(t); s.stop(t + 1.6);
      const o = c.createOscillator(), og = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(115, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.9);
      og.gain.setValueAtTime(soft ? 0.2 : 0.95, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
      o.connect(og); og.connect(this.out); o.start(t); o.stop(t + 1.05);
    } catch (e) {}
  },
  notes(freqs, gap, v, type) {
    if (!this.can()) return;
    try {
      const c = this.ctx, t0 = c.currentTime + 0.01;
      freqs.forEach((fr, i) => {
        const o = c.createOscillator(), g = c.createGain(), t = t0 + i * gap;
        o.type = type; o.frequency.value = fr; this.env(g, t, v, 0.015, 0.45);
        o.connect(g); g.connect(this.out); o.start(t); o.stop(t + 0.5);
      });
    } catch (e) {}
  },
  chime() { this.notes([523.25, 659.25, 783.99, 1046.5], 0.09, G.night ? 0.05 : 0.18, 'triangle'); },
  ding() { if (!G.night) this.notes([880, 1318.5], 0.12, 0.13, 'sine'); }
};

/* ================= sensore di movimento ================= */
const Motion = {
  attached: false, count: 0, last: -1e9, prevT: 0, agit: 0, tilt: 0, gx: 0, gy: 0, zs: 1, lp: null,
  attach() {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener('devicemotion', e => this.handle(e), { passive: true });
  },
  handle(e) {
    const t = now();
    const dt = this.prevT ? clamp((t - this.prevT) / 1000, 0.002, 0.2) : 0.016;
    this.prevT = t;
    const g = e.accelerationIncludingGravity, a = e.acceleration;
    let ax = null, ay = null, az = null;
    if (g && g.x != null && g.y != null && g.z != null) {
      const k = 1 - Math.exp(-dt / 0.25);
      if (!this.lp) this.lp = { x: g.x, y: g.y, z: g.z };
      this.lp.x += (g.x - this.lp.x) * k; this.lp.y += (g.y - this.lp.y) * k; this.lp.z += (g.z - this.lp.z) * k;
      const m = Math.hypot(this.lp.x, this.lp.y, this.lp.z) || 9.81;
      this.gx = this.lp.x / m; this.gy = this.lp.y / m;
      const cz = this.lp.z / m;
      this.tilt = Math.acos(clamp(Math.abs(cz), 0, 1)) * 57.29578;
      if (this.tilt < 30) this.zs = cz >= 0 ? 1 : -1;
      ax = g.x - this.lp.x; ay = g.y - this.lp.y; az = g.z - this.lp.z;
    }
    if (a && a.x != null && a.y != null && a.z != null) { ax = a.x; ay = a.y; az = a.z; }
    if (ax == null) return;
    let mag = Math.hypot(ax, ay, az);
    const rr = e.rotationRate;
    if (rr && (rr.alpha != null || rr.beta != null || rr.gamma != null)) {
      mag = Math.hypot(mag, Math.hypot(rr.alpha || 0, rr.beta || 0, rr.gamma || 0) * ROT_W);
    }
    if (!Number.isFinite(mag)) return;
    this.agit += (mag - this.agit) * (1 - Math.exp(-dt / 0.06));
    this.count++; this.last = t;
  },
  tx() { return clamp(-this.gx * this.zs * 2.2, -1, 1); },
  ty() { return clamp(this.gy * this.zs * 2.2, -1, 1); }
};

async function requestMotion() {
  if (typeof window.DeviceMotionEvent === 'undefined') return false;
  if (typeof DeviceMotionEvent.requestPermission === 'function') {
    try { const r = await DeviceMotionEvent.requestPermission(); if (r !== 'granted') return false; } catch (e) { return false; }
  }
  Motion.attach();
  const start = Motion.count, t0 = now();
  return new Promise(res => {
    const iv = setInterval(() => {
      if (Motion.count - start >= 3) { clearInterval(iv); res(true); }
      else if (now() - t0 > 1800) { clearInterval(iv); res(false); }
    }, 80);
  });
}

/* ================= microfono (modalità notte) ================= */
const Mic = {
  on: false, stream: null, an: null, buf: null, bbuf: null, db: -70,
  async start() {
    if (this.on) return true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;
    Snd.ensure();
    if (!Snd.ctx) return false;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const src = Snd.ctx.createMediaStreamSource(s), an = Snd.ctx.createAnalyser();
      an.fftSize = 1024; src.connect(an);
      this.stream = s; this.an = an; this.buf = new Float32Array(an.fftSize); this.bbuf = new Uint8Array(an.fftSize);
      this.on = true; this.db = -70;
      return true;
    } catch (e) { return false; }
  },
  read(dt) {
    if (!this.on) return;
    const n = this.an.fftSize; let sum = 0;
    if (this.an.getFloatTimeDomainData) { this.an.getFloatTimeDomainData(this.buf); for (let i = 0; i < n; i++) sum += this.buf[i] * this.buf[i]; }
    else { this.an.getByteTimeDomainData(this.bbuf); for (let i = 0; i < n; i++) { const v = (this.bbuf[i] - 128) / 128; sum += v * v; } }
    const db = 20 * Math.log10(Math.sqrt(sum / n) + 1e-7);
    this.db += (db - this.db) * (1 - Math.exp(-dt / 0.1));
  },
  stop() { try { if (this.stream) this.stream.getTracks().forEach(t => t.stop()); } catch (e) {} this.stream = null; this.on = false; }
};
function micNeeded() { return !!(G.active && G.night); }
function releaseMicIfIdle() { if (!micNeeded()) Mic.stop(); }
function leaveTest() {
  if (P.phase === 'test') P.phase = 'idle';
  el.micBlock.hidden = true;
  el.testMic.hidden = false;
  el.testOn.hidden = false;
  el.testOn.disabled = false;
  el.testMic.disabled = false;
  el.testFeedback.textContent = 'Accendi il sensore, appoggia il telefono sul palmo aperto e prova: parla, ridi, alzati in piedi.';
  syncTestButtons();
  releaseMicIfIdle();
}

/* ================= schermo sempre acceso ================= */
let wake = null;
async function keepAwake() {
  try {
    if ('wakeLock' in navigator && !wake && document.visibilityState === 'visible') {
      wake = await navigator.wakeLock.request('screen');
      wake.addEventListener('release', () => { wake = null; });
    }
  } catch (e) { wake = null; }
}
function releaseWake() { try { if (wake) wake.release(); } catch (e) {} wake = null; }

/* ================= la fiala disegnata ================= */
class Vessel {
  constructor(canvas) {
    this.c = canvas; this.g = canvas.getContext('2d');
    this.rings = []; this.bubbles = []; this.sx = 0; this.sy = 0; this.vx = 0; this.vy = 0; this.emit = 0; this.bub = 0;
    this.dpr = 1; this.w = 2; this.h = 2; this.resize();
  }
  resize() {
    const r = this.c.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(2, Math.round(r.width * dpr)), h = Math.max(2, Math.round(r.height * dpr));
    if (this.c.width !== w || this.c.height !== h) { this.c.width = w; this.c.height = h; }
    this.w = w; this.h = h; this.dpr = dpr;
  }
  geom() { return { cx: this.w / 2, cy: this.h / 2, R: Math.max(10, Math.min(this.w, this.h) / 2 - 10 * this.dpr) }; }
  draw(dt, p) {
    p = p || {};
    const g = this.g, dpr = this.dpr, geo = this.geom(), cx = geo.cx, cy = geo.cy, R = geo.R;
    g.clearRect(0, 0, this.w, this.h);
    if (this.w < 40 || this.h < 40) return;
    const live = clamp(p.live || 0, 0, 1.3), danger = clamp(p.danger || 0, 0, 1);
    // il liquido scivola dalla parte in cui il telefono si inclina
    const tx = (p.tx || 0) * R * 0.3, ty = (p.ty || 0) * R * 0.3;
    this.vx += ((tx - this.sx) * 30 - this.vx * 7) * dt;
    this.vy += ((ty - this.sy) * 30 - this.vy * 7) * dt;
    this.sx = clamp(this.sx + this.vx * dt, -R * 0.45, R * 0.45);
    this.sy = clamp(this.sy + this.vy * dt, -R * 0.45, R * 0.45);
    const jit = live * R * 0.012;
    const lx = cx + this.sx + (Math.random() - 0.5) * jit, ly = cy + this.sy + (Math.random() - 0.5) * jit;
    const heat = clamp(Math.max(danger * 0.85, Math.min(live, 1)), 0, 1);
    const hue = 44 - 42 * heat;
    const dim = p.blind ? 0.5 : 1;

    g.save();
    if (heat > 0.55 && !p.blind) {
      g.shadowColor = 'hsla(' + hue.toFixed(1) + ',100%,55%,' + ((heat - 0.55) * 1.8).toFixed(2) + ')';
      g.shadowBlur = 42 * dpr * heat;
    }
    const gr = g.createRadialGradient(lx - R * 0.18, ly - R * 0.22, R * 0.04, lx, ly, R * 1.2);
    gr.addColorStop(0, 'hsl(' + hue.toFixed(1) + ',100%,' + (76 * dim).toFixed(1) + '%)');
    gr.addColorStop(0.5, 'hsl(' + hue.toFixed(1) + ',92%,' + (56 * dim).toFixed(1) + '%)');
    gr.addColorStop(1, 'hsl(' + (hue - 4).toFixed(1) + ',86%,' + (32 * dim).toFixed(1) + '%)');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
    g.restore();

    g.save();
    g.beginPath(); g.arc(cx, cy, R - 3 * dpr, 0, Math.PI * 2); g.clip();
    if (!p.blind) {
      this.emit += (0.7 + live * 16) * dt;
      while (this.emit >= 1) { this.emit -= 1; this.rings.push({ r: R * 0.04, a: 0.1 + Math.min(live, 1.2) * 0.75 }); }
    }
    const sp = R * 0.95;
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const q = this.rings[i]; q.r += sp * dt; q.a *= Math.exp(-dt * 1.5);
      if (q.r > R * 1.3 || q.a < 0.01) { this.rings.splice(i, 1); continue; }
      g.beginPath(); g.arc(lx, ly, q.r, 0, Math.PI * 2);
      g.lineWidth = (1.5 + q.a * 5) * dpr; g.strokeStyle = 'rgba(255,255,255,' + (q.a * 0.55).toFixed(3) + ')'; g.stroke();
      g.beginPath(); g.arc(lx, ly, q.r + 4 * dpr, 0, Math.PI * 2);
      g.lineWidth = (1 + q.a * 3) * dpr; g.strokeStyle = 'rgba(60,15,0,' + (q.a * 0.2).toFixed(3) + ')'; g.stroke();
    }
    if (this.rings.length > 70) this.rings.splice(0, this.rings.length - 70);
    this.bub += (0.4 + danger * 7 + Math.min(live, 1) * 4) * dt;
    while (this.bub >= 1) {
      this.bub -= 1;
      const an = Math.random() * 6.2832, rd = Math.sqrt(Math.random()) * R * 0.85;
      this.bubbles.push({ x: cx + Math.cos(an) * rd, y: cy + Math.sin(an) * rd, s: (1.5 + Math.random() * 4) * dpr, life: 0, max: 0.5 + Math.random() * 0.9 });
    }
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i]; b.life += dt; const k = b.life / b.max;
      if (k >= 1) { this.bubbles.splice(i, 1); continue; }
      const al = k < 0.8 ? 0.6 : 0.6 * (1 - (k - 0.8) / 0.2);
      g.beginPath(); g.arc(b.x, b.y, b.s * (0.4 + k), 0, Math.PI * 2);
      g.lineWidth = 1.3 * dpr; g.strokeStyle = 'rgba(255,255,255,' + al.toFixed(3) + ')'; g.stroke();
    }
    if (this.bubbles.length > 80) this.bubbles.splice(0, this.bubbles.length - 80);
    if (p.blind) { g.fillStyle = 'rgba(20,20,60,0.4)'; g.fillRect(0, 0, this.w, this.h); }
    if (p.target) {
      const t = p.target;
      g.beginPath(); g.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      g.fillStyle = p.touching ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.14)'; g.fill();
      g.setLineDash([10 * dpr, 7 * dpr]); g.lineWidth = 4 * dpr; g.strokeStyle = 'rgba(255,255,255,0.95)'; g.stroke(); g.setLineDash([]);
      if (p.finger) { g.beginPath(); g.arc(p.finger.x, p.finger.y, 9 * dpr, 0, Math.PI * 2); g.fillStyle = 'rgba(26,28,71,0.8)'; g.fill(); }
    }
    g.restore();

    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2);
    g.lineWidth = 6 * dpr; g.strokeStyle = theme.edge; g.stroke();
    g.beginPath(); g.arc(cx, cy, R - 10 * dpr, Math.PI * 1.1, Math.PI * 1.42);
    g.lineWidth = 5 * dpr; g.lineCap = 'round'; g.strokeStyle = 'rgba(255,255,255,0.6)'; g.stroke(); g.lineCap = 'butt';
  }
}

/* ================= i cocci dell'esplosione ================= */
const Boom = {
  active: false, parts: [], t: 0, c: null, g: null, dpr: 1,
  start(canvas) {
    this.c = canvas; this.g = canvas.getContext('2d');
    const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(2, Math.round(r.width * dpr)); canvas.height = Math.max(2, Math.round(r.height * dpr));
    this.dpr = dpr; this.parts = []; this.t = 0;
    this.g.clearRect(0, 0, canvas.width, canvas.height);
    if (reduceMotion) { this.active = false; return; }
    const cx = canvas.width / 2, cy = canvas.height * 0.3, cols = ['#FFC444', '#1A1C47', '#FFF8EE', '#FF8A3D'];
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * 6.2832, s = (250 + Math.random() * 750) * dpr;
      this.parts.push({ k: 'd', x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 200 * dpr, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14,
        w: (4 + Math.random() * 10) * dpr, h: (3 + Math.random() * 6) * dpr, c: pick(cols), life: 1.2 + Math.random() * 0.8 });
    }
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * 6.2832, s = (40 + Math.random() * 160) * dpr;
      this.parts.push({ k: 's', x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: (20 + Math.random() * 40) * dpr, gr: (60 + Math.random() * 90) * dpr, life: 1.4 + Math.random() * 0.8 });
    }
    this.active = true;
  },
  draw(dt) {
    const g = this.g, c = this.c; this.t += dt;
    g.clearRect(0, 0, c.width, c.height);
    let alive = 0;
    for (const p of this.parts) {
      const k = this.t / p.life; if (k >= 1) continue; alive++;
      if (p.k === 'd') {
        p.vy += 1100 * this.dpr * dt; p.vx *= Math.exp(-dt * 0.8); p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.globalAlpha = 1 - k * k; g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore();
      } else {
        p.vx *= Math.exp(-dt * 2); p.vy *= Math.exp(-dt * 2); p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.gr * dt;
        g.globalAlpha = 0.28 * (1 - k); g.fillStyle = '#FFF8EE'; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.2832); g.fill(); g.globalAlpha = 1;
      }
    }
    if (!alive || this.t > 2.6) { this.active = false; g.clearRect(0, 0, c.width, c.height); }
  }
};

/* ================= interfaccia ================= */
let lastSwap = 0, lastPD = 0;
function show(name) {
  screen = name; lastSwap = now();
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === 's-' + name));
  const s = document.getElementById('s-' + name); if (s) s.scrollTop = 0;
  refreshTheme();
  requestAnimationFrame(resizeAll);
}
function resizeAll() { Object.keys(V).forEach(k => V[k].resize()); if (screen === 'play') fitPlayTexts(); }
let toastTimer = 0;
function toast(msg) {
  el.toast.textContent = msg; el.toast.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.toast.classList.remove('on'), 3400);
}
function flash() { if (reduceMotion) return; el.flash.classList.remove('go'); void el.flash.offsetWidth; el.flash.classList.add('go'); }
function setHint(t) { if (P.hint !== t) { P.hint = t; el.hint.textContent = t; } }
function setReadout(big, label) {
  if (el.loot.textContent !== big) el.loot.textContent = big;
  if (el.lootLabel.textContent !== label) el.lootLabel.textContent = label;
}
function setMeter(fill, r, cls) {
  fill.style.width = (clamp(r, 0, 1) * 100).toFixed(1) + '%';
  const c = 'fill' + (cls != null ? cls : (r > 0.8 ? ' bad' : r > 0.5 ? ' warn' : ''));
  if (fill.className !== c) fill.className = c;
}
function renderText(node, tpl, map) {
  node.textContent = '';
  const re = /\{([A-Z])\}/g; let last = 0, m;
  while ((m = re.exec(tpl))) {
    if (m.index > last) node.appendChild(document.createTextNode(tpl.slice(last, m.index)));
    const b = document.createElement('strong'); b.textContent = map[m[1]] || 'qualcuno'; node.appendChild(b);
    last = re.lastIndex;
  }
  if (last < tpl.length) node.appendChild(document.createTextNode(tpl.slice(last)));
}
function namesFor(holder) {
  const others = shuffle(G.players.map((_, i) => i).filter(i => i !== holder));
  return {
    X: others.length ? G.players[others[0]].name : 'qualcuno',
    Y: others.length > 1 ? G.players[others[1]].name : 'qualcun altro'
  };
}
function fitText(node, max, min) {
  if (!node || node.offsetParent === null) return;
  let size = max; node.style.fontSize = size + 'px';
  while (size > min && node.scrollHeight > node.clientHeight + 1) { size -= 1; node.style.fontSize = size + 'px'; }
}
function fitPlayTexts() {
  const wmax = clamp(Math.round(window.innerWidth * 0.058), 19, 27);
  if (!el.ticket.hidden) fitText(el.challenge, wmax, 14);
  if (!el.comp.hidden) fitText(el.comp, 17, 12);
}
function blurActive() { try { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); } catch (e) {} }

/* ================= mazzi ================= */
const isLoud = s => s.charAt(0) === '!';
const cleanText = s => (isLoud(s) ? s.slice(1) : s);
function mkDeck(arr) { return { arr: arr, order: shuffle(arr.map((_, i) => i)), i: 0 }; }
function drawFrom(deck, ok) {
  const n = deck.arr.length;
  for (let k = 0; k < n * 2 + 2; k++) {
    if (deck.i >= deck.order.length) { deck.order = shuffle(deck.arr.map((_, i) => i)); deck.i = 0; }
    const it = deck.arr[deck.order[deck.i++]];
    if (!ok || ok(it)) return it;
  }
  return deck.arr[0];
}
function initDecks() {
  const L = G.level;
  G.decks = {
    sfide: mkDeck(SFIDE[L]),
    comp: mkDeck(COMPLICAZIONI.tutte.concat(COMPLICAZIONI[L] || [])),
    pen: mkDeck(PENITENZE[L]),
    penC: mkDeck(PENITENZE_COPPIA[L])
  };
}

/* ================= preparazione ================= */
const switchSyncs = [], radioSyncs = [];
function renderPlayers() {
  el.plist.textContent = '';
  G.names.forEach((n, i) => {
    const li = document.createElement('li'), sp = document.createElement('span'), x = document.createElement('button');
    sp.textContent = n; x.type = 'button'; x.className = 'x'; x.textContent = '×'; x.setAttribute('aria-label', 'Rimuovi ' + n);
    x.addEventListener('click', () => { G.names.splice(i, 1); renderPlayers(); savePrefs(); });
    li.appendChild(sp); li.appendChild(x); el.plist.appendChild(li);
  });
  const n = G.names.length;
  el.pnote.textContent = n < 2 ? 'Servono almeno 2 giocatori.' : n >= 10 ? 'Siete in 10: il massimo.' : n + ' giocatori. Si arriva fino a 10.';
  el.startBtn.disabled = n < 2;
  el.addBtn.disabled = n >= 10;
}
function addName() {
  const v = el.nameIn.value.replace(/\s+/g, ' ').trim().slice(0, 16);
  if (!v) { el.nameIn.focus(); return; }
  if (G.names.length >= 10) return;
  if (G.names.some(n => n.toLowerCase() === v.toLowerCase())) { toast('Questo nome c’è già.'); return; }
  G.names.push(v); el.nameIn.value = ''; renderPlayers(); savePrefs(); el.nameIn.focus();
}
function bindRadio(group, key, parse) {
  const btns = $$('[role="radio"]', group);
  const sync = () => btns.forEach(b => { const on = String(G[key]) === b.dataset.val; b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; });
  btns.forEach((b, i) => {
    b.addEventListener('click', () => { G[key] = parse ? parse(b.dataset.val) : b.dataset.val; radioSyncs.forEach(f => f()); savePrefs(); });
    b.addEventListener('keydown', e => {
      const dir = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      const nb = btns[(i + dir + btns.length) % btns.length]; nb.click(); nb.focus();
    });
  });
  radioSyncs.push(sync); sync();
}
function bindSwitches() {
  $$('.switch').forEach(sw => {
    const key = sw.dataset.key;
    const sync = () => sw.setAttribute('aria-checked', G[key] ? 'true' : 'false');
    sw.addEventListener('click', () => { G[key] = !G[key]; sync(); savePrefs(); });
    switchSyncs.push(sync); sync();
  });
}

/* ================= prova la fiala ================= */
const T = { peak: 0, label: '', labelAt: 0, micT0: 0, base: null, samples: [] };
function syncTestButtons() {
  const vis = [el.testOn, el.testMic].filter(b => !b.hidden);
  [el.testOn, el.testMic].forEach(b => b.classList.toggle('span', vis.length === 1 && vis[0] === b));
}
async function testSensor() {
  Snd.ensure();
  el.testOn.disabled = true;
  const ok = await requestMotion();
  el.testOn.disabled = false;
  if (ok) {
    P.phase = 'test'; el.testOn.hidden = true; syncTestButtons();
    el.testFeedback.textContent = 'Appoggia il telefono sul palmo aperto e prova: parla, ridi, alzati in piedi.';
  } else {
    el.testFeedback.textContent = 'Qui il sensore di movimento non risponde. Si può giocare lo stesso, in modalità dito.';
  }
}
async function testMic() {
  el.testMic.disabled = true;
  const ok = await Mic.start();
  el.testMic.disabled = false;
  if (!ok) { toast('Il microfono non è disponibile qui.'); return; }
  el.micBlock.hidden = false; el.testMic.hidden = true; syncTestButtons();
  T.micT0 = now(); T.base = null; T.samples = [];
  if (P.phase !== 'test') P.phase = 'test';
  toast('Due secondi di silenzio per misurare la stanza, poi prova a parlare.');
}
function tickTest(t, dt) {
  const S = SENS[G.sens];
  const live = t - Motion.last < 1000;
  el.testMark.style.left = (S.Tf / S.T0 * 100).toFixed(1) + '%';
  if (live) {
    T.peak = Math.max(Motion.agit, T.peak * Math.exp(-dt / 0.9));
    const cls = T.peak < S.Tf ? '' : T.peak < S.T0 ? ' warn' : ' bad';
    setMeter(el.testFill, T.peak / S.T0, cls);
    el.testTilt.textContent = 'Inclinazione ' + Math.round(Motion.tilt) + '°';
    let msg;
    if (Motion.tilt > S.tilt) msg = 'Così è troppo inclinata: esploderebbe.';
    else if (T.peak < S.Tf * 0.5) msg = 'Ferma come una statua. Perfetto.';
    else if (T.peak < S.Tf) msg = 'Bene: reggeresti anche a fine turno.';
    else if (T.peak < S.T0) msg = 'A inizio turno regge, dopo mezzo minuto no.';
    else msg = 'Così esploderebbe subito.';
    if (msg !== T.label && t - T.labelAt > 400) { T.label = msg; T.labelAt = t; el.testFeedback.textContent = msg; }
  }
  if (Mic.on) {
    if (T.base == null) { T.samples.push(Mic.db); if (t - T.micT0 > 1800) T.base = clamp(percentile(T.samples.slice(5), 0.3), -90, -30); }
    else setMeter(el.micFill, Math.max(0, Mic.db - T.base) / S.dB);
  }
  P.vp = { tx: Motion.tx(), ty: Motion.ty(), danger: 0.15, live: live ? clamp(T.peak / S.T0, 0, 1.3) : 0.05 };
}

/* ================= avvio della partita ================= */
async function startGame() {
  if (G.names.length < 2) return;
  Snd.ensure(); blurActive();
  el.startBtn.disabled = true;
  let motion = false;
  if (!G.forceTouch) motion = await requestMotion();
  if (G.night) {
    const ok = await Mic.start();
    if (!ok) { G.night = false; switchSyncs.forEach(f => f()); Mic.stop(); toast('Il microfono non è disponibile: modalità notte spenta.'); }
  } else Mic.stop();
  if (!motion && !G.forceTouch) motion = await motionNotice();
  G.mode = motion ? 'motion' : 'touch';
  el.startBtn.disabled = false;
  savePrefs();
  newGame();
}
function motionNotice() {
  return new Promise(res => {
    el.modeMsg.textContent = 'Succede dentro alcune app e anteprime. Nessun problema: si gioca in modalità dito, con un dito dentro un cerchio che si sposta nella fiala.';
    el.ovMode.hidden = false;
    el.modeTouch.onclick = () => { el.ovMode.hidden = true; res(false); };
    el.modeRetry.onclick = async () => {
      el.modeRetry.disabled = true;
      const ok = await requestMotion();
      el.modeRetry.disabled = false;
      if (ok) { el.ovMode.hidden = true; res(true); }
      else el.modeMsg.textContent = 'Ancora niente: qui il sensore è bloccato. Giocate in modalità dito, oppure aprite il gioco direttamente nel browser del telefono.';
    };
    setTimeout(() => { try { el.modeTouch.focus(); } catch (e) {} }, 50);
  });
}
function measureSilence() {
  return new Promise(res => {
    el.ovSilence.hidden = false; setMeter(el.silFill, 0, '');
    const samples = [], t0 = now();
    const iv = setInterval(() => {
      samples.push(Mic.db);
      const k = (now() - t0) / 2200;
      setMeter(el.silFill, k, '');
      if (k >= 1) {
        clearInterval(iv); el.ovSilence.hidden = true;
        G.noiseBase = clamp(percentile(samples.slice(6), 0.3), -90, -30);
        res();
      }
    }, 50);
  });
}
function newGame() {
  G.players = G.names.map(n => ({ name: n, score: 0, booms: 0, banks: 0, turns: 0, best: 0, bestBank: 0, hold: 0 }));
  G.round = 1; G.played = new Set(); G.active = true; G.noiseBase = null;
  initDecks();
  const first = Math.floor(Math.random() * G.players.length);
  keepAwake();
  const go = () => showTurn(first, 'Ha deciso il caso: si comincia da qui.');
  if (G.night && Mic.on) measureSilence().then(go); else go();
}
function rematch() { G.names = G.players.map(p => p.name); newGame(); }

/* ================= turno ================= */
function showTurn(idx, note) {
  G.cur = idx;
  const p = G.players[idx];
  el.turnRound.textContent = 'Giro ' + G.round + ' di ' + G.rounds;
  el.turnName.textContent = p.name;
  el.turnNote.textContent = note || ''; el.turnNote.hidden = !note;
  el.turnInstr.textContent = G.mode === 'motion'
    ? 'Tocca il pulsante, poi appoggia il telefono in piano sul palmo aperto, a faccia in su. Il pubblico prepari le sue facce migliori.'
    : 'Tocca il pulsante e appoggia un dito dentro il cerchio della fiala. Il pubblico prepari le sue facce migliori.';
  el.turnScore.textContent = p.turns ? 'Finora: ' + pts(p.score) + '.' : '';
  show('turn');
}
function setPlayLayout(mode) {
  el.ticket.hidden = mode !== 'armed';
  el.calibCard.hidden = mode !== 'calib';
  el.transitCard.hidden = mode !== 'transit';
  el.bankBtn.hidden = mode === 'transit';
  el.takeBtn.hidden = mode !== 'transit';
  if (mode === 'calib') { el.bankBtn.disabled = true; el.bankBtn.textContent = 'Incassa'; }
  el.comp.hidden = true; el.compWait.hidden = false; el.compWait.textContent = '';
  el.meterBlock.classList.remove('blind'); el.playVessel.classList.remove('blind');
  el.vignette.style.opacity = '0'; el.playVessel.style.transform = '';
  setHint(''); setMeter(el.meterFill, 0); el.clock.textContent = '';
  el.playName.textContent = G.players[G.cur] ? G.players[G.cur].name : '';
  el.playRound.textContent = 'Giro ' + G.round + ' di ' + G.rounds;
  resetAbort();
}
function resetAbort() {
  el.abortBtn.dataset.sure = '';
  el.abortBtn.textContent = 'Annulla';
  P.holdLift = false;
}
function bindAbort() {
  let timer = 0;
  el.abortBtn.addEventListener('pointerdown', () => {
    const t = now(); P.lastUI = t; P.grace = Math.max(P.grace || 0, t + 2800);
    P.holdLift = true;
    clearLiftTimer();
  });
  el.abortBtn.addEventListener('click', () => {
    if (P.phase !== 'calib' && P.phase !== 'armed' && P.phase !== 'transit') return;
    if (el.abortBtn.dataset.sure === '1') {
      clearTimeout(timer);
      const transit = P.phase === 'transit';
      resetAbort();
      endHold();
      showTurn(G.cur, transit ? 'Consegna annullata. Il turno ricomincia da capo.' : 'Turno annullato.');
      return;
    }
    el.abortBtn.dataset.sure = '1';
    el.abortBtn.textContent = 'Tocca ancora';
    timer = setTimeout(resetAbort, 2500);
  });
}
function calibTarget() { const g = V.play.geom(); return { x: g.cx, y: g.cy, r: g.R * 0.34 }; }
function startCalib(idx) {
  G.cur = idx; Snd.ensure(); keepAwake(); blurActive();
  show('play'); setPlayLayout('calib');
  el.calibText.textContent = G.mode === 'motion'
    ? 'Appoggia il telefono in piano sul palmo aperto, a faccia in su, e non muoverti.'
    : 'Appoggia un dito dentro il cerchio e tienilo lì.';
  setReadout('3', 'in posizione');
  P.phase = 'calib'; P.calibOk = 0; P.calibSamples = []; P.micSamples = [];
  P.held = 0; P.loot = 0; P.r = 0; P.cause = ''; P.touch.id = null;
  P.vp = { danger: 0, live: 0.05 };
}
function tickCalib(t, dt) {
  const S = SENS[G.sens];
  if (G.mode === 'motion') {
    if (t - Motion.last > 1500) { setHint('Il sensore non risponde…'); P.calibOk = 0; return; }
    const flat = Motion.tilt < 22, steady = Motion.agit < Math.max(1.4, S.T0 * 0.6);
    if (flat && steady) { P.calibOk += dt; P.calibSamples.push(Motion.agit); }
    else P.calibOk = Math.max(0, P.calibOk - dt * 2);
    setHint(!flat ? 'Mettila in piano, a faccia in su.' : !steady ? 'Ferma la mano, respira.' : '');
    setMeter(el.meterFill, Motion.agit / S.T0);
    P.vp = { tx: Motion.tx(), ty: Motion.ty(), danger: 0, live: clamp(Motion.agit / S.T0, 0, 1) };
  } else {
    const tg = calibTarget();
    const inside = P.touch.id != null && Math.hypot(P.touch.x - tg.x, P.touch.y - tg.y) <= tg.r;
    P.calibOk = inside ? P.calibOk + dt : 0;
    setHint(inside ? '' : 'Dito dentro il cerchio.');
    P.vp = { danger: 0, live: 0.04, target: tg, touching: inside, finger: P.touch.id != null ? { x: P.touch.x, y: P.touch.y } : null };
  }
  if (G.night && Mic.on) P.micSamples.push(Mic.db);
  setReadout(String(Math.max(1, Math.ceil(3 - P.calibOk))), 'in posizione');
  if (P.calibOk >= 3) arm(t);
}
function arm(t) {
  const S = SENS[G.sens];
  let nf = 0;
  if (G.mode === 'motion' && P.calibSamples.length > 10) {
    const arr = P.calibSamples.slice(Math.floor(P.calibSamples.length * 0.4));
    const m = arr.reduce((a, b) => a + b, 0) / arr.length;
    const sd = Math.sqrt(arr.reduce((a, b) => a + (b - m) * (b - m), 0) / arr.length);
    nf = m + 3 * sd;
  }
  P.T0 = Math.max(S.T0, nf * 4); P.Tf = Math.max(S.Tf, nf * 2.2);
  if (G.night && Mic.on && P.micSamples.length > 10) {
    const base = percentile(P.micSamples, 0.25);
    G.noiseBase = clamp(G.noiseBase == null ? base : Math.min(G.noiseBase, base), -90, -30);
  }
  P.phase = 'armed'; P.held = 0; P.loot = 0; P.r = 0; P.cause = ''; P.mult = 1; P.compNext = COMP_EVERY;
  P.fx = { blind: false, hot: false, calmUntil: 0 }; P.exceedAt = 0; P.grace = t + 300; P.changeUsed = false;
  P.beatNext = t; P.shownLoot = -1; P.shownBank = -1; P.wander = 0;
  P.ph = [Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28];
  setPlayLayout('armed');
  el.changeBtn.disabled = false;
  el.meterLabel.textContent = 'Pericolo';
  setReadout('0', 'punti in gioco');
  newChallenge();
  Snd.hissOn();
}
function newChallenge() {
  const three = G.players.length >= 3;
  const tpl = drawFrom(G.decks.sfide, s => (three || s.indexOf('{Y}') < 0) && !(G.night && isLoud(s)));
  renderText(el.challenge, cleanText(tpl), namesFor(G.cur));
  fitPlayTexts();
}
function changeChallenge() {
  if (P.phase !== 'armed' || P.changeUsed) return;
  const t = now(); P.lastUI = t; P.grace = t + 650; P.changeUsed = true;
  el.changeBtn.disabled = true;
  newChallenge();
}
function newComplication() {
  const c = drawFrom(G.decks.comp, x => !(x.noisy && G.night) && !(x.motion && G.mode !== 'motion'));
  renderText(el.compText, c.t, namesFor(G.cur));
  el.comp.hidden = false; el.compWait.hidden = true;
  el.comp.classList.remove('pulse'); void el.comp.offsetWidth; el.comp.classList.add('pulse');
  fitPlayTexts();
  const t = now();
  if (c.fx === 'double') P.mult *= 2;
  else if (c.fx === 'hot') { P.fx.hot = true; P.mult *= 1.5; }
  else if (c.fx === 'calm') P.fx.calmUntil = t + 6000;
  else if (c.fx === 'blind') { P.fx.blind = true; el.playVessel.classList.add('blind'); }
  Snd.ding();
}
function checkBoom(t, r) {
  if (r >= 1 && t > P.grace && t - P.lastUI > 220) {
    if (!P.exceedAt) P.exceedAt = t;
    else if (t - P.exceedAt >= 70) return true;
  } else if (r < 0.97) P.exceedAt = 0;
  return false;
}
function tickArmed(t, dt) {
  const S = SENS[G.sens];
  P.held += dt;
  P.loot += (1 + P.held / 5) * P.mult * dt;
  const d = 1 - Math.exp(-P.held / TAU);
  let r, cause;
  if (G.mode === 'motion') {
    if (t - Motion.last > 1500) { voidTurn('Il sensore di movimento si è interrotto: si rifà il turno.'); return; }
    let thr = P.Tf + (P.T0 - P.Tf) * Math.exp(-P.held / TAU);
    if (P.fx.hot) thr *= 0.85;
    if (t < P.fx.calmUntil) thr *= 1.45;
    const shake = Motion.agit / thr, spill = clamp((Motion.tilt - (S.tilt - 22)) / 22, 0, 2);
    r = shake; cause = 'shake';
    if (spill > r) { r = spill; cause = 'tilt'; }
    P.vp = { tx: Motion.tx(), ty: Motion.ty(), danger: d, live: clamp(shake, 0, 1.3), blind: P.fx.blind };
  } else {
    const calm = t < P.fx.calmUntil;
    if (!calm) P.wander += dt * (P.fx.hot ? 1.4 : 1) * S.touchSpeed;
    const g = V.play.geom();
    let W = g.R * (0.06 + 0.36 * d) * S.touchReach, rr = g.R * (0.34 - 0.2 * d) * S.touchSize;
    if (P.fx.hot) { W *= 1.2; rr *= 0.85; }
    if (calm) rr *= 1.3;
    const s = P.wander, ph = P.ph;
    const tg = {
      x: g.cx + W * (0.62 * Math.sin(s * 0.71 + ph[0]) + 0.38 * Math.sin(s * 1.63 + ph[1])),
      y: g.cy + W * (0.62 * Math.sin(s * 0.83 + ph[2]) + 0.38 * Math.sin(s * 1.37 + ph[3])),
      r: rr
    };
    const touching = P.touch.id != null;
    const ratio = touching ? Math.hypot(P.touch.x - tg.x, P.touch.y - tg.y) / rr : 2;
    r = ratio; cause = 'slip';
    P.vp = { danger: d, live: clamp(ratio * 0.8, 0, 1.3), blind: P.fx.blind, target: tg, touching: touching, finger: touching ? { x: P.touch.x, y: P.touch.y } : null };
  }
  if (G.night && Mic.on && G.noiseBase != null) {
    const nr = Math.max(0, Mic.db - G.noiseBase) / S.dB;
    if (nr > r) { r = nr; cause = 'noise'; }
  }
  P.r = r; P.cause = cause;
  if (checkBoom(t, r)) { boom(cause); return; }
  if (P.held >= P.compNext) { P.compNext += COMP_EVERY; newComplication(); }
  updateHud(r, cause);
  if (Snd.can() && !G.night) {
    const inten = Math.max(d, Math.min(1, r));
    if (t >= P.beatNext) { Snd.beat(inten); P.beatNext = t + 60000 / (58 + 112 * inten); }
    Snd.hiss(P.fx.blind ? 0 : smooth(0.35, 1, r));
  }
}
function updateHud(r, cause) {
  const loot = Math.floor(P.loot);
  if (loot !== P.shownLoot) { P.shownLoot = loot; setReadout(String(loot), 'punti in gioco'); }
  el.clock.textContent = fmtSec(P.held);
  if (el.comp.hidden) {
    const w = 'Prima complicazione tra ' + Math.max(1, Math.ceil(P.compNext - P.held)) + ' s';
    if (el.compWait.textContent !== w) el.compWait.textContent = w;
  }
  const blind = P.fx.blind;
  if (blind !== el.meterBlock.classList.contains('blind')) el.meterBlock.classList.toggle('blind', blind);
  setMeter(el.meterFill, blind ? 0 : r);
  setHint(!blind && r > 0.6 ? HINT[cause] : '');
  el.vignette.style.opacity = blind ? '0' : smooth(0.55, 1, r).toFixed(3);
  if (!reduceMotion && !blind && r > 0.8) {
    const a = (r - 0.8) * 22;
    el.playVessel.style.transform = 'translate(' + ((Math.random() - 0.5) * a).toFixed(1) + 'px,' + ((Math.random() - 0.5) * a).toFixed(1) + 'px)';
  } else if (el.playVessel.style.transform) el.playVessel.style.transform = '';
  if (P.held < MIN_BANK) {
    const s = Math.ceil(MIN_BANK - P.held);
    if (s !== P.shownBank) { P.shownBank = s; el.bankBtn.disabled = true; el.bankBtn.textContent = 'Incassa tra ' + s; }
  } else if (P.shownBank !== 0) { P.shownBank = 0; el.bankBtn.disabled = false; el.bankBtn.textContent = 'Incassa'; }
}
function endHold() {
  P.phase = 'idle'; P.exceedAt = 0;
  clearLiftTimer();
  Snd.hissOff();
  el.vignette.style.opacity = '0'; el.playVessel.style.transform = '';
  if (P.touch.id != null) { try { el.cvPlay.releasePointerCapture(P.touch.id); } catch (e) {} P.touch.id = null; }
}
function voidTurn(msg) { endHold(); showTurn(G.cur, msg); }

function bank() {
  if (P.phase !== 'armed' || P.held < MIN_BANK) return;
  P.lastUI = now();
  const got = Math.floor(P.loot), held = P.held, p = G.players[G.cur];
  endHold();
  p.score += got; p.banks++; p.turns++; p.best = Math.max(p.best, held); p.bestBank = Math.max(p.bestBank, got); p.hold += held;
  G.played.add(G.cur);
  Snd.chime();
  showNext({ kind: 'bank', got: got, held: held });
}
function boom(cause) {
  const transit = P.phase === 'transit';
  const lost = Math.floor(P.loot), held = P.held, cur = G.cur;
  endHold();
  Snd.boom();
  try { if (navigator.vibrate) navigator.vibrate([90, 50, 240]); } catch (e) {}
  flash();
  if (transit) {
    const a = G.players[G.prev].name, b = G.players[cur].name;
    el.boomCause.textContent = 'Incidente in consegna. ' + (CAUSE_TRANSIT[cause] || '');
    el.boomLost.textContent = 'I punti sono salvi.';
    el.penHead.textContent = 'Penitenza di coppia per ' + a + ' e ' + b;
    renderText(el.penText, drawFrom(G.decks.penC), namesFor(cur));
    P.after = () => showTurn(cur);
  } else {
    const p = G.players[cur];
    p.booms++; p.turns++; p.best = Math.max(p.best, held); p.hold += held;
    G.played.add(cur);
    el.boomCause.textContent = CAUSE[cause] || '';
    el.boomLost.textContent = lost > 0 ? p.name + ' perde ' + pts(lost) + ' in gioco.' : p.name + ' non aveva ancora niente in gioco.';
    el.penHead.textContent = 'Penitenza per ' + p.name;
    renderText(el.penText, drawFrom(G.decks.pen), namesFor(cur));
    P.after = () => showNext({ kind: 'boom' });
  }
  el.boomQuip.textContent = pick(QUIP_BOOM);
  el.penance.hidden = !G.pen;
  el.boomNext.disabled = true;
  setTimeout(() => { el.boomNext.disabled = false; }, 900);
  show('boom');
  requestAnimationFrame(() => Boom.start(el.cvBoom));
}

/* ================= consegna ================= */
function showNext(info) {
  const p = G.players[G.cur];
  const rem = G.players.map((_, i) => i).filter(i => !G.played.has(i));
  el.nextHead.textContent = '';
  const add = (cls, txt) => { const n = document.createElement('p'); n.className = cls; n.textContent = txt; el.nextHead.appendChild(n); };
  if (info.kind === 'bank') {
    add('plus', '+' + info.got);
    add('next-quip', pick(QUIP_BANK));
    add('next-sub', p.name + ' ha resistito ' + fmtSec(info.held) + ' e ora ha ' + pts(p.score) + '.');
  } else {
    add('next-sub', p.name + ' resta a ' + pts(p.score) + '.');
  }
  el.pickList.textContent = '';
  if (!rem.length) {
    el.nextQ.textContent = G.round >= G.rounds ? 'Ultimo giro finito' : 'Fine del giro ' + G.round;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn primary big wide'; b.textContent = 'Vedi la classifica';
    b.addEventListener('click', roundEnd);
    el.pickList.appendChild(b);
    el.nextNote.textContent = '';
  } else {
    el.nextQ.textContent = 'A chi passi la fiala?';
    rem.forEach(i => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn wide'; b.textContent = G.players[i].name;
      b.addEventListener('click', () => handoff(G.cur, i));
      el.pickList.appendChild(b);
    });
    el.nextNote.textContent = G.mode === 'motion'
      ? 'La fiala resta accesa anche nel passaggio: consegnala palmo a palmo, con calma.'
      : 'Passa il telefono a chi hai scelto.';
  }
  show('next');
}
function handoff(from, to) {
  G.prev = from; G.cur = to;
  if (G.mode === 'motion') startTransit(); else showTurn(to);
}
function startTransit() {
  const a = G.players[G.prev].name, b = G.players[G.cur].name;
  show('play'); setPlayLayout('transit');
  el.playName.textContent = a + ' → ' + b;
  el.transitTitle.textContent = 'Consegna a ' + b;
  el.transitText.textContent = a + ', tienila in piano. ' + b + ', allunga il palmo aperto e tocca «Presa» quando ce l’hai.';
  el.meterLabel.textContent = 'Pericolo';
  setReadout('', 'in consegna');
  const t = now();
  P.phase = 'transit'; P.live = false; P.prepOk = 0; P.exceedAt = 0; P.loot = 0; P.held = 0; P.r = 0; P.cause = ''; P.lastUI = t; P.grace = t + 400;
  P.vp = { danger: 0.2, live: 0.05 };
  Snd.hissOn();
}
function tickTransit(t, dt) {
  const S = SENS[G.sens];
  if (t - Motion.last > 1500) { voidTurn('Il sensore di movimento si è interrotto durante la consegna.'); return; }
  if (!P.live) {
    const ok = Motion.tilt < 25 && Motion.agit < S.transit * 0.6;
    P.prepOk = ok ? P.prepOk + dt : 0;
    setHint(ok ? '' : 'Prima mettila in piano.');
    setMeter(el.meterFill, 0);
    P.vp = { tx: Motion.tx(), ty: Motion.ty(), danger: 0.2, live: clamp(Motion.agit / S.transit, 0, 1) };
    if (P.prepOk >= 0.6) { P.live = true; P.grace = t + 150; setHint(''); }
    return;
  }
  const shake = Motion.agit / S.transit, spill = clamp((Motion.tilt - (S.tilt - 12)) / 22, 0, 2);
  let r = shake, cause = 'shake';
  if (spill > r) { r = spill; cause = 'tilt'; }
  if (G.night && Mic.on && G.noiseBase != null) {
    const nr = Math.max(0, Mic.db - G.noiseBase) / (S.dB + 4);
    if (nr > r) { r = nr; cause = 'noise'; }
  }
  P.r = r; P.cause = cause;
  if (checkBoom(t, r)) { boom(cause); return; }
  setMeter(el.meterFill, r);
  setHint(r > 0.6 ? HINT[cause] : '');
  el.vignette.style.opacity = smooth(0.55, 1, r).toFixed(3);
  P.vp = { tx: Motion.tx(), ty: Motion.ty(), danger: 0.25, live: clamp(shake, 0, 1.3) };
  Snd.hiss(smooth(0.35, 1, r));
}
function take() {
  if (P.phase !== 'transit') return;
  P.lastUI = now();
  endHold();
  startCalib(G.cur);
}

/* ================= classifica e finale ================= */
function ranking() { return G.players.slice().sort((a, b) => b.score - a.score || a.booms - b.booms); }
function renderBoard(ol, list) {
  ol.textContent = '';
  const top = list.length ? list[0].score : 0;
  list.forEach(p => {
    const li = document.createElement('li');
    if (p.score === top && top > 0) li.className = 'first';
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = p.name;
    const bm = document.createElement('span'); bm.className = 'bm'; bm.textContent = p.booms ? (p.booms === 1 ? '1 esplosione' : p.booms + ' esplosioni') : '';
    const sc = document.createElement('span'); sc.className = 'sc'; sc.textContent = p.score;
    li.appendChild(nm); li.appendChild(bm); li.appendChild(sc); ol.appendChild(li);
  });
}
function roundEnd() {
  if (G.round >= G.rounds) { showFinal(); return; }
  el.roundTitle.textContent = 'Fine del giro ' + G.round;
  renderBoard(el.roundBoard, ranking());
  const min = Math.min.apply(null, G.players.map(p => p.score));
  const lows = G.players.map((_, i) => i).filter(i => G.players[i].score === min);
  const starter = pick(lows);
  const nextR = G.round + 1, who = G.players[starter].name;
  el.roundNote.textContent = lows.length === G.players.length
    ? 'Siete tutti pari. Il giro ' + nextR + ' lo comincia ' + who + ', estratto a sorte.'
    : lows.length > 1
      ? 'Il giro ' + nextR + ' lo comincia ' + who + ', a pari merito tra chi è più indietro.'
      : 'Il giro ' + nextR + ' lo comincia ' + who + ', che è più indietro in classifica.';
  el.roundGo.textContent = 'Inizia il giro ' + (G.round + 1);
  el.roundGo.onclick = () => { G.round++; G.played = new Set(); showTurn(starter); };
  show('round');
}
function awards() {
  const ps = G.players, L = [];
  const nm = arr => listNames(arr.map(p => p.name));
  const maxB = Math.max.apply(null, ps.map(p => p.booms));
  if (maxB > 0) L.push(['Il Terremoto', nm(ps.filter(p => p.booms === maxB)) + ', ' + (maxB === 1 ? '1 esplosione' : maxB + ' esplosioni')]);
  const best = Math.max.apply(null, ps.map(p => p.best));
  if (best >= 3) L.push(['Cuore di ghiaccio', nm(ps.filter(p => p.best === best)) + ', ' + fmtSec(best) + ' con la fiala in mano']);
  const bb = Math.max.apply(null, ps.map(p => p.bestBank));
  if (bb > 0) L.push(['Il colpo grosso', nm(ps.filter(p => p.bestBank === bb)) + ', ' + pts(bb) + ' in un solo turno']);
  const clean = ps.filter(p => p.booms === 0 && p.turns > 0);
  if (clean.length && clean.length < ps.length) L.push(['Artificiere impeccabile', nm(clean) + ', nessuna esplosione']);
  return L;
}
function showFinal() {
  const list = ranking(), top = list[0].score, winners = list.filter(p => p.score === top);
  el.finalKicker.textContent = winners.length > 1 ? 'Pari merito' : 'Ha vinto';
  el.finalWinner.textContent = listNames(winners.map(p => p.name));
  el.finalScore.textContent = pts(top) + (winners.length > 1 ? ' a testa' : '');
  renderBoard(el.finalBoard, list);
  el.finalAwards.textContent = '';
  awards().forEach(a => {
    const d = document.createElement('div'); d.className = 'award';
    const b = document.createElement('b'); b.textContent = a[0];
    const s = document.createElement('span'); s.textContent = a[1];
    d.appendChild(b); d.appendChild(s); el.finalAwards.appendChild(d);
  });
  G.active = false; releaseWake(); Mic.stop();
  show('final');
}
function quitGame() { endHold(); G.active = false; Mic.stop(); releaseWake(); show('home'); }
function bindQuit(btn) {
  const label = btn.textContent; let timer = 0;
  btn.addEventListener('click', () => {
    if (btn.dataset.sure === '1') { clearTimeout(timer); btn.dataset.sure = ''; btn.textContent = label; quitGame(); return; }
    btn.dataset.sure = '1'; btn.textContent = 'Tocca di nuovo per uscire';
    timer = setTimeout(() => { btn.dataset.sure = ''; btn.textContent = label; }, 3000);
  });
}

/* ================= dito sul cerchio ================= */
let liftTimer = 0;
function clearLiftTimer() { if (liftTimer) { clearTimeout(liftTimer); liftTimer = 0; } }
function canvasPos(e) {
  const r = el.cvPlay.getBoundingClientRect(), d = V.play.dpr;
  return { x: (e.clientX - r.left) * d, y: (e.clientY - r.top) * d };
}
function onCanvasDown(e) {
  if (G.mode !== 'touch' || (P.phase !== 'calib' && P.phase !== 'armed') || P.touch.id != null) return;
  const pos = canvasPos(e);
  const tg = P.phase === 'armed' ? P.vp.target : calibTarget();
  if (!tg || Math.hypot(pos.x - tg.x, pos.y - tg.y) > tg.r * 1.15) return;
  e.preventDefault();
  P.touch.id = e.pointerId; P.touch.x = pos.x; P.touch.y = pos.y;
  try { el.cvPlay.setPointerCapture(e.pointerId); } catch (err) {}
}
function onCanvasMove(e) {
  if (e.pointerId !== P.touch.id) return;
  const pos = canvasPos(e); P.touch.x = pos.x; P.touch.y = pos.y;
}
function onCanvasUp(e) {
  if (e.pointerId !== P.touch.id) return;
  // Un secondo dito su «Incassa» può mandare pointercancel al primo.
  // Si aspetta un attimo: se nel frattempo si incassa, la banca vince sullo stacco.
  if (e.type === 'pointercancel' && P.phase === 'armed') {
    if (P.holdLift) return;
    const pid = P.touch.id, t = now();
    P.lastUI = t; P.grace = Math.max(P.grace || 0, t + 260);
    clearLiftTimer();
    liftTimer = setTimeout(() => {
      liftTimer = 0;
      if (P.phase === 'armed' && P.touch.id === pid && !P.holdLift) { P.touch.id = null; boom('lift'); }
    }, 200);
    return;
  }
  P.touch.id = null;
  if (P.phase === 'armed') boom('lift');
  else if (P.phase === 'calib') P.calibOk = 0;
}

/* ================= ciclo principale ================= */
function idleVP(t) { return { tx: 0.25 * Math.sin(t / 1500), ty: 0.2 * Math.cos(t / 1900), danger: 0.04, live: 0.05 + 0.04 * Math.sin(t / 800) }; }
let lastT = now();
function loop() {
  const t = now(), dt = clamp((t - lastT) / 1000, 0, 0.05); lastT = t;
  try {
    if (Mic.on) Mic.read(dt);
    if (P.phase === 'calib') tickCalib(t, dt);
    else if (P.phase === 'armed') tickArmed(t, dt);
    else if (P.phase === 'transit') tickTransit(t, dt);
    else if (P.phase === 'test') tickTest(t, dt);
    if (screen === 'home') V.home.draw(dt, idleVP(t));
    else if (screen === 'play') V.play.draw(dt, P.vp);
    else if (screen === 'test') V.test.draw(dt, P.phase === 'test' ? P.vp : idleVP(t));
    if (Boom.active) Boom.draw(dt);
  } catch (e) { if (window.console) console.error(e); }
  requestAnimationFrame(loop);
}

/* ================= collegamenti ================= */
function init() {
  loadPrefs(); refreshTheme();
  V.home = new Vessel(el.cvHome); V.play = new Vessel(el.cvPlay); V.test = new Vessel(el.cvTest);

  // un tocco iniziato prima di un cambio di schermata non deve premere niente nella schermata nuova
  document.addEventListener('pointerdown', () => { lastPD = now(); }, true);
  document.addEventListener('click', e => {
    if (e.detail > 0 && lastPD < lastSwap) { e.stopPropagation(); e.preventDefault(); }
  }, true);

  $$('[data-go]').forEach(b => b.addEventListener('click', () => {
    if (screen === 'test' && b.dataset.go !== 'test') leaveTest();
    else if (P.phase === 'test') P.phase = 'idle';
    if (b.dataset.go === 'setup') renderPlayers();
    show(b.dataset.go);
  }));
  el.addBtn.addEventListener('click', addName);
  el.nameIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addName(); } });
  bindRadio(el.levels, 'level');
  bindRadio(el.rounds, 'rounds', v => parseInt(v, 10));
  bindRadio(el.sens, 'sens');
  bindRadio(el.sensTest, 'sens');
  bindSwitches();
  el.startBtn.addEventListener('click', startGame);
  el.turnGo.addEventListener('click', () => startCalib(G.cur));
  el.bankBtn.addEventListener('pointerdown', e => { e.preventDefault(); bank(); });
  el.bankBtn.addEventListener('click', bank);
  el.takeBtn.addEventListener('pointerdown', e => { e.preventDefault(); take(); });
  el.takeBtn.addEventListener('click', take);
  el.changeBtn.addEventListener('pointerdown', e => { e.preventDefault(); changeChallenge(); });
  el.changeBtn.addEventListener('click', changeChallenge);
  el.boomNext.addEventListener('click', () => { const f = P.after; P.after = null; if (f) f(); });
  el.againBtn.addEventListener('click', rematch);
  el.setupBtn.addEventListener('click', () => { G.names = G.players.map(p => p.name); renderPlayers(); show('setup'); });
  el.menuBtn.addEventListener('click', () => { releaseMicIfIdle(); show('home'); });
  bindQuit(el.quit1); bindQuit(el.quit2);
  bindAbort();
  el.testOn.addEventListener('click', testSensor);
  el.testMic.addEventListener('click', testMic);
  el.cvPlay.addEventListener('pointerdown', onCanvasDown);
  el.cvPlay.addEventListener('pointermove', onCanvasMove);
  el.cvPlay.addEventListener('pointerup', onCanvasUp);
  el.cvPlay.addEventListener('pointercancel', onCanvasUp);
  el.cvPlay.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('keydown', e => {
    if (screen !== 'play') return;
    if (e.key === ' ' || e.key === 'Enter') {
      if (P.phase === 'armed') { e.preventDefault(); bank(); }
      else if (P.phase === 'transit') { e.preventDefault(); take(); }
    } else if (e.key === 'c' || e.key === 'C') changeChallenge();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if ((P.phase === 'armed' || P.phase === 'transit') && P.r >= 0.7) boom(P.cause || 'shake');
      else if (P.phase === 'armed' || P.phase === 'calib' || P.phase === 'transit') voidTurn('Il telefono è andato in pausa: si rifà il turno da capo.');
    } else if (G.active) keepAwake();
  });
  window.addEventListener('resize', () => requestAnimationFrame(resizeAll));
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(() => resizeAll());
    [el.homeVessel, el.playVessel, el.testVessel].forEach(n => ro.observe(n));
  }

  renderPlayers();
  show('home');
  requestAnimationFrame(loop);
  if (/[?&]debug\b/.test(location.search)) window.__fs = { P: P, G: G, V: V, Motion: Motion };
  // gioco installabile e disponibile anche senza rete, quando è online su un indirizzo suo (es. GitHub Pages)
  const web = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (web && 'serviceWorker' in navigator && window.self === window.top) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
}
init();
})();
