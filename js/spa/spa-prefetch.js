/**
 * spa-prefetch.js
 * Idle warm-up for SPA partials + view assets after first paint.
 */
(function () {
  "use strict";

  var warmed = Object.create(null);
  var booted = false;
  var VIEW_WARM_ORDER = ["work", "insights", "contact"];

  function idle(fn) {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(fn, { timeout: 4500 });
      return;
    }
    window.setTimeout(fn, 1600);
  }

  function warmView(viewId) {
    if (warmed[viewId]) return warmed[viewId];
    if (!window.AimySpaViews || typeof window.AimySpaViews.prepareView !== "function") {
      return Promise.resolve();
    }
    warmed[viewId] = window.AimySpaViews.prepareView(viewId).catch(function () {});
    return warmed[viewId];
  }

  function boot() {
    if (booted) return;
    if (!document.body || !document.body.hasAttribute("data-spa-host")) return;
    booted = true;

    idle(function () {
      VIEW_WARM_ORDER.forEach(function (viewId, index) {
        window.setTimeout(function () {
          warmView(viewId);
        }, index * 700);
      });
    });
  }

  window.AimySpaPrefetch = {
    boot: boot,
    warmView: warmView,
  };

  document.addEventListener("aimy-spa-ready", boot, { once: true });
})();
