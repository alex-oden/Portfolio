/* ============================================================
   ALODEN — INTERACTIVE WAVE BACKGROUND
   A subtle grid of warm dots that ripple as a wave field and
   gently react to the mouse. Dependency-free vanilla canvas.

   Usage:
     <script>window.WAVE_BG_CONFIG = { intensity: 0.55 };</script>
     <script src="assets/js/wave-bg.js" defer></script>

   It auto-creates a fixed, full-viewport canvas behind your
   content (pointer-events:none, so it never blocks clicks),
   respects prefers-reduced-motion, and pauses when the tab is
   hidden. Tune live via window.WaveBG.setConfig({ ... }).
   ============================================================ */

(function () {
  'use strict';

  /* ---------- DEFAULT CONFIG (all overridable) ---------- */
  var CONFIG = {
    spacing: 30,        // px between dots (smaller = denser = heavier)
    dotSize: 1.7,       // base dot radius in px
    intensity: 0.4,     // overall brightness / presence (0–1)
    speed: 0.55,        // wave animation speed
    waveAmp: 11,        // vertical undulation of the dot surface (px)
    mouseReach: 200,    // radius of mouse influence (px)
    mouseStrength: 0.58,// how much the cursor swells/brightens the wave crest
    parallax: 14,       // whole-field drift toward the cursor (px)
    zIndex: 0,          // stacking; keep below content (.wrap is z-index:1)
    maxDPR: 2,          // cap device-pixel-ratio for performance
    // Warm color ramp (trough → mid → peak), tuned to the Aloden brand.
    colorLow:  [70, 20, 24],    // dim maroon (valleys)
    colorMid:  [205, 70, 28],   // #FF5722-ish red-orange
    colorHigh: [255, 156, 84]   // #FF8A3D / #FFB366 glow (peaks)
  };

  // Merge any pre-set page config.
  if (window.WAVE_BG_CONFIG) {
    for (var k in window.WAVE_BG_CONFIG) {
      if (Object.prototype.hasOwnProperty.call(window.WAVE_BG_CONFIG, k)) {
        CONFIG[k] = window.WAVE_BG_CONFIG[k];
      }
    }
  }

  /* ---------- STATE ---------- */
  var canvas, ctx;
  var W = 0, H = 0, DPR = 1;
  var cols = 0, rows = 0;
  var rafId = null;
  var startT = 0;
  var reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Pointer (smoothed). Start off-screen so there's no initial bump.
  var mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: 0 };

  /* ---------- SETUP ---------- */
  function build() {
    canvas = document.createElement('canvas');
    canvas.id = 'wave-bg-canvas';
    canvas.setAttribute('aria-hidden', 'true');   // decorative: hide from AT / crawlers
    canvas.setAttribute('role', 'presentation');
    var s = canvas.style;
    s.position = 'fixed';
    s.top = '0';
    s.left = '0';
    s.width = '100%';
    s.height = '100%';
    s.zIndex = String(CONFIG.zIndex);
    s.pointerEvents = 'none';
    s.display = 'block';
    ctx = canvas.getContext('2d', { alpha: true });
    document.body.insertBefore(canvas, document.body.firstChild);
    resize();
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, CONFIG.maxDPR);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    // One extra row/col so the grid bleeds past every edge.
    cols = Math.ceil(W / CONFIG.spacing) + 2;
    rows = Math.ceil(H / CONFIG.spacing) + 2;
    if (reduced) draw(0); // static single frame
  }

  /* ---------- COLOR HELPERS ---------- */
  function mix(a, b, t) {
    return [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t
    ];
  }

  /* ---------- RENDER ---------- */
  function draw(elapsed) {
    var t = elapsed * 0.001 * CONFIG.speed;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter'; // bright clusters bloom

    // Smooth the pointer toward its target; fade influence when idle.
    mouse.x += (mouse.tx - mouse.x) * 0.12;
    mouse.y += (mouse.ty - mouse.y) * 0.12;
    var infW = mouse.active; // 0..1 master weight for all mouse effects

    var sp = CONFIG.spacing;
    var amp = CONFIG.waveAmp;
    var reach = CONFIG.mouseReach;
    var reach2 = 2 * reach * reach;
    var px = (mouse.x - W / 2) / W; // -0.5..0.5 for parallax
    var py = (mouse.y - H / 2) / H;
    var shiftX = -px * CONFIG.parallax * infW;
    var shiftY = -py * CONFIG.parallax * infW;

    var cLow = CONFIG.colorLow, cMid = CONFIG.colorMid, cHigh = CONFIG.colorHigh;
    var intensity = CONFIG.intensity;

    for (var gy = 0; gy < rows; gy++) {
      var baseY = gy * sp - sp;
      var b = baseY * 0.012;
      for (var gx = 0; gx < cols; gx++) {
        var baseX = gx * sp - sp;
        var a = baseX * 0.012;

        // Layered sine field → organic, non-repeating-looking wave.
        var h = Math.sin(a + t) +
                Math.sin(b * 1.3 + t * 0.7) +
                Math.sin((a + b) * 0.7 - t * 0.85);
        h = h / 3;                 // -1..1
        var hn = h * 0.5 + 0.5;    // 0..1

        var infl = 0;
        if (infW > 0.001) {
          var ddx = baseX - mouse.x;
          var ddy = baseY - mouse.y;
          var d2 = ddx * ddx + ddy * ddy;
          infl = Math.exp(-d2 / reach2) * infW;
          if (infl > 0.002) {
            // Smooth swell: the cursor gently raises and brightens the wave
            // crest beneath it. No radial push, so dots never scatter/bounce.
            hn += infl * CONFIG.mouseStrength;
          }
        }
        if (hn > 1) hn = 1; else if (hn < 0) hn = 0;

        // Screen position: undulating surface crest + subtle parallax drift.
        var sx = baseX + shiftX;
        var sy = baseY + (hn - 0.5) * amp + shiftY;

        // Color & alpha from height (valleys faint, peaks glow).
        var col = hn < 0.5
          ? mix(cLow, cMid, hn * 2)
          : mix(cMid, cHigh, (hn - 0.5) * 2);
        var alpha = intensity * (0.10 + 0.90 * Math.pow(hn, 1.6));
        if (infl > 0.002) alpha = Math.min(1, alpha + infl * 0.15);

        var r = CONFIG.dotSize * (0.75 + hn * 0.7);

        ctx.fillStyle = 'rgba(' + (col[0] | 0) + ',' + (col[1] | 0) + ',' +
                        (col[2] | 0) + ',' + alpha.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, 6.283185307179586);
        ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function loop(now) {
    if (!startT) startT = now;
    draw(now - startT);
    rafId = requestAnimationFrame(loop);
  }

  /* ---------- POINTER ---------- */
  function onMove(e) {
    mouse.tx = e.clientX;
    mouse.ty = e.clientY;
    if (mouse.x < -9000) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
    mouse.active = 1;
  }
  function onLeave() { mouse.active = 0; }

  /* ---------- LIFECYCLE ---------- */
  function start() {
    if (rafId || reduced) return;
    startT = 0;
    rafId = requestAnimationFrame(loop);
  }
  function stop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  function init() {
    build();
    window.addEventListener('resize', resize, { passive: true });

    if (!reduced) {
      window.addEventListener('mousemove', onMove, { passive: true });
      window.addEventListener('mouseout', onLeave, { passive: true });
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) stop(); else start();
      });
      start();
    }
  }

  /* ---------- PUBLIC API (for live tuning) ---------- */
  window.WaveBG = {
    setConfig: function (partial) {
      for (var key in partial) {
        if (Object.prototype.hasOwnProperty.call(partial, key)) {
          CONFIG[key] = partial[key];
        }
      }
      if (canvas) resize();
    },
    getConfig: function () { return JSON.parse(JSON.stringify(CONFIG)); },
    start: start,
    stop: stop
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
