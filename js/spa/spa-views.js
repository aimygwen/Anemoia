/**
 * spa-views.js
 * View registry — partial paths, assets, mount/teardown hooks.
 */
(function () {
  "use strict";

  var loadedCss = {};
  var loadedJs = {};
  var partialCache = {};

  function loadCss(href) {
    if (loadedCss[href]) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.onload = function () {
        loadedCss[href] = true;
        resolve();
      };
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }

  function loadScript(src) {
    if (loadedJs[src]) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = src;
      script.defer = true;
      script.onload = function () {
        loadedJs[src] = true;
        resolve();
      };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  function noop() {}

  function unlockPageScroll() {
    document.documentElement.style.overflow = "";
    document.documentElement.style.overscrollBehavior = "";
    document.body.style.overflow = "";
    document.body.style.height = "";
    document.body.style.overscrollBehavior = "";
  }

  function lockPageScroll() {
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.overflow = "hidden";
    document.body.style.height = "100%";
    document.body.style.overscrollBehavior = "none";
  }

  function ensureScroll() {
    unlockPageScroll();
    if (!window.Polyglide) return;
    if (window.__lenis && typeof window.Polyglide.start === "function") {
      window.Polyglide.start();
      return;
    }
    if (typeof window.Polyglide.boot === "function") {
      window.Polyglide.boot();
    }
  }

  function stopScroll() {
    if (window.Polyglide && typeof window.Polyglide.stop === "function") {
      window.Polyglide.stop();
    }
  }

  function haltScroll() {
    stopScroll();
  }

  function resetBodyState() {
    document.body.classList.remove("spa-work-choose");
    unlockPageScroll();
    var brand = document.querySelector(".site-header[data-aimy-chrome] .brand");
    if (brand) brand.classList.remove("is-logo-blurred");
  }

  var registry = {
    start: {
      partial: null,
      css: [],
      js: [],
      mount: function (ctx) {
        resetBodyState();
        document.documentElement.classList.remove("spa-route-not-start");
        document.body.classList.add("spa-view-start");
        document.body.classList.remove(
          "spa-view-work",
          "spa-view-insights",
          "spa-view-me",
          "spa-view-contact",
          "spa-view-imprint"
        );
        stopScroll();
        if (window.SpaPages && window.SpaPages.start && typeof window.SpaPages.start.mount === "function") {
          window.SpaPages.start.mount(ctx);
        }
      },
      unmount: function () {
        if (window.SpaPages && window.SpaPages.start && typeof window.SpaPages.start.unmount === "function") {
          window.SpaPages.start.unmount();
        }
        document.body.classList.remove("spa-view-start");
        unlockPageScroll();
      },
    },
    work: {
      partial: "./partials/view-work.html?v=spa-53",
      css: [
        "./css/spa/spa-scaffold.css?v=spa-29",
        "./css/spa/spa-work.css?v=spa-71",
      ],
      js: ["./js/spa/views/view-work.js?v=spa-95"],
      mount: function (ctx) {
        resetBodyState();
        document.documentElement.classList.add("spa-route-not-start");
        document.body.classList.add("spa-view-work");
        document.body.classList.remove("spa-view-start", "spa-view-insights", "spa-view-me", "spa-view-contact", "spa-view-imprint");
        if (ctx && ctx.query && ctx.query.category) {
          ensureScroll();
        } else {
          lockPageScroll();
          haltScroll();
        }
        if (window.SpaPages && window.SpaPages.work && typeof window.SpaPages.work.mount === "function") {
          return window.SpaPages.work.mount(ctx);
        }
        return Promise.resolve();
      },
      unmount: function () {
        if (window.SpaPages && window.SpaPages.work && typeof window.SpaPages.work.unmount === "function") {
          window.SpaPages.work.unmount();
        }
        document.body.classList.remove("spa-view-work");
        resetBodyState();
      },
    },
    insights: {
      css: [
        "./css/wordmark-holo.css?v=wordmark-holo-2",
        "./css/insights-poke-ref.css?v=poke-ref-11",
        "./css/insights.css?v=insights-146",
      ],
      partial: "./partials/view-insights.html?v=insights-77",
      js: [
        "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js",
        "./js/wordmark-holo.js?v=wordmark-holo-4",
        "./js/insights.js?v=insights-47",
        "./js/spa/views/view-insights.js?v=insights-35",
      ],
      mount: function (ctx) {
        resetBodyState();
        document.documentElement.classList.add("spa-route-not-start");
        document.body.classList.add("spa-view-insights", "insights-page-body");
        document.body.classList.remove(
          "spa-view-start",
          "spa-view-work",
          "spa-view-me",
          "spa-view-contact",
          "spa-view-imprint"
        );
        ensureScroll();
        if (window.SpaPages && window.SpaPages.insights && typeof window.SpaPages.insights.mount === "function") {
          window.SpaPages.insights.mount(ctx);
        }
      },
      unmount: function () {
        if (window.SpaPages && window.SpaPages.insights && typeof window.SpaPages.insights.unmount === "function") {
          window.SpaPages.insights.unmount();
        }
        document.body.classList.remove("spa-view-insights", "insights-page-body");
      },
    },
    me: {
      partial: "./partials/view-me.html?v=me-1",
      css: [
        "./css/about.css?v=about-spa-4",
        "./css/about-sheet.css?v=about-hud-stage-17",
      ],
      js: [
        "./js/about.js?v=about-spa-2",
        "./js/spa/views/view-me.js?v=me-2",
      ],
      mount: function (ctx) {
        resetBodyState();
        document.documentElement.classList.add("spa-route-not-start");
        document.body.classList.add("spa-view-me", "about-page-body");
        document.body.classList.remove(
          "spa-view-start",
          "spa-view-work",
          "spa-view-insights",
          "spa-view-contact",
          "spa-view-imprint",
          "imprint-page-body",
          "insights-page-body"
        );
        ensureScroll();
        if (window.SpaPages && window.SpaPages.me && typeof window.SpaPages.me.mount === "function") {
          window.SpaPages.me.mount(ctx);
        }
      },
      unmount: function () {
        if (window.SpaPages && window.SpaPages.me && typeof window.SpaPages.me.unmount === "function") {
          window.SpaPages.me.unmount();
        }
        document.body.classList.remove("spa-view-me", "about-page-body");
      },
    },
    imprint: {
      partial: "./partials/view-imprint.html?v=imprint-1",
      css: [
        "./css/insights.css?v=insights-146",
        "./css/imprint.css?v=imprint-ins-51",
      ],
      js: [
        "./js/imprint.js?v=imprint-spa-2",
        "./js/spa/views/view-imprint.js?v=imprint-1",
      ],
      mount: function (ctx) {
        resetBodyState();
        document.documentElement.classList.add("spa-route-not-start", "spa-route-imprint");
        document.body.classList.add("spa-view-imprint", "imprint-page-body", "insights-page-body");
        document.body.classList.remove(
          "spa-view-start",
          "spa-view-work",
          "spa-view-insights",
          "spa-view-me",
          "spa-view-contact",
          "about-page-body"
        );
        ensureScroll();
        if (window.SpaPages && window.SpaPages.imprint && typeof window.SpaPages.imprint.mount === "function") {
          window.SpaPages.imprint.mount(ctx);
        }
      },
      unmount: function () {
        if (window.SpaPages && window.SpaPages.imprint && typeof window.SpaPages.imprint.unmount === "function") {
          window.SpaPages.imprint.unmount();
        }
        document.documentElement.classList.remove("spa-route-imprint");
        document.body.classList.remove("spa-view-imprint", "imprint-page-body", "insights-page-body");
      },
    },
    contact: {
      partial: "./partials/view-contact.html?v=contact-17",
      css: ["./css/spa/spa-contact.css?v=contact-19"],
      js: ["./js/spa/views/view-contact.js?v=contact-15"],
      mount: function (ctx) {
        resetBodyState();
        document.documentElement.classList.add("spa-route-not-start");
        document.body.classList.add("spa-view-contact", "contact-page-body");
        document.body.classList.remove("spa-view-start", "spa-view-work", "spa-view-insights", "spa-view-me", "spa-view-imprint");
        haltScroll();
        lockPageScroll();
        window.scrollTo(0, 0);
        if (window.Polyglide && typeof window.Polyglide.to === "function") {
          window.Polyglide.to(0, { duration: 0.01 });
        }
        if (window.SpaPages && window.SpaPages.contact && typeof window.SpaPages.contact.mount === "function") {
          window.SpaPages.contact.mount(ctx);
        }
      },
      unmount: function () {
        document.body.classList.remove("contact-page-body");
        if (window.SpaPages && window.SpaPages.contact && typeof window.SpaPages.contact.unmount === "function") {
          window.SpaPages.contact.unmount();
        }
        unlockPageScroll();
      },
    },
  };

  function get(viewId) {
    return registry[viewId] || registry.start;
  }

  function ensureAssets(viewId) {
    var def = get(viewId);
    var jobs = (def.css || []).map(loadCss).concat((def.js || []).map(loadScript));
    return Promise.all(jobs);
  }

  function fetchPartial(viewId) {
    var def = get(viewId);
    var partialUrl = def.partial || "";
    var cacheKey = viewId + "|" + partialUrl;
    if (partialCache[cacheKey]) return Promise.resolve(partialCache[cacheKey]);
    if (!partialUrl) return Promise.resolve("");
    return fetch(partialUrl)
      .then(function (res) {
        if (!res.ok) throw new Error("partial fetch failed");
        return res.text();
      })
      .then(function (text) {
        partialCache[cacheKey] = text;
        return text;
      });
  }

  function prepareView(viewId) {
    var def = get(viewId);
    var assetJob = ensureAssets(viewId);
    if (!def.partial) {
      return assetJob.then(function () {
        return { html: "" };
      });
    }
    return Promise.all([assetJob, fetchPartial(viewId)]).then(function (results) {
      return { html: results[1] };
    });
  }

  window.AimySpaViews = {
    get: get,
    ensureAssets: ensureAssets,
    fetchPartial: fetchPartial,
    prepareView: prepareView,
    ensureScroll: ensureScroll,
    lockPageScroll: lockPageScroll,
    unlockPageScroll: unlockPageScroll,
    stopScroll: stopScroll,
    haltScroll: haltScroll,
    resetBodyState: resetBodyState,
  };
})();
