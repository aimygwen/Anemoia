/**
 * Polyglide — the site’s weighted Lenis scroller.
 *
 * Slower, smoother free scroll with inertia. Not snap / page-paging.
 * Say “Polyglide” whenever a page should match About / Contact / etc.
 *
 *   Polyglide.boot()  → Lenis instance (also on window.__lenis)
 *   Polyglide.to(el)  → smooth scroll to a target
 *   Polyglide.stop() / .start()
 *   Polyglide.destroy()
 */
(function (global) {
  "use strict";

  var DURATION = 1.15;
  var TOUCH_MULT = 1.1;

  function ease(t) {
    return Math.min(1, 1.001 - Math.pow(2, -10 * t));
  }

  function reducedMotion() {
    return global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function boot(options) {
    options = options || {};

    if (reducedMotion() || typeof global.Lenis === "undefined") {
      global.__lenis = null;
      return null;
    }

    if (global.__lenis && typeof global.__lenis.destroy === "function") {
      try {
        global.__lenis.destroy();
      } catch (e) {}
      global.__lenis = null;
    }

    var lenis = new global.Lenis({
      duration: options.duration != null ? options.duration : DURATION,
      easing: options.easing || ease,
      smoothWheel: options.smoothWheel != null ? options.smoothWheel : true,
      touchMultiplier: options.touchMultiplier != null ? options.touchMultiplier : TOUCH_MULT,
      infinite: false,
    });

    global.__lenis = lenis;
    document.documentElement.classList.add("lenis", "lenis-smooth");

    function raf(time) {
      if (global.__lenis !== lenis) return;
      lenis.raf(time);
      global.requestAnimationFrame(raf);
    }
    global.requestAnimationFrame(raf);

    return lenis;
  }

  function to(target, options) {
    options = options || {};
    var duration = options.duration != null ? options.duration : DURATION;
    var offset = options.offset != null ? options.offset : 0;

    if (global.__lenis && typeof global.__lenis.scrollTo === "function") {
      global.__lenis.scrollTo(target, {
        offset: offset,
        duration: reducedMotion() ? 0.01 : duration,
        onComplete: options.onComplete,
      });
      return;
    }

    if (typeof target === "number") {
      global.scrollTo({
        top: target,
        behavior: reducedMotion() ? "auto" : "smooth",
      });
      return;
    }

    if (target && target.scrollIntoView) {
      target.scrollIntoView({
        behavior: reducedMotion() ? "auto" : "smooth",
        block: options.block || "start",
      });
    }
  }

  function stop() {
    if (global.__lenis && typeof global.__lenis.stop === "function") {
      global.__lenis.stop();
    }
  }

  function start() {
    if (global.__lenis && typeof global.__lenis.start === "function") {
      global.__lenis.start();
    }
  }

  function destroy() {
    if (global.__lenis && typeof global.__lenis.destroy === "function") {
      try {
        global.__lenis.destroy();
      } catch (e) {}
    }
    global.__lenis = null;
    document.documentElement.classList.remove("lenis", "lenis-smooth");
  }

  var api = {
    name: "Polyglide",
    boot: boot,
    to: to,
    stop: stop,
    start: start,
    destroy: destroy,
    DURATION: DURATION,
  };

  global.Polyglide = api;
})(typeof window !== "undefined" ? window : globalThis);
