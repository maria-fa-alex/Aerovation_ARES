/* Aerovation / ARES: Hero background
   Drifting desert dust that is pushed away from the mouse pointer.
*/
(function () {
  "use strict";

  document.querySelectorAll(".hero-switcher, .scroll-cue").forEach(function (el) {
    el.remove();
  });

  var canvas = document.getElementById("hero-canvas");
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext("2d");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var w = 0, h = 0, dpr = 1;
  var particles = [];
  var mouse = { x: -999, y: -999, active: false };
  var colors = {};
  var t = 0;
  var raf = 0, running = false, inView = true;

  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    function rgb(name) {
      return cs.getPropertyValue(name).trim().split(/\s+/).map(Number);
    }
    colors = {
      dust: rgb("--dust-rgb"),
      charge: rgb("--charge-rgb")
    };
  }

  function rgba(c, a) {
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
  }

  function createParticle(anywhere) {
    var z = 0.3 + Math.random() * 0.7;
    var x = anywhere ? Math.random() * w : -20 - Math.random() * 80;
    var y = Math.random() * h;
    return {
      x: x,
      y: y,
      vx: 0.8 + z * 1.6,
      vy: 0,
      z: z,
      c: 0, // charge factor: 0 (neutral) to 1 (charged)
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

  function step() {
    t++;
    var mouseRadius = 150;

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];

      var baseVx = 1.0 + p.z * 1.6;
      var ax = (baseVx - p.vx) * 0.04;
      var ay = (Math.sin(p.x * 0.008 + t * 0.02 + p.seed) * 0.35 - p.vy) * 0.04;

      if (mouse.active) {
        var dx = p.x - mouse.x, dy = p.y - mouse.y;
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d < mouseRadius) {
          p.c = Math.min(1, p.c + 0.16);
          var force = Math.pow(1 - d / mouseRadius, 1.8) * 3.6;
          ax += (dx / d) * force;
          ay += (dy / d) * force;
        }
      } else {
        p.c = Math.max(0, p.c - 0.006);
      }

      p.vx += ax;
      p.vy += ay;

      var speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > 7.0) {
        p.vx = (p.vx / speed) * 7.0;
        p.vy = (p.vy / speed) * 7.0;
      }

      p.x += p.vx;
      p.y += p.vy;

      if (p.x > w + 25 || p.y < -35 || p.y > h + 35) {
        particles[i] = createParticle(false);
      }
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
      var alpha = 0.18 + p.z * 0.55 + c * 0.25;
      ctx.strokeStyle = rgba(col, Math.min(1, alpha));
      ctx.lineWidth = p.size + c * 0.8;
      ctx.beginPath();
      ctx.moveTo(p.x - p.vx * (2 + c * 3), p.y - p.vy * (2 + c * 3));
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
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
