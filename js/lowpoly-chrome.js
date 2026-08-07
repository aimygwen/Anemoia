/**
 * Aimy chrome helpers for the restyled lowpoly page (no ui.js / spa-router).
 * Scroll via shared Polyglide (same feel as about / contact / gallery / …).
 */
(function () {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lenis = null;

  function bootLenis() {
    if (window.Polyglide) {
      lenis = window.Polyglide.boot();
      return lenis;
    }
    window.__lenis = null;
    return null;
  }

  function scrollToTarget(target, options) {
    options = options || {};
    if (window.Polyglide) {
      window.Polyglide.to(target, {
        offset: options.offset != null ? options.offset : 0,
        duration: options.duration,
      });
      return;
    }
    if (typeof target === "number") {
      window.scrollTo({ top: target, behavior: reduced ? "auto" : "smooth" });
      return;
    }
    if (target && target.scrollIntoView) {
      target.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "start",
      });
    }
  }

  function onScroll(fn) {
    window.addEventListener("scroll", fn, { passive: true });
    if (lenis) lenis.on("scroll", fn);
  }

  function bootInPageLinks() {
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener("click", function (e) {
        var href = link.getAttribute("href") || "";
        if (href.length < 2) return;
        var target = document.getElementById(href.slice(1));
        if (!target) return;
        e.preventDefault();
        scrollToTarget(target, { offset: -24 });
      });
    });
  }

  /* Match main-page welcome --progress scrub for title + splash parallax */
  function bootWelcomeProgress() {
    var welcome = document.querySelector(".lp-welcome");
    if (!welcome) return;
    if (reduced) {
      welcome.style.setProperty("--progress", "0");
      return;
    }

    var ticking = false;

    function measure() {
      var rect = welcome.getBoundingClientRect();
      var vh = Math.max(window.innerHeight, 1);
      var progress = Math.min(1, Math.max(0, -rect.top / Math.max(rect.height * 0.85, vh * 0.65)));
      welcome.style.setProperty("--progress", progress.toFixed(4));
      welcome.style.setProperty("--vh", (vh / 100).toFixed(4) + "px");
      ticking = false;
    }

    function onScrollFrame() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(measure);
      }
    }

    onScroll(onScrollFrame);
    window.addEventListener("resize", onScrollFrame, { passive: true });
    measure();
  }

  /** Polybi logo — holo CSS layers + pointer tilt only (no canvas pixel pass). */
  function bootPolybiLogo() {
    var welcome = document.querySelector(".lp-welcome");
    var stage = welcome && welcome.querySelector(".lp-polybi-logo__stage");
    if (!welcome || !stage) return;

    welcome.style.setProperty("--mx", "0");
    welcome.style.setProperty("--my", "0");
    stage.style.setProperty("--holo-angle", "135");

    if (reduced) return;

    var rendered = { x: 0, y: 0 };
    var target = { x: 0, y: 0 };
    var rafId = 0;
    var lastMx = "";
    var lastMy = "";
    var lastAngle = 999;

    function tick() {
      rendered.x += (target.x - rendered.x) * 0.1;
      rendered.y += (target.y - rendered.y) * 0.1;

      var nextMx = rendered.x.toFixed(3);
      var nextMy = rendered.y.toFixed(3);
      if (nextMx !== lastMx || nextMy !== lastMy) {
        welcome.style.setProperty("--mx", nextMx);
        welcome.style.setProperty("--my", nextMy);
        lastMx = nextMx;
        lastMy = nextMy;
      }

      var angle = (Math.atan2(rendered.y, rendered.x) * 180) / Math.PI;
      if (Math.abs(angle - lastAngle) >= 1.2) {
        stage.style.setProperty("--holo-angle", angle.toFixed(1));
        lastAngle = angle;
      }

      if (
        Math.abs(target.x - rendered.x) > 0.003 ||
        Math.abs(target.y - rendered.y) > 0.003
      ) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = 0;
      }
    }

    window.addEventListener(
      "pointermove",
      function (e) {
        var w = window.innerWidth || 1;
        var h = window.innerHeight || 1;
        target.x = (e.clientX / w - 0.5) * 2;
        target.y = (e.clientY / h - 0.5) * 2;
        if (!rafId) rafId = requestAnimationFrame(tick);
      },
      { passive: true }
    );

    document.documentElement.addEventListener("pointerleave", function () {
      target.x = 0;
      target.y = 0;
      lastAngle = 999;
      if (!rafId) rafId = requestAnimationFrame(tick);
    });
  }

  function bootPolybiSectionNav() {
    var logo = document.querySelector("[data-lp-polybi-logo]");
    if (!logo) return;

    var prevBtn = logo.querySelector("[data-lp-universe-prev]");
    var nextBtn = logo.querySelector("[data-lp-universe-next]");
    var kicker = logo.querySelector("[data-lp-polybi-kicker]");
    var heading = logo.querySelector("[data-lp-polybi-heading]");
    var heroArts = logo.querySelectorAll("[data-lp-hero-art]");
    var panels = document.querySelectorAll("[data-lp-universe]");
    if (!prevBtn || !nextBtn || !panels.length) return;

    var order = ["hytale", "works"];
    var meta = {
      hytale: {
        kicker: "Lowpoly 3D & Hytale Creations",
        heading: "Lowpoly 3D & Hytale Creations",
      },
      works: {
        kicker: "Other Lowpoly 3D Works",
        heading: "Other Lowpoly 3D Works",
      },
    };

    var index = 0;

    function applyUniverse(id) {
      if (!meta[id]) return;
      index = order.indexOf(id);
      if (index < 0) index = 0;
      document.body.dataset.lpUniverse = id;

      panels.forEach(function (panel) {
        var active = panel.getAttribute("data-lp-universe") === id;
        panel.hidden = !active;
        panel.classList.toggle("is-active", active);
      });

      heroArts.forEach(function (art) {
        var active = art.getAttribute("data-lp-hero-art") === id;
        art.hidden = !active;
        art.classList.toggle("is-active", active);
      });

      if (kicker) kicker.textContent = meta[id].kicker;
      if (heading) heading.textContent = meta[id].heading;

      if (window.__lenis && typeof window.__lenis.resize === "function") {
        window.__lenis.resize();
      }

      document.dispatchEvent(
        new CustomEvent("lowpoly:universe", { detail: { id: id } })
      );
    }

    function step(delta) {
      var nextIndex = (index + delta + order.length) % order.length;
      applyUniverse(order[nextIndex]);
    }

    prevBtn.addEventListener("click", function () {
      step(-1);
    });

    nextBtn.addEventListener("click", function () {
      step(1);
    });

    applyUniverse("hytale");
  }

  function boot() {
    document.documentElement.classList.add("-ready");
    bootLenis();
    bootInPageLinks();
    bootWelcomeProgress();
    bootPolybiLogo();
    bootPolybiSectionNav();

    var content = document.getElementById("lowpoly-gallery-content");
    if (content) {
      requestAnimationFrame(function () {
        content.classList.add("active");
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
