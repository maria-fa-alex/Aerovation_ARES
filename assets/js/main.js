/* Aerovation / ARES: shared site behaviour
   Menu, theme toggle, header state, scroll reveals and the contact form. */
(function () {
  "use strict";

  var root = document.documentElement;
  var body = document.body;
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
    themeBtn.setAttribute("aria-label", "Switch to " + next + " mode");
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

  /* ---------- Menu ---------- */
  var menuBtn = document.getElementById("menu-toggle");
  var nav = document.getElementById("site-nav");
  var menuLabel = menuBtn ? menuBtn.querySelector(".menu-label") : null;

  function focusables() {
    return [menuBtn].concat(Array.prototype.slice.call(nav.querySelectorAll("a[href]")));
  }

  function setMenu(open) {
    if (!menuBtn || !nav) return;
    menuBtn.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
    body.classList.toggle("menu-open", open);
    if (open) nav.removeAttribute("inert"); else nav.setAttribute("inert", "");
    if (menuLabel) menuLabel.textContent = open ? "Close" : "Menu";
    if (open) {
      var first = nav.querySelector("a[href]");
      if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 350);
    }
  }

  if (menuBtn && nav) {
    nav.setAttribute("inert", "");
    menuBtn.addEventListener("click", function () {
      setMenu(menuBtn.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (!nav.classList.contains("is-open")) return;
      if (e.key === "Escape") {
        setMenu(false);
        menuBtn.focus();
      } else if (e.key === "Tab") {
        var items = focusables();
        var i = items.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
      }
    });
  }

  /* ---------- Header background on scroll ---------- */
  var header = document.getElementById("site-header");
  var ticking = false;
  function onScroll() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 24);
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal, .step");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Placeholder links (e.g. Instagram) do nothing yet ---------- */
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[aria-disabled="true"]');
    if (a) e.preventDefault();
  });

  /* ---------- Contact form ----------
     While data-live="false" the form only shows a notice.
     To go live: add action="https://formspree.io/f/YOUR_ID" method="POST"
     to the <form> and set data-live="true". */
  var form = document.getElementById("contact-form");
  if (form) {
    var notice = document.getElementById("form-notice");
    form.addEventListener("submit", function (e) {
      if (form.dataset.live === "true" && form.getAttribute("action")) return;
      e.preventDefault();
      if (notice) {
        notice.hidden = false;
        notice.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      form.reset();
    });
  }
})();
