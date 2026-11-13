/* Aerovation / ARES: Hero background
   Desert dust drifts across the hero. Near the pointer (mouse, pen or finger)
   grains become charged (orange -> cyan), are pulled to the "collector" and
   captured, like ARES does in the core inlet. On touch screens with no
   interaction, a slow automatic collector drifts through the lower hero.
*/
(function () {
  "use strict";

  var canvas = document.getElementById("hero-canvas");
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext("2d");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var noHover = window.matchMedia("(hover: none)");
  var w = 0, h = 0, dpr = 1;
  var particles = [];
  var pointer = { x: -999, y: -999, active: false, lastMove: 0 };
  var collector = { x: -999, y: -999, active: false, pulse: 0 };
  var colors = {};
  var t = 0;
  var raf = 0, running = false, inView = true;

  var FIELD_RADIUS = 160;   // grains inside this get charged and pulled in
  var CAPTURE_RADIUS = 14;  // grains closer than this are captured

  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    function rgb(name) {
      return cs.getPropertyValue(name).trim().split(/\s+/).map(Number);
    }
    colors = { dust: rgb("--dust-rgb"), charge: rgb("--charge-rgb"), brand: rgb("--accent-rgb") };
  }

  function rgba(c, a) {
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
  }

  function createParticle(anywhere) {
    var z = 0.3 + Math.random() * 0.7;
    return {
      x: anywhere ? Math.random() * w : -20 - Math.random() * 80,
      y: Math.random() * h,
      vx: 0.8 + z * 1.6,
      vy: 0,
      z: z,
      c: 0,       // charge: 0 neutral (orange) to 1 charged (cyan)
      fade: 1,    // 1 visible; counts down once captured
      captured: false,
      seed: Math.random() * 6.28,
      size: 0.6 + z * 1.5
    };
  }

  function initParticles() {
    particles = [];
    var count = Math.round(Math.min(750, (w * h) / 1600));
    for (var i = 0; i < count; i++) particles.push(createParticle(true));
  }

  function layout() {
    var rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initParticles();
  }

  function updateCollector() {
    var idle = performance.now() - pointer.lastMove > 3500;
    if (pointer.active && !idle) {
      collector.x = pointer.x;
      collector.y = pointer.y;
      collector.active = true;
    } else if (noHover.matches) {
      // Autopilot on touch screens: a slow figure-of-eight in the lower hero.
      collector.x = w * (0.5 + 0.36 * Math.sin(t * 0.0045));
      collector.y = h * (0.8 + 0.08 * Math.sin(t * 0.009));
      collector.active = true;
    } else {
      collector.active = pointer.active;
      collector.x = pointer.x;
      collector.y = pointer.y;
    }
  }

  function step() {
    t++;
    updateCollector();
    if (collector.pulse > 0) collector.pulse = Math.max(0, collector.pulse - 0.04);

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];

      if (p.captured) {
        p.fade -= 0.08;
        if (p.fade <= 0) particles[i] = createParticle(false);
        continue;
      }

      var baseVx = 1.0 + p.z * 1.6;
      var ax = (baseVx - p.vx) * 0.04;
      var ay = (Math.sin(p.x * 0.008 + t * 0.02 + p.seed) * 0.35 - p.vy) * 0.04;

      var inField = false;
      if (collector.active) {
        var dx = collector.x - p.x, dy = collector.y - p.y;
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d < FIELD_RADIUS) {
          inField = true;
          p.c = Math.min(1, p.c + 0.08);
          // Pull grows as the grain charges and gets closer.
          var force = Math.pow(1 - d / FIELD_RADIUS, 1.4) * 1.6 * (0.3 + p.c);
          ax += (dx / d) * force;
          ay += (dy / d) * force;
          if (d < CAPTURE_RADIUS && p.c > 0.6) {
            p.captured = true;
            p.x = collector.x; p.y = collector.y;
            collector.pulse = Math.min(1, collector.pulse + 0.25);
            continue;
          }
        }
      }
      if (!inField) p.c = Math.max(0, p.c - 0.01);

      p.vx += ax;
      p.vy += ay;
      var speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > 7.0) { p.vx = (p.vx / speed) * 7.0; p.vy = (p.vy / speed) * 7.0; }
      p.x += p.vx;
      p.y += p.vy;

      if (p.x > w + 25 || p.y < -35 || p.y > h + 35) particles[i] = createParticle(false);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = "round";

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var c = p.c;
      var col = [
        Math.round(colors.dust[0] * (1 - c) + colors.charge[0] * c),
        Math.round(colors.dust[1] * (1 - c) + colors.charge[1] * c),
        Math.round(colors.dust[2] * (1 - c) + colors.charge[2] * c)
      ];
      var alpha = (0.18 + p.z * 0.55 + c * 0.25) * p.fade;
      ctx.strokeStyle = rgba(col, Math.min(1, alpha));
      ctx.lineWidth = p.size + c * 0.8;
      ctx.beginPath();
      ctx.moveTo(p.x - p.vx * (2 + c * 3), p.y - p.vy * (2 + c * 3));
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }

    if (collector.active) {
      // The collector is the ARES mark itself: open capture rings, gap facing
      // the incoming dust, that swell slightly as they catch grains.
      var x = collector.x, y = collector.y;
      var r = 17 + collector.pulse * 4;
      var gap = 0.68; // half-gap in radians, centred on the left
      var a0 = Math.PI + gap, a1 = 3 * Math.PI - gap;
      var alpha = 0.75 + collector.pulse * 0.25;
      ctx.lineCap = "round";
      ctx.strokeStyle = rgba(colors.brand, alpha);
      ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.arc(x, y, r, a0, a1); ctx.stroke();
      ctx.lineWidth = 2.1;
      ctx.beginPath(); ctx.arc(x, y, r * 0.68, a0, a1); ctx.stroke();
      ctx.lineWidth = 1.7;
      ctx.beginPath(); ctx.arc(x, y, r * 0.38, a0, a1); ctx.stroke();
      ctx.fillStyle = rgba(colors.brand, alpha);
      ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
      // A soft cyan glow when grains are being captured
      if (collector.pulse > 0.02) {
        ctx.fillStyle = rgba(colors.charge, collector.pulse * 0.18);
        ctx.beginPath(); ctx.arc(x, y, r + 6, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function frame() {
    if (!running) return;
    step();
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

  function setPointer(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var inside = clientX >= rect.left && clientX <= rect.right &&
      clientY >= rect.top && clientY <= rect.bottom;
    pointer.active = inside;
    if (inside) {
      pointer.x = clientX - rect.left;
      pointer.y = clientY - rect.top;
      pointer.lastMove = performance.now();
    }
  }

  // Mouse and pen.
  window.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "touch") setPointer(e.clientX, e.clientY);
  }, { passive: true });
  document.documentElement.addEventListener("mouseleave", function () {
    pointer.active = false;
  });

  // Touch: follow the finger, and let go shortly after it lifts.
  function onTouch(e) {
    var touch = e.touches[0];
    if (touch) setPointer(touch.clientX, touch.clientY);
  }
  window.addEventListener("touchstart", onTouch, { passive: true });
  window.addEventListener("touchmove", onTouch, { passive: true });
  window.addEventListener("touchend", function () {
    setTimeout(function () { pointer.active = false; }, 600);
  }, { passive: true });

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
