/* Aerovation / ARES: Hero Animation Engine
   Supports 5 distinct visual modes:
   - 'original': Front turbofan with electrostatic particle deflection.
   - 'cross-section': Technical nacelle cross-section showing airflow streamlines & bypass catch zones.
   - 'shield-toggle': Interactive before/after toggle comparing standard engine ingestion vs ARES deflection.
   - 'wireframe-3d': Isometric rotating 3D CAD wireframe engine with phased-array radar sweeps.
   - 'particle-cloud': High-density micro-physics sandbox with mouse electrostatic repulsion.
*/
(function () {
  "use strict";

  var canvas = document.getElementById("hero-canvas");
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext("2d");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var w = 0, h = 0, dpr = 1;
  var currentMode = "original";
  var particles = [];
  var engine = { x: 0, y: 0, r: 0 };
  var mouse = { x: -999, y: -999, active: false };
  var colors = {};
  var angle = 0, t = 0;
  var raf = 0, running = false, inView = true;

  // Mode 2 specific state: Shield Toggle
  var shieldActive = true;
  var shieldTimer = 0;
  var coreErosionLevel = 0;

  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    function rgb(name) {
      return cs.getPropertyValue(name).trim().split(/\s+/).map(Number);
    }
    colors = {
      bg: rgb("--bg-rgb"),
      dust: rgb("--dust-rgb"),
      charge: rgb("--charge-rgb"),
      engine: rgb("--engine-rgb"),
      accent: rgb("--accent-rgb")
    };
  }

  function rgba(c, a) {
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
  }

  function initParticlesForMode(mode) {
    particles = [];
    var count = 220;
    if (mode === "particle-cloud") count = Math.round(Math.min(750, (w * h) / 1600));
    else if (mode === "cross-section") count = Math.round(Math.min(260, (w * h) / 4500));
    else if (mode === "wireframe-3d") count = Math.round(Math.min(180, (w * h) / 6000));
    else count = Math.round(Math.min(320, Math.max(120, (w * h) / 4200)));

    for (var i = 0; i < count; i++) {
      particles.push(createParticle(true, mode));
    }
  }

  function createParticle(anywhere, mode) {
    var z = 0.3 + Math.random() * 0.7;
    var x = anywhere ? Math.random() * w : -20 - Math.random() * 80;
    var y = Math.random() * h;

    if (mode === "cross-section") {
      // Inflow focused around the intake height
      y = engine.y + (Math.random() - 0.5) * (engine.r * 2.2);
    }

    return {
      x: x,
      y: y,
      px: x,
      py: y,
      vx: 0.8 + z * 1.6,
      vy: 0,
      z: z,
      c: 0, // charge factor: 0 (neutral) to 1 (charged)
      seed: Math.random() * 6.28,
      size: 0.6 + z * 1.5,
      captured: false
    };
  }

  function layout() {
    var rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var m = Math.min(w, h);
    var contentEl = document.querySelector(".hero-content");
    var contentRight = 0;
    if (contentEl) {
      var cRect = contentEl.getBoundingClientRect();
      contentRight = cRect.right - rect.left;
    }

    if (w >= 1024) {
      // Desktop: Keep engine safely in the right 45% of the screen
      var minX = contentRight > 0 ? contentRight + 70 : w * 0.58;
      engine.x = Math.max(minX + 90, w * 0.77);
      engine.y = h * 0.48;
      var availWidth = w - engine.x;
      engine.r = Math.min(m * 0.17, availWidth * 0.75, 170);
    } else if (w >= 768) {
      // Tablet: Moderate size engine placed to the right of text
      var minTabX = contentRight > 0 ? contentRight + 45 : w * 0.6;
      engine.x = Math.max(minTabX + 70, w * 0.79);
      engine.y = h * 0.44;
      var availTabWidth = w - engine.x;
      engine.r = Math.min(m * 0.14, availTabWidth * 0.72, 125);
    } else {
      // Mobile (< 768px): Place engine in top-right quadrant well above text
      engine.x = w * 0.75;
      engine.y = Math.min(160, Math.max(90, h * 0.2));
      engine.r = Math.min(60, w * 0.17, (w - engine.x) * 0.85);
    }

    initParticlesForMode(currentMode);
  }

  /* =========================================================================
     MODE 0: Original Front Fan Deflection
     ========================================================================= */
  function stepOriginal() {
    var R = engine.r, field = R * 1.75, suction = R * 4.2;
    t++;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.px = p.x; p.py = p.y;

      var base = 0.55 + p.z * 1.5;
      var ax = (base - p.vx) * 0.04;
      var ay = (Math.sin(p.x * 0.005 + t * 0.012 + p.seed) * 0.3 - p.vy) * 0.04;

      var dx = p.x - engine.x, dy = p.y - engine.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = dx / d, ny = dy / d;

      if (d < suction && p.c < 0.5) {
        var s = 0.07 * (1 - d / suction);
        ax -= nx * s; ay -= ny * s;
      }

      if (d < field) p.c = Math.min(1, p.c + 0.09);
      else p.c = Math.max(0, p.c - 0.0035);

      if (p.c > 0) {
        var f = p.c * 0.85 * (R * R) / (d * d);
        ax += nx * f;
        ay += ny * f + (ny >= 0 ? 1 : -1) * f * 0.5;
      }

      // Soft aerodynamic boundary collider with depth layering
      var boundary = R * 1.08;
      if (d < boundary) {
        var overlap = (boundary - d) / boundary;
        ax += nx * overlap * 2.2 + (-ny) * overlap * 1.2;
        ay += ny * overlap * 2.2 + (nx) * overlap * 1.2;
        p.vx *= 0.88;
        p.vy *= 0.88;
      }

      p.vx += ax; p.vy += ay;
      var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (sp > 6) { p.vx *= 6 / sp; p.vy *= 6 / sp; }
      p.x += p.vx; p.y += p.vy;

      if (p.x > w + 30 || p.y < -40 || p.y > h + 40) {
        particles[i] = createParticle(false, "original");
      }
    }
  }

  function drawFan(x, y, R, customAngle, glowColor) {
    var e = colors.engine;

    // Ambient glow
    var g = ctx.createRadialGradient(x, y, R * 0.5, x, y, R * 2.8);
    g.addColorStop(0, rgba(glowColor || colors.accent, 0.2));
    g.addColorStop(1, rgba(glowColor || colors.accent, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, R * 2.8, 0, Math.PI * 2); ctx.fill();

    // Intake cowl base
    ctx.fillStyle = rgba(colors.bg, 0.94);
    ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();

    // Rotating blades
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(2, R * 0.07);
    ctx.strokeStyle = rgba(e, 0.55);
    var n = 18;
    for (var i = 0; i < n; i++) {
      var a = customAngle + (i * Math.PI * 2) / n;
      var r0 = R * 0.24, r1 = R * 0.86, rc = R * 0.58;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
      ctx.quadraticCurveTo(
        x + Math.cos(a + 0.08) * rc, y + Math.sin(a + 0.08) * rc,
        x + Math.cos(a + 0.42) * r1, y + Math.sin(a + 0.42) * r1
      );
      ctx.stroke();
    }

    // Outer Cowl & Lip Ring
    ctx.lineWidth = Math.max(3, R * 0.09);
    ctx.strokeStyle = rgba(e, 0.92);
    ctx.beginPath(); ctx.arc(x, y, R * 0.98, 0, Math.PI * 2); ctx.stroke();

    // Metallic Highlight Rim
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = rgba(colors.charge, 0.35);
    ctx.beginPath(); ctx.arc(x, y, R * 0.89, 0, Math.PI * 2); ctx.stroke();

    // Spinner hub
    ctx.fillStyle = rgba(e, 0.94);
    ctx.beginPath(); ctx.arc(x, y, R * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rgba(colors.bg, 0.9);
    ctx.lineWidth = Math.max(1, R * 0.018);
    ctx.beginPath();
    for (var k = 0; k <= 60; k++) {
      var th = customAngle * 1.5 + k * 0.2;
      var rr = (k / 60) * R * 0.15;
      var sx = x + Math.cos(th) * rr, sy = y + Math.sin(th) * rr;
      if (k === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }

  function drawOriginal() {
    var R = engine.r, x = engine.x, y = engine.y;
    // Electrostatic dashed field pulses
    var pulse = 0.5 + Math.sin(t * 0.03) * 0.5;
    ctx.save();
    ctx.setLineDash([2, 7]);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = rgba(colors.charge, 0.18 + pulse * 0.22);
    ctx.beginPath(); ctx.arc(x, y, R * 1.75, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = rgba(colors.charge, 0.1 + pulse * 0.1);
    ctx.beginPath(); ctx.arc(x, y, R * 1.38, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    drawFan(x, y, R, angle, colors.accent);
  }

  /* =========================================================================
     MODE 1: Nacelle Cross-Section & Streamline Airflow
     ========================================================================= */
  function stepCrossSection() {
    t++;
    var intakeX = engine.x - engine.r * 1.2;
    var coreY = engine.y;
    var lipR = engine.r;

    // Mouse interactive pitch adjustment
    var targetTilt = mouse.active ? (mouse.y - engine.y) * 0.0003 : 0;

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.px = p.x; p.py = p.y;

      var baseVx = 1.6 + p.z * 1.8;
      p.vx += (baseVx - p.vx) * 0.05;

      var distToIntake = intakeX - p.x;
      var dy = p.y - coreY;

      // Crossing electrostatic ionization grid
      if (p.x >= intakeX - 20 && p.x <= intakeX + 60) {
        p.c = Math.min(1, p.c + 0.12);
      }

      if (p.c > 0.3) {
        // Electrostatically curve upward/downward into bypass catch ducts
        var deflectDir = dy >= 0 ? 1 : -1;
        var curveForce = (p.c * 1.6) / (1 + Math.abs(dy) * 0.02);
        p.vy += deflectDir * curveForce * 0.18 + targetTilt * 4;

        // Catch zones capture particles
        if (p.x > engine.x && Math.abs(dy) > lipR * 0.65) {
          p.captured = true;
          p.vx *= 0.94;
        }
      } else {
        // Natural suction towards centerline
        if (distToIntake > 0 && distToIntake < 180) {
          p.vy += -dy * 0.012;
        }
      }

      p.x += p.vx;
      p.y += p.vy;

      if (p.x > w + 40 || p.captured && p.vx < 0.2 || p.y < -50 || p.y > h + 50) {
        particles[i] = createParticle(false, "cross-section");
      }
    }
  }

  function drawCrossSection() {
    var ex = engine.x, ey = engine.y, R = engine.r;
    var intakeX = ex - R * 1.2;
    var len = R * 2.4;

    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = rgba(colors.engine, 0.85);

    // Outer Nacelle Upper Cowl
    ctx.beginPath();
    ctx.moveTo(intakeX - 10, ey - R);
    ctx.bezierCurveTo(intakeX + R * 0.5, ey - R * 1.15, ex + len * 0.6, ey - R * 1.05, ex + len, ey - R * 0.85);
    ctx.lineTo(ex + len, ey - R * 0.65);
    ctx.bezierCurveTo(ex + len * 0.5, ey - R * 0.75, intakeX + R * 0.4, ey - R * 0.75, intakeX, ey - R * 0.85);
    ctx.closePath();
    ctx.fillStyle = rgba(colors.engine, 0.12);
    ctx.fill();
    ctx.stroke();

    // Outer Nacelle Lower Cowl
    ctx.beginPath();
    ctx.moveTo(intakeX - 10, ey + R);
    ctx.bezierCurveTo(intakeX + R * 0.5, ey + R * 1.15, ex + len * 0.6, ey + R * 1.05, ex + len, ey + R * 0.85);
    ctx.lineTo(ex + len, ey + R * 0.65);
    ctx.bezierCurveTo(ex + len * 0.5, ey + R * 0.75, intakeX + R * 0.4, ey + R * 0.75, intakeX, ey + R * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Central Spinner & Core Splitter
    ctx.fillStyle = rgba(colors.engine, 0.25);
    ctx.beginPath();
    ctx.moveTo(intakeX + R * 0.15, ey);
    ctx.bezierCurveTo(intakeX + R * 0.65, ey - R * 0.38, ex + len, ey - R * 0.45, ex + len, ey - R * 0.3);
    ctx.lineTo(ex + len, ey + R * 0.3);
    ctx.bezierCurveTo(ex + len, ey + R * 0.45, intakeX + R * 0.65, ey + R * 0.38, intakeX + R * 0.15, ey);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // ARES Charging Grid (Vertical Electrostatic Mesh)
    var gridPulse = 0.5 + Math.sin(t * 0.08) * 0.5;
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = rgba(colors.charge, 0.55 + gridPulse * 0.4);
    ctx.beginPath();
    ctx.moveTo(intakeX, ey - R * 0.85);
    ctx.lineTo(intakeX, ey + R * 0.85);
    ctx.stroke();

    // Catch Zone Filter Indicator
    ctx.fillStyle = rgba(colors.accent, 0.45 + gridPulse * 0.3);
    ctx.fillRect(ex + len * 0.45, ey - R * 0.88, len * 0.35, R * 0.14);
    ctx.fillRect(ex + len * 0.45, ey + R * 0.74, len * 0.35, R * 0.14);

    // Labels & Technical Callouts
    ctx.font = "600 11px Rajdhani, sans-serif";
    ctx.fillStyle = rgba(colors.charge, 0.95);
    ctx.fillText("CHARGING GRID [ARES]", intakeX - 60, ey - R * 1.05);
    ctx.fillStyle = rgba(colors.accent, 0.9);
    ctx.fillText("CATCH ZONE", ex + len * 0.45, ey - R * 0.98);
    ctx.fillStyle = rgba(colors.engine, 0.75);
    ctx.fillText("CORE (CLEAN AIRFLOW)", ex + len * 0.2, ey + 4);

    ctx.restore();
  }

  /* =========================================================================
     MODE 2: Interactive Shield Toggle (Before / After Comparison)
     ========================================================================= */
  function stepShieldToggle() {
    t++;
    shieldTimer++;
    // Auto-toggle every 320 frames (~5.3 seconds) if user isn't clicking
    if (shieldTimer > 320) {
      shieldActive = !shieldActive;
      shieldTimer = 0;
    }

    var R = engine.r, field = R * 1.85;

    if (!shieldActive) {
      coreErosionLevel = Math.min(100, coreErosionLevel + 0.15);
    } else {
      coreErosionLevel = Math.max(0, coreErosionLevel - 0.4);
    }

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.px = p.x; p.py = p.y;

      var baseVx = 1.2 + p.z * 1.6;
      p.vx += (baseVx - p.vx) * 0.05;

      var dx = p.x - engine.x, dy = p.y - engine.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;

      if (shieldActive) {
        // Shield Repels
        if (d < field) p.c = Math.min(1, p.c + 0.12);
        else p.c = Math.max(0, p.c - 0.005);

        if (p.c > 0) {
          var f = p.c * 1.1 * (R * R) / (d * d);
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f + (dy >= 0 ? 0.6 : -0.6) * f;
        }
      } else {
        // Standard Mode: Ingestion suction into core
        p.c = 0;
        if (d < R * 3.5) {
          var s = 0.14 * (1 - d / (R * 3.5));
          p.vx -= (dx / d) * s;
          p.vy -= (dy / d) * s;
        }
        // Hits core
        if (d < R * 0.6) {
          p.x = w + 99; // absorb into engine
        }
      }

      p.x += p.vx;
      p.y += p.vy;

      if (p.x > w + 40 || p.y < -40 || p.y > h + 40) {
        particles[i] = createParticle(false, "shield-toggle");
      }
    }
  }

  function drawShieldToggle() {
    var R = engine.r, x = engine.x, y = engine.y;
    var statusPulse = 0.5 + Math.sin(t * 0.06) * 0.5;

    if (shieldActive) {
      // Glowing Cyan Force Field Bubble
      var g = ctx.createRadialGradient(x, y, R * 0.6, x, y, R * 2.2);
      g.addColorStop(0, rgba(colors.charge, 0.25));
      g.addColorStop(0.7, rgba(colors.charge, 0.08 + statusPulse * 0.06));
      g.addColorStop(1, rgba(colors.charge, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, R * 2.2, 0, Math.PI * 2); ctx.fill();

      // Shockwave Pulse Rings
      ctx.save();
      ctx.lineWidth = 2;
      ctx.strokeStyle = rgba(colors.charge, 0.45 + statusPulse * 0.35);
      ctx.beginPath(); ctx.arc(x, y, R * (1.5 + (t % 60) / 60 * 0.5), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();

      drawFan(x, y, R, angle, colors.charge);

      // HUD Badge
      drawHUD(x, y + R * 1.4, "ARES SHIELD ACTIVE: 98.4% DEFLECTED", colors.charge, true);
    } else {
      // Red Warning Flare around Unprotected Core
      var redGlow = [230, 45, 45];
      var gWarn = ctx.createRadialGradient(x, y, R * 0.2, x, y, R * 1.5);
      gWarn.addColorStop(0, rgba(redGlow, 0.35 + statusPulse * 0.25));
      gWarn.addColorStop(1, rgba(redGlow, 0));
      ctx.fillStyle = gWarn;
      ctx.beginPath(); ctx.arc(x, y, R * 1.5, 0, Math.PI * 2); ctx.fill();

      drawFan(x, y, R, angle, redGlow);

      // Ingestion Warning HUD
      drawHUD(x, y + R * 1.4, "UNPROTECTED: CORE INGESTION & EROSION", redGlow, false);
    }
  }

  function drawHUD(hx, hy, text, color, safe) {
    ctx.save();
    ctx.font = "700 12px Rajdhani, sans-serif";
    var textWidth = ctx.measureText(text).width;
    var pad = 12;

    ctx.fillStyle = rgba(colors.bg, 0.88);
    ctx.strokeStyle = rgba(color, 0.7);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(hx - textWidth / 2 - pad, hy - 14, textWidth + pad * 2, 28, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = rgba(color, 1);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, hx, hy);
    ctx.restore();
  }

  /* =========================================================================
     MODE 3: 3D Isometric Wireframe & Phased-Array Radar
     ========================================================================= */
  function stepWireframe() {
    t++;
    var R = engine.r;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.px = p.x; p.py = p.y;

      var baseVx = 1.0 + p.z * 1.4;
      p.vx += (baseVx - p.vx) * 0.05;

      var dx = p.x - engine.x, dy = p.y - engine.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;

      // Phased array radar repulsion
      if (d < R * 2.2) {
        p.c = Math.min(1, p.c + 0.08);
        var f = p.c * 1.2 * (R * R) / (d * d);
        p.vx += (dx / d) * f;
        p.vy += (dy / d) * f * 1.2;
      } else {
        p.c = Math.max(0, p.c - 0.004);
      }

      p.x += p.vx;
      p.y += p.vy;

      if (p.x > w + 40 || p.y < -40 || p.y > h + 40) {
        particles[i] = createParticle(false, "wireframe-3d");
      }
    }
  }

  function drawWireframe3D() {
    var cx = engine.x, cy = engine.y, R = engine.r;
    ctx.save();

    // Phased Array Sweeping Rings
    var sweep = (t * 0.015) % 1;
    for (var rIndex = 0; rIndex < 3; rIndex++) {
      var curR = R * (0.8 + ((sweep + rIndex / 3) % 1) * 1.8);
      var alpha = (1 - (curR - R * 0.8) / (R * 1.8)) * 0.35;
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = rgba(colors.charge, Math.max(0, alpha));
      ctx.beginPath();
      ctx.ellipse(cx, cy, curR, curR * 0.65, -0.22, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 3D Isometric Engine Cowl (Concentric ellipses in depth)
    var numRings = 7;
    for (var j = 0; j < numRings; j++) {
      var depth = j / numRings;
      var ringX = cx + (depth - 0.5) * R * 1.4;
      var ringR = R * (1 - depth * 0.22);
      var ringAlpha = 0.25 + (1 - depth) * 0.55;

      ctx.lineWidth = j === 0 ? 2.5 : 1;
      ctx.strokeStyle = rgba(colors.engine, ringAlpha);
      ctx.beginPath();
      ctx.ellipse(ringX, cy, ringR * 0.72, ringR, -0.22, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Rotating 3D Blades in isometric plane
    var bladeCount = 14;
    var bladeAngle = angle * 1.2;
    for (var b = 0; b < bladeCount; b++) {
      var a = bladeAngle + (b * Math.PI * 2) / bladeCount;
      var bx0 = cx + Math.cos(a) * R * 0.15;
      var by0 = cy + Math.sin(a) * R * 0.2;
      var bx1 = cx + Math.cos(a) * R * 0.75;
      var by1 = cy + Math.sin(a) * R * 0.95;

      ctx.lineWidth = 1.4;
      ctx.strokeStyle = rgba(colors.charge, 0.45);
      ctx.beginPath();
      ctx.moveTo(bx0, by0);
      ctx.lineTo(bx1, by1);
      ctx.stroke();
    }

    // Repulsion Vector Crosshairs to nearby charged particles
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 5]);
    for (var k = 0; k < particles.length; k++) {
      var p = particles[k];
      if (p.c > 0.6 && Math.random() < 0.2) {
        ctx.strokeStyle = rgba(colors.charge, 0.4);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  /* =========================================================================
     MODE 4: Interactive Particle Repulsion Cloud (Micro-Physics Sandbox)
     ========================================================================= */
  function stepParticleCloud() {
    t++;
    var hasMouse = mouse.active;
    var mouseRadius = 150;
    var engineRadius = engine.r * 1.35;

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.px = p.x; p.py = p.y;

      var baseVx = 1.0 + p.z * 1.6;
      var ax = (baseVx - p.vx) * 0.04;
      var ay = (Math.sin(p.x * 0.008 + t * 0.02 + p.seed) * 0.35 - p.vy) * 0.04;

      // 1. Mouse electrostatic repulsion collider (when cursor / touch is active)
      if (hasMouse) {
        var dxM = p.x - mouse.x, dyM = p.y - mouse.y;
        var dM = Math.sqrt(dxM * dxM + dyM * dyM) || 1;
        if (dM < mouseRadius) {
          p.c = Math.min(1, p.c + 0.16);
          var forceM = Math.pow(1 - dM / mouseRadius, 1.8) * 3.6;
          ax += (dxM / dM) * forceM;
          ay += (dyM / dM) * forceM;
        }
      }

      // 2. Engine intake electrostatic repulsion collider (always protects engine)
      var dxE = p.x - engine.x, dyE = p.y - engine.y;
      var dE = Math.sqrt(dxE * dxE + dyE * dyE) || 1;
      if (dE < engineRadius * 1.8) {
        p.c = Math.min(1, p.c + 0.12);
        var forceE = Math.pow(1 - dE / (engineRadius * 1.8), 1.6) * 2.6;
        ax += (dxE / dE) * forceE;
        ay += (dyE / dE) * forceE + (dyE >= 0 ? 0.45 : -0.45) * forceE;
      } else {
        if (!hasMouse) p.c = Math.max(0, p.c - 0.006);
      }

      // 3. Smooth boundary damping: prevents clumping or collider penetration
      if (dE < engineRadius) {
        var overlapE = (engineRadius - dE) / engineRadius;
        ax += (dxE / dE) * overlapE * 2.8;
        ay += (dyE / dE) * overlapE * 2.8;
        p.vx *= 0.88;
        p.vy *= 0.88;
      }

      p.vx += ax;
      p.vy += ay;

      // Speed clamp for fluid aerodynamic simulation
      var speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > 7.0) {
        p.vx = (p.vx / speed) * 7.0;
        p.vy = (p.vy / speed) * 7.0;
      }

      p.x += p.vx;
      p.y += p.vy;

      if (p.x > w + 25 || p.y < -35 || p.y > h + 35) {
        particles[i] = createParticle(false, "particle-cloud");
      }
    }
  }

  function drawParticleCloud() {
    // If mouse is on canvas, draw interactive electrostatic cursor halo
    if (mouse.active) {
      var haloPulse = 0.5 + Math.sin(t * 0.08) * 0.5;
      var g = ctx.createRadialGradient(mouse.x, mouse.y, 10, mouse.x, mouse.y, 160);
      g.addColorStop(0, rgba(colors.charge, 0.28));
      g.addColorStop(0.7, rgba(colors.charge, 0.06 + haloPulse * 0.05));
      g.addColorStop(1, rgba(colors.charge, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 160, 0, Math.PI * 2); ctx.fill();

      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 6]);
      ctx.strokeStyle = rgba(colors.charge, 0.45);
      ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 110, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Engine intake on right
    drawFan(engine.x, engine.y, engine.r * 0.85, angle, colors.accent);
  }

  /* =========================================================================
     Master Step & Render
     ========================================================================= */
  function step() {
    if (currentMode === "cross-section") stepCrossSection();
    else if (currentMode === "shield-toggle") stepShieldToggle();
    else if (currentMode === "wireframe-3d") stepWireframe();
    else if (currentMode === "particle-cloud") stepParticleCloud();
    else stepOriginal();
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = "round";

    // 1. Draw particles with velocity streaks
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var c = p.c;
      var col = [
        Math.round(colors.dust[0] * (1 - c) + colors.charge[0] * c),
        Math.round(colors.dust[1] * (1 - c) + colors.charge[1] * c),
        Math.round(colors.dust[2] * (1 - c) + colors.charge[2] * c)
      ];
      var alpha = 0.18 + p.z * 0.55 + c * 0.25;
      ctx.strokeStyle = rgba(col, Math.min(1, alpha));
      ctx.lineWidth = p.size + c * 0.8;
      ctx.beginPath();
      ctx.moveTo(p.x - p.vx * (2 + c * 3), p.y - p.vy * (2 + c * 3));
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }

    // 2. Draw mode-specific foreground engine visuals
    if (currentMode === "cross-section") drawCrossSection();
    else if (currentMode === "shield-toggle") drawShieldToggle();
    else if (currentMode === "wireframe-3d") drawWireframe3D();
    else if (currentMode === "particle-cloud") drawParticleCloud();
    else drawOriginal();
  }

  function frame() {
    if (!running) return;
    step();
    angle += 0.012;
    draw();
    raf = requestAnimationFrame(frame);
  }

  function update() {
    var shouldRun = inView && !document.hidden && !reduceMotion.matches;
    if (shouldRun && !running) {
      running = true;
      raf = requestAnimationFrame(frame);
    } else if (!shouldRun && running) {
      running = false;
      cancelAnimationFrame(raf);
    }
  }

  /* =========================================================================
     Interactivity & Mode Switching API
     ========================================================================= */
  window.setHeroAnimationMode = function (newMode) {
    if (newMode === currentMode) return;
    currentMode = newMode;
    initParticlesForMode(newMode);
    if (!running) draw();
  };

  // Mouse tracking
  window.addEventListener("mousemove", function (e) {
    var rect = canvas.getBoundingClientRect();
    if (e.clientX >= rect.left && e.clientX <= rect.right &&
      e.clientY >= rect.top && e.clientY <= rect.bottom) {
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    } else {
      mouse.active = false;
    }
  }, { passive: true });

  window.addEventListener("mouseleave", function () {
    mouse.active = false;
  });

  // Mode switcher button bindings
  function setupModeButtons() {
    var btns = document.querySelectorAll("[data-hero-mode]");
    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        btns.forEach(function (b) {
          b.classList.remove("is-active");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("is-active");
        btn.setAttribute("aria-selected", "true");
        window.setHeroAnimationMode(btn.dataset.heroMode);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupModeButtons);
  } else {
    setupModeButtons();
  }

  readColors();
  layout();
  draw();

  var resizeRaf = 0;
  if ("ResizeObserver" in window) {
    new ResizeObserver(function () {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(function () {
        layout();
        if (!running) draw();
      });
    }).observe(canvas);
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      update();
    }).observe(canvas);
  }

  document.addEventListener("visibilitychange", update);
  document.addEventListener("themechange", function () {
    readColors();
    if (!running) draw();
  });

  update();
})();
