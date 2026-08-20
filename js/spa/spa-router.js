/**
 * spa-router.js
 * History-based SPA routing — clean paths (/work/hytale, /insights/vibes) + legacy map.
 */
(function () {
  "use strict";

  var VERSION = "spa-23";
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
  var spaBaseCached = null;

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

  /** Site root prefix — derived from spa-router.js absolute URL (respects <base>). */
  function detectSpaBase() {
    if (spaBaseCached != null) return spaBaseCached;

    if (typeof window.__aimySiteBase === "string") {
      spaBaseCached = window.__aimySiteBase.replace(/\/+$/, "");
      return spaBaseCached;
    }

    var scripts = document.getElementsByTagName("script");
    var i;
    for (i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || scripts[i].getAttribute("src");
      if (!src || src.indexOf("spa-router.js") === -1) continue;
      try {
        var scriptUrl = src.indexOf("://") !== -1 ? new URL(src) : new URL(src, document.baseURI);
        spaBaseCached = scriptUrl.pathname.replace(/\/js\/spa\/spa-router\.js.*$/i, "") || "";
        return spaBaseCached;
      } catch (e) {}
    }

    spaBaseCached = "";
    return spaBaseCached;
  }

  function normalizePathname(pathname) {
    pathname = (pathname || "/").replace(/\/index\.html$/i, "");
    pathname = pathname.replace(/\/+$/, "");
    return pathname || "/";
  }

  function stripSpaBase(pathname) {
    var base = detectSpaBase();
    pathname = normalizePathname(pathname);
    if (base && pathname.indexOf(base) === 0) {
      pathname = pathname.slice(base.length) || "/";
    }
    return normalizePathname(pathname);
  }

  function parseSpaSegments(pathname) {
    var path = stripSpaBase(pathname);
    if (path === "/") {
      return { view: "start", sub: null };
    }

    var segments = path.split("/").filter(Boolean);
    var viewIdx = -1;
    var i;
    for (i = 0; i < segments.length; i++) {
      if (VIEWS.indexOf(segments[i].toLowerCase()) !== -1) {
        viewIdx = i;
      }
    }

    if (viewIdx === -1) return null;

    return {
      view: normalizeView(segments[viewIdx]),
      sub: segments[viewIdx + 1]
        ? decodeURIComponent(String(segments[viewIdx + 1])).toLowerCase()
        : null,
    };
  }

  function resolveSpaHref(href) {
    if (!href) return href;
    if (/^(https?:|mailto:|tel:)/i.test(href)) return href;
    if (href.charAt(0) === "/") return href;
    if (href.indexOf("./") === 0) {
      return detectSpaBase() + href.slice(1);
    }
    return href;
  }

  function sanitizeRouteQuery(route) {
    var clean = {};
    if (!route || !route.query) {
      route.query = clean;
      return;
    }

    if (route.view === "work") {
      var workCat = normalizeCategory(route.query.category);
      if (workCat) clean.category = workCat;
    } else if (route.view === "insights") {
      var logId = normalizeLog(route.query.log);
      if (logId) clean.log = logId;
    }

    route.query = clean;
  }

  function applyPathSegment(view, segment, query) {
    if (!segment) return;
    if (view === "work") {
      var category = normalizeCategory(segment);
      if (category) query.category = category;
      return;
    }
    if (view === "insights") {
      var logId = normalizeLogSlug(segment);
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

    if (/\/(imprint|legal)\/?$/i.test(path)) {
      return { view: "start", query: {}, external: IMPRINT_CANONICAL + (url.hash || "") };
    }

    if (LEGACY_PATHS[file]) {
      var legacyView = LEGACY_PATHS[file];
      if (legacyView === "imprint" || legacyView === "legal") {
        return { view: "start", query: {}, external: IMPRINT_CANONICAL + (url.hash || "") };
      }
      if (legacyView === "about") {
        return { view: "start", query: {}, external: "./" + file };
      }
      var legacyQuery = {};
      if (legacyView === "work" && LEGACY_WORK_CATEGORY[file]) {
        legacyQuery.category = LEGACY_WORK_CATEGORY[file];
      }
      return { view: legacyView, query: legacyQuery, legacy: true };
    }

    var qView = url.searchParams.get("view");
    if (qView) {
      var viewQuery = {};
      applyLegacySearch(url, viewQuery);
      return { view: normalizeView(qView), query: viewQuery, legacy: true };
    }

    var parsed = parseSpaSegments(path);
    if (parsed) {
      var query = {};
      applyPathSegment(parsed.view, parsed.sub, query);
      return {
        view: parsed.view,
        query: query,
        legacy: applyLegacySearch(url, query),
      };
    }

    if (!file || file === "index.html") {
      var startQuery = {};
      return {
        view: "start",
        query: startQuery,
        legacy: applyLegacySearch(url, startQuery),
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
    var base = detectSpaBase();

    if (view === "start") {
      return (base || "") + "/";
    }

    var parts = [view];

    if (view === "work") {
      var workCat = normalizeCategory(query.category);
      if (workCat) parts.push(workCat);
    } else if (view === "insights") {
      var logSlug = logPublicSlug(query.log);
      if (logSlug) parts.push(logSlug);
    }

    return base + "/" + parts.join("/");
  }

  function pathForRoute(view, query) {
    return normalizePathname(new URL(buildUrl(view, query), window.location.origin).pathname);
  }

  function hrefToRoute(href) {
    try {
      href = resolveSpaHref(href);
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

  function routesEqual(a, b) {
    if (!a || !b) return false;
    if (a.view !== b.view) return false;

    var aq = Object.assign({}, a.query || {});
    var bq = Object.assign({}, b.query || {});
    sanitizeRouteQuery({ view: a.view, query: aq });
    sanitizeRouteQuery({ view: b.view, query: bq });

    if (a.view === "work") {
      return normalizeCategory(aq.category) === normalizeCategory(bq.category);
    }
    if (a.view === "insights") {
      return normalizeLog(aq.log) === normalizeLog(bq.log);
    }
    return true;
  }

  function syncHistory(route, replace) {
    var url = buildUrl(route.view, route.query);
    var currentPath = normalizePathname(window.location.pathname);
    var targetPath = pathForRoute(route.view, route.query);
    var legacy = !!(route.legacy || locationHasLegacyQuery());
    var pathMismatch = currentPath !== targetPath;

    if (legacy || pathMismatch) {
      window.history.replaceState({ spa: route }, "", url);
      return true;
    }

    if (replace) {
      window.history.replaceState({ spa: route }, "", url);
      return true;
    }

    window.history.pushState({ spa: route }, "", url);
    return false;
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

    var forceReplace = syncHistory(route, replace);

    return window.AimySpaShell.render(route, {
      animate: !forceReplace && !replace,
      initial: !!forceReplace || !!replace,
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

    window.history.replaceState({ spa: { view: "start", query: {} } }, "", buildUrl("start", {}));

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

    return navigate(buildUrl("start", {}), options);
  }

  function navigate(href, options) {
    if (!isHost()) {
      window.location.href = href;
      return Promise.resolve();
    }

    href = resolveSpaHref(href);
    var route = hrefToRoute(href);
    if (!route) {
      window.location.href = href;
      return Promise.resolve();
    }

    sanitizeRouteQuery(route);

    var state = window.AimySpaState ? window.AimySpaState.get() : null;
    if (state && routesEqual({ view: state.view, query: state.query }, route)) {
      syncHistory(route, true);
      return Promise.resolve();
    }

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
        var route = routeFromUrl(redirectUrl);
        if (route) {
          sanitizeRouteQuery(route);
          window.history.replaceState({ spa: route }, "", buildUrl(route.view, route.query));
        } else {
          window.history.replaceState({}, "", redirectUrl.pathname + redirectUrl.search + redirectUrl.hash);
        }
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
      if (anchor.hasAttribute("data-work-pick")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      var href = anchor.getAttribute("href");
      if (!href || href.charAt(0) === "#") return;
      var spaHref = resolveSpaHref(href);
      if (!canHandle(spaHref)) return;
      e.preventDefault();
      navigate(spaHref);
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
