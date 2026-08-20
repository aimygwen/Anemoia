/**
 * spa-router.js
 * History-based SPA routing, legacy URL map, deep links (?category=).
 */
(function () {
  "use strict";

  var VERSION = "spa-18";
  var IMPRINT_CANONICAL = "./imprint.html?v=imprint-ins-48";
  var VIEWS = ["start", "work", "insights", "me", "contact"];
  var INSIGHTS_LOGS = ["identity", "workspace", "hytale"];
  var WORK_CATEGORIES = ["lowpoly", "hytale", "stills", "motion"];
  var navigating = false;

  var LEGACY_PATHS = {
    "index.html": "start",
    "lowpoly.html": "work",
    "gallery.html": "work",
    "about.html": "about",
    "insights.html": "insights",
    "contact.html": "contact",
    "imprint.html": "imprint",
    "legal.html": "legal",
  };

  var LEGACY_WORK_CATEGORY = {
    "lowpoly.html": "lowpoly",
    "gallery.html": "stills",
  };

  function isHost() {
    return document.body && document.body.hasAttribute("data-spa-host");
  }

  function normalizeView(id) {
    id = String(id || "start").toLowerCase();
    return VIEWS.indexOf(id) !== -1 ? id : "start";
  }

  function normalizeLog(raw) {
    if (raw == null || raw === "") return null;
    var id = String(raw).toLowerCase();
    return INSIGHTS_LOGS.indexOf(id) !== -1 ? id : null;
  }

  function normalizeCategory(raw) {
    if (raw == null || raw === "") return null;
    var c = String(raw).toLowerCase();
    if (c === "all") return null;
    return WORK_CATEGORIES.indexOf(c) !== -1 ? c : null;
  }

  function parseLocation() {
    var url = new URL(window.location.href);
    var path = url.pathname || "";
    var file = path.split("/").pop() || "";
    var query = {};

    url.searchParams.forEach(function (value, key) {
      query[key] = value;
    });

    var qView = url.searchParams.get("view");
    if (qView) {
      return { view: normalizeView(qView), query: query };
    }

    var pathMatch = path.match(/\/(start|work|insights|me|contact)\/?$/i);
    if (pathMatch) {
      return { view: normalizeView(pathMatch[1]), query: query };
    }

    if (/\/(imprint|legal)\/?$/i.test(path)) {
      return { view: "start", query: query, external: IMPRINT_CANONICAL + (url.hash || "") };
    }

    if (LEGACY_PATHS[file]) {
      var legacyView = LEGACY_PATHS[file];
      if (legacyView === "imprint" || legacyView === "legal") {
        return { view: "start", query: query, external: IMPRINT_CANONICAL + (url.hash || "") };
      }
      if (legacyView === "about") {
        return { view: "start", query: query, external: "./" + file };
      }
      if (legacyView === "work" && LEGACY_WORK_CATEGORY[file]) {
        query.category = LEGACY_WORK_CATEGORY[file];
      }
      return { view: legacyView, query: query };
    }

    if (!file || file === "index.html") {
      return { view: "start", query: query };
    }

    return { view: "start", query: query };
  }

  function buildUrl(view, query) {
    view = normalizeView(view);
    query = query || {};

    if (view === "start") {
      return "./";
    }

    var url = new URL("./" + view, window.location.href);
    Object.keys(query).forEach(function (key) {
      if (key === "view") return;
      if (query[key] != null && query[key] !== "") {
        url.searchParams.set(key, query[key]);
      }
    });

    if (view === "work") {
      var workCat = normalizeCategory(query.category);
      if (workCat) url.searchParams.set("category", workCat);
      else url.searchParams.delete("category");
    }

    if (view === "insights") {
      var logId = normalizeLog(query.log);
      if (logId) url.searchParams.set("log", logId);
      else url.searchParams.delete("log");
    }

    return url.pathname.split("/").pop() + url.search;
  }

  function hrefToRoute(href) {
    try {
      var url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return null;

      var path = url.pathname || "";
      var file = path.split("/").pop() || "";
      var query = {};
      url.searchParams.forEach(function (value, key) {
        query[key] = value;
      });

      var qView = url.searchParams.get("view");
      if (qView) {
        return { view: normalizeView(qView), query: query };
      }

      var pathMatch = path.match(/\/(start|work|insights|me|contact)\/?$/i);
      if (pathMatch) {
        return { view: normalizeView(pathMatch[1]), query: query };
      }

      if (LEGACY_PATHS[file]) {
        var legacyView = LEGACY_PATHS[file];
        if (legacyView === "imprint" || legacyView === "legal" || legacyView === "about") return null;
        if (legacyView === "work" && LEGACY_WORK_CATEGORY[file]) {
          query.category = LEGACY_WORK_CATEGORY[file];
        }
        return { view: legacyView, query: query };
      }

      if (!file || file === "index.html" || file === "") {
        return { view: "start", query: query };
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  function canHandle(href) {
    if (!isHost()) return false;
    return !!hrefToRoute(href);
  }

  function applyRoute(route, replace) {
    if (!window.AimySpaShell || typeof window.AimySpaShell.render !== "function") {
      return Promise.resolve();
    }
    if (route.external) {
      window.location.href = route.external;
      return Promise.resolve();
    }
    if (route.view === "work") {
      var workCat = normalizeCategory(route.query.category);
      if (workCat) route.query.category = workCat;
      else delete route.query.category;
    }
    if (route.view === "insights") {
      var logId = normalizeLog(route.query.log);
      if (logId) route.query.log = logId;
      else delete route.query.log;
    }
    var prior = window.AimySpaState ? window.AimySpaState.get() : null;
    if (window.AimySpaState) {
      window.AimySpaState.setView(route.view, route.query);
    }
    var url = buildUrl(route.view, route.query);
    if (replace) {
      window.history.replaceState({ spa: route }, "", url);
    } else {
      window.history.pushState({ spa: route }, "", url);
    }
    return window.AimySpaShell.render(route, {
      animate: !replace,
      initial: !!replace,
      prior: prior,
    });
  }

  function resetStartView() {
    if (typeof window.__aimyCloseMenu === "function") {
      window.__aimyCloseMenu({ restoreFocus: false });
    }

    var brand = document.querySelector(".site-header[data-aimy-chrome] .brand");
    if (brand) brand.classList.remove("is-logo-blurred");

    window.scrollTo(0, 0);
    if (window.Polyglide && typeof window.Polyglide.to === "function") {
      window.Polyglide.to(0, { duration: 0.01 });
    }

    if (window.HomeSplash && typeof window.HomeSplash.boot === "function") {
      window.HomeSplash.boot({ force: true });
    }

    if (window.AimySpaState) {
      window.AimySpaState.setView("start", {});
    }

    window.history.replaceState({ spa: { view: "start", query: {} } }, "", "./");

    if (window.AimySpaNav) window.AimySpaNav.syncMenu("start");
    if (window.AimySpaA11y) {
      window.AimySpaA11y.setDocumentTitle("start");
    }

    return Promise.resolve();
  }

  function goHome(options) {
    if (!isHost()) {
      window.location.href = "./";
      return Promise.resolve();
    }

    var state = window.AimySpaState ? window.AimySpaState.get() : null;
    if (state && state.view === "start") {
      return resetStartView();
    }

    return navigate("./", options);
  }

  function navigate(href, options) {
    if (!isHost()) {
      window.location.href = href;
      return Promise.resolve();
    }
    var route = hrefToRoute(href);
    if (!route) {
      window.location.href = href;
      return Promise.resolve();
    }
    var state = window.AimySpaState ? window.AimySpaState.get() : null;
    var workHubToggle = state && state.view === "work" && route.view === "work";
    var insightsLogsToggle = state && state.view === "insights" && route.view === "insights";
    var goingHome = route.view === "start";
    if (navigating && !workHubToggle && !insightsLogsToggle && !goingHome) {
      return Promise.resolve();
    }
    if (state && state.view === "start" && route.view === "start") {
      return resetStartView();
    }
    navigating = true;
    return applyRoute(route, !!(options && options.replace)).finally(function () {
      navigating = false;
    });
  }

  function bootFromLocation(replace) {
    var stored = sessionStorage.getItem("aimySpaRedirect");
    if (stored) {
      sessionStorage.removeItem("aimySpaRedirect");
      try {
        var redirectUrl = new URL(stored, window.location.href);
        window.history.replaceState({}, "", redirectUrl.pathname + redirectUrl.search);
      } catch (e) {}
    }
    var route = parseLocation();
    return applyRoute(route, replace !== false);
  }

  function onPopState() {
    var route = parseLocation();
    applyRoute(route, true);
  }

  function bindLinks() {
    document.addEventListener("click", function (e) {
      if (!isHost()) return;
      if (e.defaultPrevented) return;
      var anchor = e.target && e.target.closest ? e.target.closest("a[href]") : null;
      if (!anchor) return;
      if (anchor.hasAttribute("data-no-spa")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      var href = anchor.getAttribute("href");
      if (!href || href.charAt(0) === "#") return;
      if (!canHandle(anchor.href || href)) return;
      e.preventDefault();
      navigate(anchor.href || href);
    });
  }

  window.AimySpa = {
    VERSION: VERSION,
    VIEWS: VIEWS,
    WORK_CATEGORIES: WORK_CATEGORIES,
    isHost: isHost,
    isActive: isHost,
    getView: function () {
      return window.AimySpaState ? window.AimySpaState.get().view : "start";
    },
    parseLocation: parseLocation,
    buildUrl: buildUrl,
    canHandle: canHandle,
    navigate: navigate,
    goHome: goHome,
    bootFromLocation: bootFromLocation,
    bindLinks: bindLinks,
    normalizeCategory: normalizeCategory,
    normalizeLog: normalizeLog,
    INSIGHTS_LOGS: INSIGHTS_LOGS,
  };

  window.addEventListener("popstate", onPopState);
})();
