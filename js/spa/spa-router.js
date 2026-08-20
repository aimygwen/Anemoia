/**
 * spa-router.js
 * History-based SPA routing — clean paths (/work/hytale, /insights/vibes) + legacy map.
 */
(function () {
  "use strict";

  var VERSION = "spa-20";
  var IMPRINT_CANONICAL = "./imprint.html?v=imprint-ins-48";
  var VIEWS = ["start", "work", "insights", "me", "contact"];
  var INSIGHTS_LOGS = ["identity", "workspace", "hytale"];
  var WORK_CATEGORIES = ["lowpoly", "hytale", "stills", "motion"];
  var INSIGHTS_LOG_SLUGS = {
    identity: "vibes",
    workspace: "workspace",
    hytale: "hytale",
  };
  var INSIGHTS_SLUG_TO_LOG = {
    vibes: "identity",
    identity: "identity",
    workspace: "workspace",
    hytale: "hytale",
  };
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

  var SPA_PATH_RE = /\/(start|work|insights|me|contact)(?:\/([^/?#]+))?\/?$/i;

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

  function normalizeLogSlug(raw) {
    if (raw == null || raw === "") return null;
    var slug = String(raw).toLowerCase();
    var mapped = INSIGHTS_SLUG_TO_LOG[slug];
    if (mapped) return normalizeLog(mapped);
    return normalizeLog(slug);
  }

  function logPublicSlug(logId) {
    logId = normalizeLog(logId);
    if (!logId) return null;
    return INSIGHTS_LOG_SLUGS[logId] || logId;
  }

  function normalizeCategory(raw) {
    if (raw == null || raw === "") return null;
    var c = String(raw).toLowerCase();
    if (c === "all") return null;
    return WORK_CATEGORIES.indexOf(c) !== -1 ? c : null;
  }

  function readSearchQuery(url) {
    var query = {};
    url.searchParams.forEach(function (value, key) {
      query[key] = value;
    });
    return query;
  }

  function applyPathSegment(view, segment, query) {
    if (!segment) return;
    var sub = decodeURIComponent(String(segment)).toLowerCase();
    if (view === "work") {
      var category = normalizeCategory(sub);
      if (category) query.category = category;
      return;
    }
    if (view === "insights") {
      var logId = normalizeLogSlug(sub);
      if (logId) query.log = logId;
    }
  }

  function applyLegacySearch(url, query) {
    if (!query.category && url.searchParams.get("category")) {
      var workCat = normalizeCategory(url.searchParams.get("category"));
      if (workCat) query.category = workCat;
    }

    if (!query.log && url.searchParams.get("log")) {
      var logId = normalizeLog(url.searchParams.get("log"));
      if (logId) query.log = logId;
    }

    return (
      url.searchParams.has("category") ||
      url.searchParams.has("log") ||
      url.searchParams.has("view")
    );
  }

  function routeFromUrl(url) {
    var path = url.pathname || "";
    var file = path.split("/").pop() || "";
    var query = readSearchQuery(url);

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
      return { view: legacyView, query: query, legacy: true };
    }

    var qView = url.searchParams.get("view");
    if (qView) {
      return { view: normalizeView(qView), query: query, legacy: true };
    }

    var pathMatch = path.match(SPA_PATH_RE);
    if (pathMatch) {
      var view = normalizeView(pathMatch[1]);
      applyPathSegment(view, pathMatch[2], query);
      return {
        view: view,
        query: query,
        legacy: applyLegacySearch(url, query),
      };
    }

    if (!file || file === "index.html") {
      return {
        view: "start",
        query: query,
        legacy: applyLegacySearch(url, query),
      };
    }

    return null;
  }

  function parseLocation() {
    var route = routeFromUrl(new URL(window.location.href));
    if (route) return route;
    return { view: "start", query: {} };
  }

  function buildUrl(view, query) {
    view = normalizeView(view);
    query = query || {};

    if (view === "start") {
      return "./";
    }

    var parts = [view];

    if (view === "work") {
      var workCat = normalizeCategory(query.category);
      if (workCat) parts.push(workCat);
    } else if (view === "insights") {
      var logSlug = logPublicSlug(query.log);
      if (logSlug) parts.push(logSlug);
    }

    return "./" + parts.join("/");
  }

  function hrefToRoute(href) {
    try {
      var url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return null;
      return routeFromUrl(url);
    } catch (e) {
      return null;
    }
  }

  function canHandle(href) {
    if (!isHost()) return false;
    return !!hrefToRoute(href);
  }

  function locationHasLegacyQuery() {
    var url = new URL(window.location.href);
    return url.searchParams.has("category") || url.searchParams.has("log") || url.searchParams.has("view");
  }

  function urlsMatch(relativeHref) {
    var target = new URL(relativeHref, window.location.href);
    var current = new URL(window.location.href);
    return target.pathname === current.pathname && target.search === current.search && target.hash === current.hash;
  }

  function sanitizeRouteQuery(route) {
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
  }

  function applyRoute(route, replace) {
    if (!window.AimySpaShell || typeof window.AimySpaShell.render !== "function") {
      return Promise.resolve();
    }
    if (route.external) {
      window.location.href = route.external;
      return Promise.resolve();
    }

    sanitizeRouteQuery(route);

    var prior = window.AimySpaState ? window.AimySpaState.get() : null;
    if (window.AimySpaState) {
      window.AimySpaState.setView(route.view, route.query);
    }

    var url = buildUrl(route.view, route.query);
    var forceReplace = replace || route.legacy || locationHasLegacyQuery() || !urlsMatch(url);

    if (forceReplace) {
      window.history.replaceState({ spa: route }, "", url);
    } else {
      window.history.pushState({ spa: route }, "", url);
    }

    return window.AimySpaShell.render(route, {
      animate: !forceReplace,
      initial: !!forceReplace,
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
        window.history.replaceState({}, "", redirectUrl.pathname + redirectUrl.search + redirectUrl.hash);
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
    logPublicSlug: logPublicSlug,
    canHandle: canHandle,
    navigate: navigate,
    goHome: goHome,
    bootFromLocation: bootFromLocation,
    bindLinks: bindLinks,
    normalizeCategory: normalizeCategory,
    normalizeLog: normalizeLog,
    normalizeLogSlug: normalizeLogSlug,
    INSIGHTS_LOGS: INSIGHTS_LOGS,
  };

  window.addEventListener("popstate", onPopState);
})();
