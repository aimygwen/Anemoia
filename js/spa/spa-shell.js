/**
 * spa-shell.js
 * Viewport orchestration — mount partials, transitions, scroll restore.
 */
(function () {
  "use strict";

  var viewport = null;
  var currentView = null;
  var currentEl = null;
  var booted = false;
  var renderGen = 0;

  function getViewport() {
    if (viewport) return viewport;
    viewport = document.getElementById("app-viewport");
    return viewport;
  }

  function getViewEl(viewId) {
    var vp = getViewport();
    if (!vp) return null;
    return vp.querySelector('[data-spa-view="' + viewId + '"]');
  }

  function ensureViewEl(viewId) {
    var el = getViewEl(viewId);
    if (el) return Promise.resolve(el);

    var vp = getViewport();
    el = document.createElement("div");
    el.className = "spa-view";
    el.setAttribute("data-spa-view", viewId);
    el.hidden = true;
    el.setAttribute("aria-hidden", "true");
    vp.appendChild(el);
    return Promise.resolve(el);
  }

  function mountPartial(viewId, el) {
    var def = window.AimySpaViews.get(viewId);
    var partialUrl = (def && def.partial) || "";

    if (el.dataset.spaMounted === "1" && el.dataset.spaPartialUrl === partialUrl) {
      return window.AimySpaViews.ensureAssets(viewId).then(function () {
        return el;
      });
    }

    if (viewId === "start") {
      return window.AimySpaViews.ensureAssets(viewId).then(function () {
        return el;
      });
    }

    return window.AimySpaViews.prepareView(viewId).then(function (pack) {
      el.innerHTML = pack.html;
      el.dataset.spaMounted = "1";
      el.dataset.spaPartialUrl = partialUrl;
      return el;
    });
  }

  function spaQuerySignature(viewId, query) {
    query = Object.assign({}, query || {});
    if (viewId === "work" && window.AimySpa && typeof window.AimySpa.normalizeCategory === "function") {
      var workCat = window.AimySpa.normalizeCategory(query.category);
      if (workCat) query.category = workCat;
      else delete query.category;
    }
    if (viewId === "insights" && window.AimySpa && typeof window.AimySpa.normalizeLog === "function") {
      var logId = window.AimySpa.normalizeLog(query.log);
      if (logId) query.log = logId;
      else delete query.log;
    }
    return JSON.stringify(query);
  }

  function render(route, options) {
    var viewId = route.view || "start";
    var prevView = currentView;
    var prevEl = currentEl;
    var gen = ++renderGen;
    var nextQuerySig = spaQuerySignature(viewId, route.query || {});
    var priorQuerySig =
      options && options.prior ? spaQuerySignature(viewId, options.prior.query || {}) : null;

    if (
      !(options && options.initial) &&
      prevView === viewId &&
      options &&
      options.prior &&
      priorQuerySig === nextQuerySig
    ) {
      return Promise.resolve();
    }

    /* Work chooser ↔ category — update in place, no SPA view transition. */
    if (
      !(options && options.initial) &&
      prevView === "work" &&
      viewId === "work" &&
      options &&
      options.prior &&
      priorQuerySig !== nextQuerySig &&
      (prevEl || getViewEl("work"))
    ) {
      if (window.AimySpaState) {
        window.AimySpaState.rememberScroll("work");
      }

      var workDef = window.AimySpaViews.get("work");
      var workMount =
        workDef && typeof workDef.mount === "function"
          ? workDef.mount({ view: "work", query: route.query || {} })
          : Promise.resolve();

      return Promise.resolve(workMount).then(function () {
        if (gen !== renderGen) return;

        currentView = "work";
        currentEl = prevEl || getViewEl("work");

        window.scrollTo(0, 0);
        if (window.Polyglide && typeof window.Polyglide.to === "function") {
          window.Polyglide.to(0, { duration: 0.01 });
        }
        if (window.AimySpaNav) window.AimySpaNav.syncMenu("work");
        if (window.AimySpaA11y) {
          window.AimySpaA11y.setDocumentTitle("work", route.query || {});
          window.AimySpaA11y.announce("work");
        }
      });
    }

    var animate = !(options && options.animate === false);
    if (viewId === "work" || prevView === "work") {
      animate = false;
    }

    if (prevView && window.AimySpaState) {
      window.AimySpaState.rememberScroll(prevView);
    }

    if (window.AimySpaPrefetch && typeof window.AimySpaPrefetch.warmView === "function") {
      window.AimySpaPrefetch.warmView(viewId);
    }

    return ensureViewEl(viewId)
      .then(function (el) {
        if (gen !== renderGen) return null;
        return mountPartial(viewId, el).then(function () {
          return el;
        });
      })
      .then(function (nextEl) {
        if (!nextEl || gen !== renderGen) return;

        if (prevView && prevView !== viewId) {
          var prevDef = window.AimySpaViews.get(prevView);
          if (prevDef && typeof prevDef.unmount === "function") prevDef.unmount();
        } else if (prevView === viewId && options && options.prior) {
          if (priorQuerySig !== nextQuerySig) {
            var sameDef = window.AimySpaViews.get(viewId);
            var queryOnly = viewId === "work" || viewId === "insights";
            if (sameDef && typeof sameDef.unmount === "function" && !queryOnly) {
              sameDef.unmount();
            }
          }
        }

        var runTransition = function () {
          if (prevEl && nextEl && prevEl === nextEl) {
            return Promise.resolve();
          }
          if (animate && window.AimySpaTransitions) {
            return window.AimySpaTransitions.transition(prevEl, nextEl);
          }
          if (window.AimySpaTransitions) {
            if (prevEl) window.AimySpaTransitions.setViewVisibility(prevEl, false);
            window.AimySpaTransitions.setViewVisibility(nextEl, true);
          }
          return Promise.resolve();
        };

        return runTransition().then(function () {
          if (gen !== renderGen) return;

          document.querySelectorAll("#app-viewport .spa-view").forEach(function (viewEl) {
            if (viewEl !== nextEl && window.AimySpaTransitions) {
              window.AimySpaTransitions.setViewVisibility(viewEl, false);
            }
          });
          if (window.AimySpaTransitions) {
            window.AimySpaTransitions.setViewVisibility(nextEl, true);
          }

          currentView = viewId;
          currentEl = nextEl;

          if (window.AimySpaViews && typeof window.AimySpaViews.resetBodyState === "function") {
            window.AimySpaViews.resetBodyState();
          }

          var def = window.AimySpaViews.get(viewId);
          if (def && typeof def.mount === "function") {
            var mountResult = def.mount({ view: viewId, query: route.query || {} });
            if (mountResult && typeof mountResult.then === "function") {
              return mountResult;
            }
          }
        }).then(function () {
          if (gen !== renderGen) return;

          if (window.AimySpaNav) window.AimySpaNav.syncMenu(viewId);
          if (window.AimySpaA11y) {
            window.AimySpaA11y.setDocumentTitle(viewId, route.query || {});
            window.AimySpaA11y.announce(viewId);
          }

          if (viewId !== prevView) {
            window.scrollTo(0, 0);
            if (window.Polyglide && typeof window.Polyglide.to === "function") {
              window.Polyglide.to(0, { duration: 0.01 });
            }
          } else if (window.AimySpaState) {
            var priorSig =
              options && options.prior ? spaQuerySignature(viewId, options.prior.query || {}) : null;
            if (priorSig !== nextQuerySig) {
              window.scrollTo(0, 0);
              if (window.Polyglide && typeof window.Polyglide.to === "function") {
                window.Polyglide.to(0, { duration: 0.01 });
              }
            } else {
              window.AimySpaState.restoreScroll(viewId);
            }
          }
        });
      })
      .catch(function (err) {
        if (gen !== renderGen) return;
        console.error("[AimySpaShell] render failed:", err);
      });
  }

  function hookPageTransition() {
    if (!window.AimyPageTransition || window.AimyPageTransition.__spaHooked) return;
    var original = window.AimyPageTransition.navigate;
    window.AimyPageTransition.navigate = function (href) {
      if (window.AimySpa && window.AimySpa.canHandle(href)) {
        return window.AimySpa.navigate(href);
      }
      return original.call(window.AimyPageTransition, href);
    };
    window.AimyPageTransition.__spaHooked = true;
  }

  function markReady() {
    if (window.AimySpaState) window.AimySpaState.setReady(true);
    document.dispatchEvent(new CustomEvent("aimy-spa-ready"));
  }

  function boot() {
    if (booted || !window.AimySpa || !window.AimySpa.isHost()) return;
    booted = true;
    hookPageTransition();

    var vp = getViewport();
    if (!vp) return;

    var startEl = getViewEl("start");
    if (startEl) {
      startEl.classList.add("spa-view--active");
      startEl.hidden = false;
      startEl.setAttribute("aria-hidden", "false");
      currentEl = startEl;
      currentView = "start";
    }

    if (window.AimySpaNav) window.AimySpaNav.inject();
    if (window.Polykroma && typeof window.Polykroma.bootChromeReveal === "function") {
      window.Polykroma.bootChromeReveal({ settleMs: 420 });
    }
    window.AimySpa.bindLinks();

    var route = window.AimySpa.parseLocation();

    if (route.view !== "start" && startEl) {
      startEl.hidden = true;
      startEl.classList.remove("spa-view--active");
      startEl.setAttribute("aria-hidden", "true");
      currentEl = null;
    }

    var bootPromise = window.AimySpa.bootFromLocation(true);

    bootPromise.then(markReady);
  }

  window.AimySpaShell = {
    render: render,
    boot: boot,
    getCurrentView: function () {
      return currentView;
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
