/**
 * home.js — Start splash: reveal, pointer parallax, viewport units.
 */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var booted = false;
  var resizeHandler = null;
  var splashParallaxCleanup = null;
  var startScrollCleanup = null;
  var splashScrollLagCleanup = null;
  var revealFallbackId = 0;
  /* Fraction of scrollY added as downward translate — wordmark + divider lag vs sky/Lisa. */
  var HERO_SCROLL_LAG = 0.52;

  function setViewportUnits() {
    var h = window.innerHeight || 1;
    var w = window.innerWidth || 1;
    document.documentElement.style.setProperty("--vh", h * 0.01 + "px");
    document.documentElement.style.setProperty("--vw", w * 0.01 + "px");
  }

  function lockSplashScroll() {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.overscrollBehavior = "none";
  }

  function unlockSplashScroll() {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    document.documentElement.style.overscrollBehavior = "";
    document.body.style.overscrollBehavior = "";
  }

  function whenSplashImagesReady(splash, cb) {
    var imgs = splash.querySelectorAll("img");
    var pending = imgs.length;
    var timeoutId;

    if (!pending) {
      cb();
      return;
    }

    function done() {
      pending -= 1;
      if (pending <= 0) {
        if (timeoutId) window.clearTimeout(timeoutId);
        cb();
      }
    }

    imgs.forEach(function (img) {
      if (img.complete) {
        done();
        return;
      }
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    });

    timeoutId = window.setTimeout(cb, 800);
  }

  function clearRevealFallback() {
    if (revealFallbackId) {
      window.clearTimeout(revealFallbackId);
      revealFallbackId = 0;
    }
  }

  function splashImagesReady(splash) {
    var imgs = splash.querySelectorAll("img");
    if (!imgs.length) return true;
    for (var i = 0; i < imgs.length; i++) {
      if (!imgs[i].complete) return false;
    }
    return true;
  }

  function bootSplashReveal(onComplete) {
    var splash = document.querySelector("[data-aimy-splash]");
    var tagline = document.querySelector(".aimy-splash-tagline");
    var divider = document.querySelector(".aimy-splash-divider");
    var stepBeyond = document.querySelector(".aimy-splash-step-beyond");

    if (!splash) {
      onComplete();
      return;
    }

    clearRevealFallback();
    splash.classList.remove("is-revealed");
    if (tagline) tagline.classList.remove("is-revealed");
    if (divider) divider.classList.remove("is-revealed");
    if (stepBeyond) stepBeyond.classList.remove("is-revealed");

    function applyReveal() {
      if (reduced) {
        splash.classList.add("is-revealed");
        if (tagline) tagline.classList.add("is-revealed");
        if (divider) divider.classList.add("is-revealed");
        if (stepBeyond) stepBeyond.classList.add("is-revealed");
        onComplete();
        return;
      }

      splash.classList.add("is-revealed");
      window.setTimeout(function () {
        if (tagline) tagline.classList.add("is-revealed");
        if (divider) divider.classList.add("is-revealed");
        if (stepBeyond) stepBeyond.classList.add("is-revealed");
        onComplete();
      }, 520);
    }

    function scheduleRevealFallback() {
      clearRevealFallback();
      revealFallbackId = window.setTimeout(function () {
        revealFallbackId = 0;
        if (!splash.classList.contains("is-revealed")) {
          applyReveal();
        }
      }, 900);
    }

    if (splashImagesReady(splash)) {
      applyReveal();
      scheduleRevealFallback();
      return;
    }

    whenSplashImagesReady(splash, function () {
      applyReveal();
      scheduleRevealFallback();
    });
  }

  function bootSplashParallax() {
    if (splashParallaxCleanup) {
      splashParallaxCleanup();
      splashParallaxCleanup = null;
    }

    var welcome = document.querySelector(".c-welcome[data-aimy-splash-only]");
    var root = document.documentElement;
    if (!welcome || reduced) return;

    var rendered = { x: 0, y: 0 };
    var target = { x: 0, y: 0 };
    var rafId = 0;
    var lastMx = "";
    var lastMy = "";
    var frameBudget = 0;

    function tick(now) {
      if (!frameBudget) frameBudget = now;
      if (now - frameBudget < 32) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      frameBudget = now;

      rendered.x += (target.x - rendered.x) * 0.12;
      rendered.y += (target.y - rendered.y) * 0.12;

      var mx = rendered.x.toFixed(3);
      var my = rendered.y.toFixed(3);
      if (mx !== lastMx || my !== lastMy) {
        root.style.setProperty("--mx", mx);
        root.style.setProperty("--my", my);
        lastMx = mx;
        lastMy = my;
      }

      if (
        Math.abs(target.x - rendered.x) > 0.004 ||
        Math.abs(target.y - rendered.y) > 0.004
      ) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = 0;
      }
    }

    function onPointerMove(event) {
      var w = window.innerWidth || 1;
      var h = window.innerHeight || 1;
      target.x = (event.clientX / w - 0.5) * 2;
      target.y = (event.clientY / h - 0.5) * 2;
      if (!rafId) rafId = requestAnimationFrame(tick);
    }

    function onPointerLeave() {
      target.x = 0;
      target.y = 0;
      if (!rafId) rafId = requestAnimationFrame(tick);
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    root.style.setProperty("--mx", "0");
    root.style.setProperty("--my", "0");

    splashParallaxCleanup = function () {
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      if (rafId) cancelAnimationFrame(rafId);
      root.style.setProperty("--mx", "0");
      root.style.setProperty("--my", "0");
    };
  }

  function bootAimyChrome() {
    var header = document.querySelector(".site-header[data-aimy-chrome]");
    if (header && header.parentElement !== document.body) {
      document.body.insertBefore(header, document.body.firstChild);
    }
    if (!header) return;

    if (window.Polykroma && typeof window.Polykroma.bootSocialsScroll === "function") {
      window.Polykroma.bootSocialsScroll({ header: header });
    }

    var welcome = document.querySelector(".c-welcome[data-aimy-splash-only]");
    if (!welcome) return;

    function revealChrome() {
      if (
        window.Polykroma &&
        typeof window.Polykroma.bootChromeReveal === "function"
      ) {
        window.Polykroma.bootChromeReveal({ settleMs: 640 });
        return;
      }
      window.setTimeout(revealChrome, 32);
    }

    revealChrome();
  }

  function readSplashScrollY() {
    var lenis = window.__lenis;
    if (lenis) {
      if (typeof lenis.scroll === "number") return lenis.scroll;
      if (typeof lenis.animatedScroll === "number") return lenis.animatedScroll;
    }
    return window.scrollY || 0;
  }

  function bootSplashScrollLag() {
    if (splashScrollLagCleanup) {
      splashScrollLagCleanup();
      splashScrollLagCleanup = null;
    }
    if (reduced) return;

    var splash = document.querySelector(".c-welcome[data-aimy-splash-only]");
    if (!splash) return;

    var lenisHandler = null;

    function apply() {
      var shift = readSplashScrollY() * HERO_SCROLL_LAG;
      splash.style.setProperty("--hero-scroll-shift", shift.toFixed(2) + "px");
    }

    function attachLenis() {
      var lenis = window.__lenis;
      if (!lenis || typeof lenis.on !== "function") {
        window.requestAnimationFrame(attachLenis);
        return;
      }
      lenisHandler = apply;
      lenis.on("scroll", lenisHandler);
      apply();
    }

    splash.style.setProperty("--hero-scroll-shift", "0px");
    attachLenis();

    splashScrollLagCleanup = function () {
      var lenis = window.__lenis;
      if (lenis && lenisHandler && typeof lenis.off === "function") {
        lenis.off("scroll", lenisHandler);
      }
      lenisHandler = null;
      splash.style.removeProperty("--hero-scroll-shift");
    };
  }

  function bootStartScroll() {
    if (startScrollCleanup) {
      startScrollCleanup();
      startScrollCleanup = null;
    }
    if (splashScrollLagCleanup) {
      splashScrollLagCleanup();
      splashScrollLagCleanup = null;
    }

    var target = document.getElementById("step-beyond");
    var link = document.querySelector("[data-aimy-step-beyond]");
    if (!target) return;

    unlockSplashScroll();

    if (window.Polyglide && typeof window.Polyglide.boot === "function") {
      window.Polyglide.boot({ force: true });
    }

    if (window.Polykroma && typeof window.Polykroma.bootChromeSurface === "function") {
      window.Polykroma.bootChromeSurface();
    }

    bootSplashScrollLag();

    if (!link) return;

    function onStepBeyondClick(event) {
      event.preventDefault();
      if (window.Polyglide && typeof window.Polyglide.to === "function") {
        window.Polyglide.to(target, { offset: 0 });
        return;
      }
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    }

    link.addEventListener("click", onStepBeyondClick);
    startScrollCleanup = function () {
      link.removeEventListener("click", onStepBeyondClick);
      if (splashScrollLagCleanup) {
        splashScrollLagCleanup();
        splashScrollLagCleanup = null;
      }
      if (window.Polyglide && typeof window.Polyglide.destroy === "function") {
        window.Polyglide.destroy();
      }
    };
  }

  function isSpaHost() {
    return !!(document.body && document.body.hasAttribute("data-spa-host"));
  }

  function boot(options) {
    if (document.documentElement.classList.contains("spa-route-not-start")) {
      return;
    }
    var force = options && options.force;
    if (booted) {
      if (!force) return;
      teardown();
    }
    booted = true;

    document.body.classList.add("spa-view-start");
    setViewportUnits();
    if (!resizeHandler) {
      resizeHandler = setViewportUnits;
      window.addEventListener("resize", resizeHandler, { passive: true });
    }
    bootAimyChrome();

    bootSplashReveal(function () {
      bootSplashParallax();
      bootStartScroll();
      document.documentElement.classList.add("-loaded", "-ready");
    });
  }

  function teardown() {
    clearRevealFallback();
    booted = false;
    if (splashParallaxCleanup) {
      splashParallaxCleanup();
      splashParallaxCleanup = null;
    }
    if (startScrollCleanup) {
      startScrollCleanup();
      startScrollCleanup = null;
    }
    if (splashScrollLagCleanup) {
      splashScrollLagCleanup();
      splashScrollLagCleanup = null;
    }
    document.body.classList.remove("spa-view-start");
    unlockSplashScroll();
  }

  window.HomeSplash = {
    boot: boot,
    teardown: teardown,
    bootSplashParallax: bootSplashParallax,
    lockScroll: lockSplashScroll,
    unlockScroll: unlockSplashScroll,
  };

  if (!isSpaHost()) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot);
    } else {
      boot();
    }
  }
})();
