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

  function boot() {
    document.documentElement.classList.add("-ready");
    bootLenis();
    bootInPageLinks();
    bootWelcomeProgress();

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
