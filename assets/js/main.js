/* Aerovation / ARES: shared site behaviour
   Menu, theme toggle, header state, scroll reveals and the ARES dust budget calculator. */
(function () {
  "use strict";

  var root = document.documentElement;
  var darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

  /* ---------- Theme ---------- */
  var themeBtn = document.getElementById("theme-toggle");

  function effectiveTheme() {
    var set = root.getAttribute("data-theme");
    if (set) return set;
    return darkQuery.matches ? "dark" : "light";
  }

  function updateThemeLabel() {
    if (!themeBtn) return;
    var next = effectiveTheme() === "dark" ? "light" : "dark";
    var label = "Switch to " + next + " mode";
    themeBtn.setAttribute("aria-label", label);
    themeBtn.setAttribute("title", label);
    themeBtn.setAttribute("data-tooltip", label);
  }

  function announceTheme() {
    updateThemeLabel();
    document.dispatchEvent(new CustomEvent("themechange"));
  }

  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = effectiveTheme() === "dark" ? "light" : "dark";
      // If the choice matches the device setting, drop the override so the
      // site keeps following the device from then on.
      var device = darkQuery.matches ? "dark" : "light";
      try {
        if (next === device) {
          root.removeAttribute("data-theme");
          localStorage.removeItem("theme");
        } else {
          root.setAttribute("data-theme", next);
          localStorage.setItem("theme", next);
        }
      } catch (e) {
        root.setAttribute("data-theme", next);
      }
      announceTheme();
    });
  }
  if (darkQuery.addEventListener) darkQuery.addEventListener("change", announceTheme);
  updateThemeLabel();

  /* ---------- Header background & scroll hint on scroll ---------- */
  var header = document.getElementById("site-header");
  var scrollHint = document.querySelector(".scroll-hint");
  var progress = document.getElementById("scroll-progress");
  var ticking = false;
  function onScroll() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 24);
    if (scrollHint) scrollHint.classList.toggle("is-hidden", window.scrollY > 48);
    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = "scaleX(" + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ")";
    }
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal, .step");
  var vh = window.innerHeight || document.documentElement.clientHeight;
  revealEls.forEach(function (el) {
    var rect = el.getBoundingClientRect();
    if (rect.top < vh * 0.95) {
      el.classList.add("is-in");
    }
  });
  root.classList.add("reveal-ready");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.08 });
    revealEls.forEach(function (el) {
      if (!el.classList.contains("is-in")) io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Dust budget calculator (ares.html) ----------
     Per engine, per flight, from the concept screening model at 20 min taxi
     and 0.3 mg/m3: idle-phase core dust 9.75 g without ARES, 0.85 g with ARES
     (2.35 g derated x0.5); take-off/landing 3.08 g either way (cassette stowed).
     These reproduce the published 12.8 g -> 3.9 g (-69%) and -58% derated. */
  var calcForm = document.getElementById("calc-form");
  if (calcForm) {
    var BASE_MIN = 20, IDLE_NO = 9.75, IDLE_NOM = 0.85, IDLE_DER = 2.35, POWER = 3.08;
    var el = function (id) { return document.getElementById(id); };
    var taxi = el("calc-taxi");

    var fmt = function (g) { return (g >= 100 ? Math.round(g) : g.toFixed(1)) + "g"; };

    var renderCalc = function () {
      var minutes = Number(taxi.value);
      var dust = Number(calcForm.querySelector('input[name="calc-dust"]:checked').value);
      var derated = calcForm.querySelector('input[name="calc-perf"]:checked').value === "derated";
      var k = minutes / BASE_MIN;
      var idleNo = IDLE_NO * k * dust;
      var idleWith = (derated ? IDLE_DER : IDLE_NOM) * k * dust;
      var power = POWER * dust;
      var totalNo = idleNo + power;
      var totalWith = idleWith + power;
      var pct = Math.round((1 - totalWith / totalNo) * 100);

      el("calc-taxi-out").textContent = minutes + " min";
      el("calc-pct").textContent = "−" + pct + "%";
      el("calc-no").textContent = fmt(totalNo);
      el("calc-with").textContent = fmt(totalWith);
      el("calc-no-idle").style.width = (idleNo / totalNo * 100) + "%";
      el("calc-no-power").style.width = (power / totalNo * 100) + "%";
      el("calc-with-idle").style.width = (idleWith / totalNo * 100) + "%";
      el("calc-with-captured").style.width = ((idleNo - idleWith) / totalNo * 100) + "%";
      el("calc-with-power").style.width = (power / totalNo * 100) + "%";
    };

    calcForm.addEventListener("input", renderCalc);
    calcForm.addEventListener("change", renderCalc);
    renderCalc();
  }

  /* ---------- Sticky sub-nav: highlight the section in view (ares.html) ---------- */
  var subnav = document.querySelector(".subnav");
  if (subnav && "IntersectionObserver" in window) {
    var links = Array.prototype.slice.call(subnav.querySelectorAll('a[href^="#"]'));
    var targets = links.map(function (a) { return document.querySelector(a.getAttribute("href")); });
    var visible = {};
    var setActive = function () {
      // The last linked target (in page order) in the reading band wins, so a
      // block nested inside a section (the calculator) beats its parent.
      var current = null;
      for (var i = 0; i < targets.length; i++) {
        if (targets[i] && visible[targets[i].id]) current = links[i];
      }
      links.forEach(function (a) {
        var on = a === current;
        a.classList.toggle("is-active", on);
        if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      });
      if (current) {
        var bar = current.parentElement;
        var left = current.offsetLeft - (bar.clientWidth - current.offsetWidth) / 2;
        bar.scrollTo({ left: left, behavior: "smooth" });
      }
    };
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
      setActive();
    }, { rootMargin: "-30% 0px -60% 0px" });
    targets.forEach(function (t) { if (t) navObserver.observe(t); });
  }

  /* ---------- Glossary pop-ups: keep them inside the screen ---------- */
  document.querySelectorAll(".term").forEach(function (term) {
    var def = term.querySelector(".term-def");
    if (!def) return;
    var place = function () {
      def.style.setProperty("--shift", "0px");
      var r = def.getBoundingClientRect();
      var gutter = 12, shift = 0;
      // Measure as if centred (the hidden state is offset 4px vertically only).
      if (r.left < gutter) shift = gutter - r.left;
      else if (r.right > window.innerWidth - gutter) shift = window.innerWidth - gutter - r.right;
      def.style.setProperty("--shift", shift + "px");
    };
    term.addEventListener("mouseenter", place);
    term.addEventListener("focus", place);
  });

  /* ---------- Card spotlight: a soft glow follows the cursor (mouse only) ---------- */
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    var glowSel = ".card, .diagram-card, .metric, .roadmap li, .cta-band";
    var lastGlow = null;
    document.addEventListener("pointermove", function (e) {
      var el = e.target.closest ? e.target.closest(glowSel) : null;
      if (lastGlow && lastGlow !== el) {
        lastGlow.style.removeProperty("--mx");
        lastGlow.style.removeProperty("--my");
      }
      lastGlow = el;
      if (!el) return;
      var r = el.getBoundingClientRect();
      el.style.setProperty("--mx", (e.clientX - r.left) + "px");
      el.style.setProperty("--my", (e.clientY - r.top) + "px");
    }, { passive: true });
  }

  /* ---------- Tabs (The technicalities, ares.html) ---------- */
  document.querySelectorAll("[data-tabs]").forEach(function (box) {
    var tabs = Array.prototype.slice.call(box.querySelectorAll('[role="tab"]'));
    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(tab, false); });
      tab.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
        else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === "Home") next = tabs[0];
        else if (e.key === "End") next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); select(next, true); }
      });
    });
    box.classList.add("tabs-ready");
    select(tabs[0], false);
  });

  /* ---------- Count-up for key figures ([data-count] on the element) ----------
     The final value is already in the HTML; this only animates up to it once,
     when the figure scrolls into view. Skipped for reduced-motion users. */
  var counters = document.querySelectorAll("[data-count]");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (counters.length && "IntersectionObserver" in window && !reduceMotion) {
    var runCount = function (el) {
      var target = el.getAttribute("data-count");
      var decimals = (target.split(".")[1] || "").length;
      var end = parseFloat(target);
      var node = el.firstChild;
      if (!node || node.nodeType !== 3 || node.nodeValue.indexOf(target) === -1) return;
      var template = node.nodeValue;
      var start = performance.now(), duration = 1100;
      var tick = function (now) {
        var t = Math.min(1, (now - start) / duration);
        var eased = 1 - Math.pow(1 - t, 3);
        node.nodeValue = template.replace(target, (end * eased).toFixed(decimals));
        if (t < 1) requestAnimationFrame(tick);
        else node.nodeValue = template;
      };
      requestAnimationFrame(tick);
    };
    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          runCount(entry.target);
          countObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { countObserver.observe(el); });
  }
})();
