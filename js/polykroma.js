/**
 * Band page transition for multi-page navigations.
 * Exposes window.AimyPageTransition.navigate(href) for the coin menu.
 */
(function () {
  "use strict";

  var FLAG = "aimy-page-transition";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var navigating = false;
  var prefetched = Object.create(null);

  var TRANSITION = {
    primary: "#E43EFF",
    trails: ["#B24BFB", "#ffeab0", "#2dd4bf"],
  };

  function isSpaHost() {
    return !!(document.body && document.body.hasAttribute("data-spa-host"));
  }

  function sameOrigin(href) {
    try {
      var url = new URL(href, window.location.href);
      return url.origin === window.location.origin;
    } catch (e) {
      return false;
    }
  }

  function isInternalNav(anchor) {
    if (!anchor || !anchor.getAttribute) return false;
    if (anchor.hasAttribute("data-no-transition")) return false;
    /* Coin menu owns its link clicks and calls AimyPageTransition.navigate */
    if (anchor.closest && anchor.closest("[data-pk-menu], .pk-menu-root")) return false;
    if (anchor.target && anchor.target !== "" && anchor.target !== "_self") return false;
    if (anchor.hasAttribute("download")) return false;

    var href = anchor.getAttribute("href");
    if (!href || href.charAt(0) === "#" || href.indexOf("mailto:") === 0 || href.indexOf("tel:") === 0) {
      return false;
    }
    if (!sameOrigin(href)) return false;

    /* SPA host: coin menu + AimySpa.bindLinks own in-app routes — avoid double navigate. */
    if (
      document.body &&
      document.body.hasAttribute("data-spa-host") &&
      window.AimySpa &&
      typeof window.AimySpa.canHandle === "function" &&
      window.AimySpa.canHandle(anchor.href || href)
    ) {
      return false;
    }

    var url = new URL(href, window.location.href);
    var cur = window.location;
    if (url.pathname === cur.pathname && url.search === cur.search && url.hash) {
      return false;
    }
    /* Same page, no hash — skip */
    if (url.pathname === cur.pathname && url.search === cur.search && !url.hash) {
      return false;
    }
    return true;
  }

  function prefetchPage(href) {
    var absolute = href;
    try {
      absolute = new URL(href, window.location.href).href;
    } catch (e) {
      return Promise.resolve();
    }

    if (prefetched[absolute]) return prefetched[absolute];

    var link = document.createElement("link");
    link.rel = "prefetch";
    link.as = "document";
    link.href = absolute;
    document.head.appendChild(link);

    prefetched[absolute] = fetch(absolute, {
      method: "GET",
      credentials: "same-origin",
      cache: "force-cache",
      mode: "same-origin",
    }).catch(function () {});

    return prefetched[absolute];
  }

  function hexToRgb(hex) {
    var h = String(hex || "").replace("#", "").trim();
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    if (h.length !== 6) return [228, 62, 255];
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }

  function applyPalette(el) {
    if (!el) return;
    var rgb = hexToRgb(TRANSITION.primary);
    el.style.setProperty("--pt-block", TRANSITION.primary);
    el.style.setProperty("--pt-veil", rgb[0] + ", " + rgb[1] + ", " + rgb[2]);
    el.style.setProperty("--pt-r1", TRANSITION.trails[0]);
    el.style.setProperty("--pt-r2", TRANSITION.trails[1]);
    el.style.setProperty("--pt-r3", TRANSITION.trails[2]);
  }

  function cloneLogoSvg() {
    var src =
      document.querySelector(".site-header[data-aimy-chrome] .brand-mark") ||
      document.querySelector(".brand-mark");
    if (!src) return "";

    var clone = src.cloneNode(true);
    clone.removeAttribute("width");
    clone.removeAttribute("height");
    clone.removeAttribute("id");
    clone.setAttribute("aria-hidden", "true");
    clone.setAttribute("focusable", "false");
    clone.classList.add("aimy-pt__mark");

    clone.querySelectorAll("[id]").forEach(function (node) {
      node.removeAttribute("id");
    });

    return clone.outerHTML;
  }

  function bandRow(order, orderBack) {
    return (
      '<span class="aimy-pt__row" style="--order:' +
      order +
      ";--order-back:" +
      orderBack +
      '"><i class="aimy-pt__band" aria-hidden="true"></i></span>'
    );
  }

  function ensureOverlay() {
    var existing = document.querySelector(".aimy-pt");
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }

    var logo = cloneLogoSvg();
    var logoBlock = logo
      ? '<div class="aimy-pt__logo">' + logo + "</div>"
      : "";

    var el = document.createElement("div");
    el.className = "aimy-pt";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      '<div class="g">' +
      bandRow(1, 4) +
      bandRow(2, 3) +
      bandRow(3, 2) +
      bandRow(4, 1) +
      "</div>" +
      '<div class="t">' +
      logoBlock +
      "</div>";
    applyPalette(el);
    document.body.appendChild(el);
    return el;
  }

  function nextFrame() {
    return new Promise(function (resolve) {
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        resolve();
      }
      requestAnimationFrame(function () {
        requestAnimationFrame(finish);
      });
      setTimeout(finish, 48);
    });
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function waitForBands(el, fallbackMs) {
    return new Promise(function (resolve) {
      if (reduced) {
        resolve();
        return;
      }
      var band = el.querySelector(".g > .aimy-pt__row:last-child .aimy-pt__band");
      if (!band) {
        resolve();
        return;
      }
      var done = false;
      function finish(ev) {
        if (ev && ev.propertyName !== "transform") return;
        if (done) return;
        done = true;
        band.removeEventListener("transitionend", finish);
        resolve();
      }
      band.addEventListener("transitionend", finish);
      setTimeout(finish, fallbackMs || 1300);
    });
  }

  function clearAnimClasses(el) {
    el.classList.remove(
      "is-enter-from",
      "is-enter-active",
      "is-covered",
      "is-leave-active",
      "is-leave-to",
      "is-done"
    );
  }

  async function playCover() {
    if (isSpaHost()) return;
    var el = ensureOverlay();
    clearAnimClasses(el);
    el.classList.add("is-enter-from");
    el.style.pointerEvents = "auto";
    void el.offsetWidth;
    await nextFrame();
    el.classList.add("is-enter-active");
    el.classList.remove("is-enter-from");
    await waitForBands(el, 1200);
    el.classList.add("is-covered", "is-done");
  }

  async function playReveal() {
    var el = ensureOverlay();
    applyPalette(el);
    clearAnimClasses(el);
    el.classList.add("is-covered");
    el.style.pointerEvents = "none";
    void el.offsetWidth;
    await nextFrame();
    el.classList.add("is-leave-active");
    await nextFrame();
    el.classList.add("is-leave-to");
    await waitForBands(el, 1500);
    el.classList.add("is-done");
    clearAnimClasses(el);
    if (el.parentNode) el.parentNode.removeChild(el);
  }

  async function navigate(href) {
    if (navigating) return;
    if (!href) return;

    try {
      var legalUrl = new URL(href, window.location.href);
      var legalPath = legalUrl.pathname.toLowerCase();
      if (legalPath.indexOf("imprint") !== -1 || legalPath.indexOf("legal") !== -1) {
        legalUrl.pathname = legalUrl.pathname.replace(/\/[^/]*$/, "/imprint.html");
        legalUrl.searchParams.set("v", "imprint-ins-48");
        window.location.replace(legalUrl.pathname + legalUrl.search + legalUrl.hash);
        return;
      }
    } catch (e) {}

    /* SPA host — in-app routes use AimySpa; externals go direct (no band overlay). */
    if (isSpaHost()) {
      if (window.AimySpa && typeof window.AimySpa.canHandle === "function" && window.AimySpa.canHandle(href)) {
        return window.AimySpa.navigate(href);
      }
      window.location.href = href;
      return;
    }

    if (window.AimySpa && typeof window.AimySpa.canHandle === "function" && window.AimySpa.canHandle(href)) {
      navigating = true;
      try {
        await window.AimySpa.navigate(href);
      } finally {
        navigating = false;
      }
      return;
    }

    try {
      var url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) {
        window.location.href = href;
        return;
      }
      if (url.pathname === window.location.pathname && url.search === window.location.search && !url.hash) {
        return;
      }
    } catch (e) {}

    window.location.href = href;
  }

  function onClick(event) {
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    var anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;
    if (!isInternalNav(anchor)) return;

    event.preventDefault();
    event.stopPropagation();
    navigate(anchor.href);
  }

  async function bootReveal() {
    if (isSpaHost()) return;
    if (
      document.body &&
      (document.body.classList.contains("imprint-page-body") ||
        /imprint|legal/i.test(window.location.pathname || ""))
    ) {
      try {
        sessionStorage.removeItem(FLAG);
      } catch (e) {}
      var stuck = document.querySelector(".aimy-pt");
      if (stuck && stuck.parentNode) stuck.parentNode.removeChild(stuck);
      return;
    }
    var pending = false;
    try {
      pending = sessionStorage.getItem(FLAG) === "1";
      if (pending) sessionStorage.removeItem(FLAG);
    } catch (e) {}

    if (!pending || reduced) return;
    await playReveal();
  }

  window.AimyPageTransition = {
    navigate: navigate,
  };

  if (!isSpaHost()) {
    document.addEventListener("click", onClick, true);

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", bootReveal, { once: true });
    } else {
      bootReveal();
    }

    window.addEventListener("pageshow", function (event) {
      if (event.persisted) {
        navigating = false;
        var el = document.querySelector(".aimy-pt");
        if (el && el.parentNode) el.parentNode.removeChild(el);
        try {
          sessionStorage.removeItem(FLAG);
        } catch (e) {}
      }
    });
  }
})();

/**
 * Polykroma — shared Aimy UI chrome runtime
 *
 * Boots: chrome load reveal, socials hide-on-scroll, band page transition,
 * coin toggle + overlay menu.
 *
 * CSS geometry lives in css/polykroma.css only.
 * Scroll feel stays in polyglide.js (window.Polyglide / __lenis).
 */
(function (global) {
  "use strict";

  var VERSION = "polykroma-95";
  var bootedSocials = false;
  var bootedReveal = false;
  var chromeSettled = false;
  var menuBooted = false;
  var socialSync = null;

  function isLegalPage() {
    var body = document.body;
    if (body && body.classList.contains("imprint-page-body")) return true;
    return /imprint|legal/i.test(window.location.pathname || "");
  }

  /* Hide chrome until reveal boots — legal pages skip the fly-in entirely. */
  if (document.documentElement) {
    if (isLegalPage()) {
      document.documentElement.classList.add("pk-chrome-boot", "pk-chrome-ready", "pk-chrome-settled");
      bootedReveal = true;
      chromeSettled = true;
    } else {
      document.documentElement.classList.add("pk-chrome-boot");
    }
  }

  function getScrollY() {
    if (global.__lenis && typeof global.__lenis.scroll === "number") {
      return global.__lenis.scroll;
    }
    return global.scrollY || document.documentElement.scrollTop || 0;
  }

  function prefersReducedMotion() {
    return (
      global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function charmMarkReady() {
    if (global.AimyCharmMark && global.AimyCharmMark.ready) {
      return global.AimyCharmMark.ready;
    }
    return Promise.resolve();
  }

  function bootChromeReveal(options) {
    if (bootedReveal) return;
    bootedReveal = true;

    var html = document.documentElement;
    if (!html.classList.contains("pk-chrome-boot")) {
      html.classList.add("pk-chrome-boot");
    }

    if (
      document.body &&
      (document.body.classList.contains("imprint-page-body") ||
        /imprint|legal/i.test(window.location.pathname || ""))
    ) {
      html.classList.add("pk-chrome-ready", "pk-chrome-settled");
      return;
    }

    var settleMs =
      options && typeof options.settleMs === "number"
        ? options.settleMs
        : prefersReducedMotion()
          ? 40
          : 1220;

    function markSettled() {
      if (chromeSettled) return;
      chromeSettled = true;
      html.classList.add("pk-chrome-settled");
      if (socialSync) socialSync();
    }

    function reveal() {
      if (html.classList.contains("pk-chrome-ready")) {
        markSettled();
        return;
      }
      void html.offsetWidth;
      html.classList.add("pk-chrome-ready");
      global.setTimeout(markSettled, settleMs);
    }

    function afterPaint(cb) {
      var ran = false;
      function run() {
        if (ran) return;
        ran = true;
        cb();
      }
      global.requestAnimationFrame(function () {
        global.requestAnimationFrame(run);
      });
      global.setTimeout(run, 64);
    }

    var fontsOk =
      document.fonts && document.fonts.ready
        ? document.fonts.ready
        : Promise.resolve();
    var fontsBudget = new Promise(function (resolve) {
      global.setTimeout(resolve, 280);
    });

    Promise.race([fontsOk, fontsBudget])
      .then(function () {
        return charmMarkReady();
      })
      .then(function () {
        afterPaint(reveal);
      });
  }

  function bootSocialsScroll(options) {
    if (bootedSocials) return;
    var header =
      (options && options.header) ||
      document.querySelector(".site-header[data-aimy-chrome]");
    if (!header) return;

    var social = header.querySelector(".social");
    if (!social) return;

    bootedSocials = true;

    var ticking = false;
    var lastY = getScrollY();
    var navHidden = header.classList.contains("is-nav-hidden");
    var hideThreshold = (options && options.hideThreshold) || 48;
    var deltaMin = (options && options.deltaMin) || 6;
    var lenisBound = false;

    function setNavHidden(hidden) {
      if (!chromeSettled && hidden) return;
      if (navHidden === hidden) return;
      navHidden = hidden;
      header.classList.toggle("is-nav-hidden", hidden);
    }

    function syncScrollHide() {
      if (
        document.body.classList.contains("menu-open") ||
        document.documentElement.classList.contains("pk-menu-open")
      ) {
        setNavHidden(false);
        return;
      }

      var y = getScrollY();
      var delta = y - lastY;

      if (y <= hideThreshold) {
        setNavHidden(false);
      } else if (delta > deltaMin) {
        setNavHidden(true);
      } else if (delta < -deltaMin) {
        setNavHidden(false);
      }

      lastY = y;
    }

    socialSync = syncScrollHide;

    function requestSync() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        syncScrollHide();
      });
    }

    function bindLenis() {
      if (lenisBound) return;
      if (global.__lenis && typeof global.__lenis.on === "function") {
        global.__lenis.on("scroll", requestSync);
        lenisBound = true;
      }
    }

    lastY = getScrollY();
    global.addEventListener("scroll", requestSync, { passive: true });
    bindLenis();

    var tries = 0;
    var poll = global.setInterval(function () {
      bindLenis();
      tries += 1;
      if (lenisBound || tries > 40) global.clearInterval(poll);
    }, 50);

    syncScrollHide();
  }

  /* —— Overlay menu (coin + shell) —— */
var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof gsap !== "undefined";
  var IMPRINT_PAGE_TAG = "imprint-ins-48";

  function imprintPageHref() {
    return "./imprint.html?v=" + IMPRINT_PAGE_TAG;
  }

  function isLegalHref(href) {
    try {
      var path = new URL(href, window.location.href).pathname.toLowerCase();
      return path.indexOf("imprint") !== -1 || path.indexOf("legal") !== -1;
    } catch (e) {
      return false;
    }
  }

  function normalizeLegalHref(href) {
    try {
      var url = new URL(href, window.location.href);
      url.pathname = url.pathname.replace(/\/[^/]*$/, "/imprint.html");
      url.searchParams.set("v", IMPRINT_PAGE_TAG);
      return url.pathname + url.search + url.hash;
    } catch (e) {
      return imprintPageHref();
    }
  }

  function pageBase() {
    return "./";
  }

  function selectButtonSrc() {
    return pageBase() + "assets/polykroma/select/select-button.svg?v=select-2";
  }

  function selectLayer(layer) {
    return (
      '<img class="pk-select-layer pk-select-layer--' +
      layer +
      '" src="' +
      selectButtonSrc() +
      '" alt="" decoding="async" draggable="false" />'
    );
  }

  function selectCoinMarkup() {
    return (
      '  <span class="pk-coin-state">' +
      '    <span class="pk-coin pk-coin--select">' +
      '      <span class="pk-select-stack" aria-hidden="true">' +
      selectLayer("edge") +
      selectLayer("face") +
      selectLayer("icon") +
      "      </span>" +
      '      <span class="pk-coin-glyphs pk-coin-glyphs--front">' +
      coinIconOpen() +
      coinIconClose() +
      "      </span>" +
      '      <span class="pk-coin-glyphs pk-coin-glyphs--back">' +
      coinIconOpen() +
      coinIconClose() +
      "      </span>" +
      "    </span>" +
      "  </span>"
    );
  }

  function isNewSiteRoot() {
    return true;
  }

  function coinIconPair(state, file, altFile) {
    var base = pageBase() + "assets/polykroma/icons/";
    return (
      '<img class="pk-coin-icon pk-coin-icon--' +
      state +
      '" src="' +
      base +
      file +
      '" alt="" />' +
      '<img class="pk-coin-icon pk-coin-icon--' +
      state +
      ' pk-coin-icon--alt" src="' +
      base +
      altFile +
      '" alt="" />'
    );
  }

  function coinIconOpen() {
    return coinIconPair("open", "select-open.svg", "select-open-alt.svg");
  }

  function coinIconClose() {
    return coinIconPair("close", "select-close.svg", "select-close-alt.svg");
  }

  function linkInner(label) {
    return (
      '<span class="pk-menu-link__mask">' +
      '<span class="pk-menu-link__label">' +
      label +
      "</span>" +
      '<span class="pk-menu-link__block" aria-hidden="true"></span>' +
      '<span class="pk-menu-link__wipe" aria-hidden="true">' +
      '<span class="pk-menu-link__label">' +
      label +
      "</span>" +
      "</span>" +
      "</span>"
    );
  }

  function isSpaHost() {
    return document.body && document.body.hasAttribute("data-spa-host");
  }

  function menuHref(view) {
    var base = pageBase();
    if (isSpaHost()) {
      if (view === "start") return "./";
      return "/" + view;
    }
    if (view === "start") return base + "index.html";
    return base + "index.html?view=" + view;
  }

  function primaryItem(num, label, href, side, viewId) {
    var navAttr = viewId ? ' data-spa-nav="' + viewId + '"' : "";
    return (
      '<li class="pk-menu-item">' +
      '<a class="pk-menu-link pk-menulink" href="' +
      href +
      '"' +
      navAttr +
      ' data-pk-nav data-enter="' +
      side +
      '">' +
      '<span class="pk-menu-link__index" aria-hidden="true">' +
      num +
      "</span>" +
      linkInner(label) +
      "</a>" +
      "</li>"
    );
  }

  function utilItem(label, href, side) {
    return (
      '<li class="pk-menu-item pk-menu-item--util">' +
      '<a class="pk-menu-link pk-menu-link--util pk-menulink" href="' +
      href +
      '" data-pk-nav data-enter="' +
      side +
      '">' +
      linkInner(label) +
      "</a>" +
      "</li>"
    );
  }

  /* Inline SVGs — paint with currentColor (no CSS masks). Order: Threads → Discord. */
  var SOCIAL_SVGS = {
    threads:
      '<svg class="pk-menu-social__icon" viewBox="0 0 442 442" width="28" height="28" aria-hidden="true" focusable="false" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd">' +
      '<g transform="matrix(1.001953,0,0,1.001953,-540.363431,-57.338887)">' +
      '<path fill="currentColor" d="M780.461,490.079C765.398,491.074 726.622,494.213 681.386,475.778C619.333,450.49 576.146,394.117 568.919,318.457C564.587,273.103 572.653,222.011 591.048,184.286C598.92,168.143 615.719,134.821 655.147,106.008C657.241,104.477 668.695,96.107 682.736,88.973C745.734,56.969 816.221,62.211 853.36,72.989C884.276,81.961 901.712,94.739 910.148,100.952C910.291,101.058 919.487,108.11 928.394,117.598C933.051,122.559 938.813,130.24 939.667,131.379C944.332,137.598 951.988,150.842 951.986,152.491C951.983,154.367 949.241,155.496 944.702,158.79C943.007,160.02 920.929,175.429 920.612,175.661C917.152,178.195 915.636,179.248 914.598,178.385C913.603,177.558 902.686,156.31 884.899,141.049C879.446,136.37 844.858,101.992 765.523,111.663C695.826,120.159 625.919,171.931 616.614,274.511C607.222,378.046 664.525,445.831 759.5,445.66C793.789,445.599 824.89,433.823 839.337,425.211C844.251,422.282 888.508,399.175 887.094,350.511C886.52,330.753 877.783,317.861 868.319,311.778C865.863,310.199 863.546,308.293 862.513,311.505C857.835,326.057 835.131,397.478 752.48,392.808C709.077,390.355 681.75,367.811 676.413,335.514C671.356,304.909 682.421,268.45 729.586,252.755C748.111,246.591 767.537,245.155 783.5,245.139C800.47,245.123 816.613,247.325 819.471,247.715C821.784,248.031 822.589,247.848 822.267,245.528C821.697,241.42 818.879,229.326 813.329,221.619C809.565,216.392 800.166,204.143 774.486,205.232C753.011,206.142 742.314,218.132 738.442,222.448C733.583,227.863 732.179,231.731 730.508,231.773C729.268,231.805 727.907,230.239 718.767,224.111C717.292,223.123 717.417,222.949 700.57,211.4C695.654,208.03 695.613,208.055 695.363,207.605C694.72,206.45 694.779,205.76 697.287,202.35C702.747,194.927 711.661,183.681 730.319,174.143C763.86,156.998 813.033,157.651 841.565,183.427C856.915,197.295 862.788,212.794 866.382,224.533C870.66,238.502 871.245,254.839 871.34,257.505C871.398,259.138 870.963,261.383 873.445,262.605C886.715,269.142 936.106,292.736 934.797,356.506C933.354,426.849 872.353,477.54 790.563,488.92C789.757,489.032 786.793,489.445 780.461,490.079ZM768.459,347.206C772.286,346.537 805.198,343.256 819.025,299.354C821.389,291.85 820.74,291.342 820.204,290.923C817.856,289.084 752.876,280.51 730.563,303.561C720.315,314.147 718.591,334.716 738.391,343.736C751.511,349.713 765.29,347.584 768.459,347.206Z"/>' +
      "</g></svg>",
    patreon:
      '<svg class="pk-menu-social__icon" viewBox="0 0 442 442" width="28" height="28" aria-hidden="true" focusable="false" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd">' +
      '<g transform="matrix(1,0,0,1,35,23)">' +
      '<path fill="currentColor" d="M45.997,59.937C50.437,55.406 65.782,34.899 105.672,18.996C121.353,12.744 150.095,6.084 163.523,4.708C355.293,-14.934 392.67,105.736 359.008,175.258C332.476,230.057 279.084,239.808 267.588,242.836C174.462,267.359 189.486,309.488 151.044,369.193C109.763,433.308 15.457,422.198 4.831,248.48C-2.005,136.712 15.961,99.557 45.997,59.937Z"/>' +
      "</g></svg>",
    vgen:
      '<svg class="pk-menu-social__icon" viewBox="0 0 442 442" width="28" height="28" aria-hidden="true" focusable="false" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd">' +
      '<g transform="matrix(2.613421,0,0,2.613421,-3.225767,43.756291)">' +
      '<path fill="currentColor" d="M144.002,101.04C143.03,102.071 143.004,102.019 142.06,103.098C136.334,109.64 120.325,125.425 103.5,130.5C87.172,135.424 70.701,133.837 48.548,117.438C48.123,117.123 42.402,113.032 33.046,103.965C31.827,102.784 26.371,97.496 18.648,88.378C11.166,79.544 6.848,73.457 6.352,72.588C1.918,64.824 1.627,58.399 2.96,51.601C3.145,50.657 5.457,41.77 12.455,36.445C18.418,31.908 25.324,28.572 36.431,30.788C47.627,33.022 53.538,42.694 55.188,44.744C56.439,46.298 58.02,48.387 58.262,48.707C58.364,48.842 59.514,50.361 59.568,50.376C60.017,50.499 61.035,49.702 61.093,49.407C61.241,48.662 60.763,48.603 61.85,43.576C63.858,34.289 68.362,26.437 73.039,21.098C73.472,20.604 82.786,8.515 100.416,4.171C116.483,0.212 129.282,5.315 131.605,6.241C143.151,10.845 149.436,16.839 157.715,27.338C158.966,28.924 161.272,32.59 161.766,33.336C163.749,36.33 169.818,47.986 169.303,58.49C168.828,68.215 166.064,71.357 160.613,79.577C155.011,88.024 146.65,97.856 145.354,99.38C144.659,100.197 144.686,100.201 144.002,101.04ZM124.99,86.964C133.661,77.914 141.694,65.904 141.825,65.712C146.41,58.997 148.763,56.717 146.748,48.432C145.819,44.608 142.694,38.079 138.752,33.297C135.451,29.294 125.764,15.657 106.529,16.896C80.404,18.578 64.575,49.047 81.988,72.113C82.303,72.53 92.05,83.474 92.806,84.17C93.821,85.104 96.142,86.332 93.754,87.844C86.367,92.525 80.983,91.66 74.349,87.787C67.742,83.93 59.177,77.87 44.297,60.67C39.505,55.131 33.962,47.719 33.642,47.372C28.048,41.295 18.333,44.554 16.679,51.544C15.827,55.144 16.511,57.866 19.385,61.586C25.83,69.931 30.692,76.158 39.265,84.735C45.051,90.523 59.744,105.908 76.585,110.177C78.307,110.614 87.774,113.013 98.657,107.856C111.9,101.581 121.246,91.194 124.99,86.964ZM119.013,40.98C122.445,44.942 126.712,49.312 124.337,55.431C124.151,55.909 124.579,56.222 114.124,69.205C111.578,72.367 110.918,72.172 110.568,72.068C109.666,71.8 109.069,71.071 100.496,62.504C99.938,61.947 92.982,56.679 95.162,47.418C96.934,39.893 106.231,33.766 115.538,38.43C116.673,38.999 118.111,40.267 119.013,40.98Z"/>' +
      "</g></svg>",
    youtube:
      '<svg class="pk-menu-social__icon" viewBox="0 0 442 442" width="28" height="28" aria-hidden="true" focusable="false" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd">' +
      '<g transform="matrix(1,0,0,1,3.5,67.5)">' +
      '<path fill="currentColor" d="M123.609,3.882C126.239,3.973 126.051,3.777 128.499,3.404C217.53,2.844 217.351,2.486 306.501,3.409L311.557,4.094C410.807,6.57 408.32,24.16 414.709,30.298C440.49,55.064 437.96,247.182 417.632,272.582C399.976,294.643 398.138,300.135 270.392,304.119C264.912,304.051 265.052,304.175 259.5,304.606C212.024,304.448 205.334,304.521 175.5,304.606L164.449,303.889C161.091,303.838 139.316,303.511 122.499,302.51C62.145,298.92 14.062,304.167 6.447,237.507C-2.49,159.281 4.756,89.266 6.083,76.45C12.343,15.959 29.584,7.682 123.609,3.882ZM251.634,133.28C175.721,89.52 175.419,89.12 174.691,89.71C173.197,90.92 174.156,205.47 174.24,215.535C174.262,218.106 175.487,217.309 177.777,215.979C276.381,158.687 276.926,159.755 285.083,154.13C286.595,153.086 283.103,151.452 251.634,133.28Z"/>' +
      "</g></svg>",
    discord:
      '<svg class="pk-menu-social__icon" viewBox="0 0 2000 2000" width="28" height="28" aria-hidden="true" focusable="false" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd">' +
      '<g transform="matrix(1.511109,0,0,1.511109,226.540837,398.978406)">' +
      '<path fill="currentColor" d="M761.5,793.999L758.5,793.999C757.106,786.988 740.525,774.296 706.147,706.686C701.633,697.807 710.662,701.71 761.326,676.155C789.712,661.837 790.975,660.718 789.44,658.553C788.551,657.299 786.91,659.325 774.366,646.625C767.364,639.537 761.795,650.356 706.371,669.171C563.559,717.652 455.053,702.996 376.531,686.398C358.711,682.631 305.74,665.994 273.544,652.396C259.55,646.486 258.43,639.048 246.632,648.658C245.973,649.195 239.902,654.14 238.51,655.512C236.262,657.728 230.399,658.575 236.714,662.09C306.591,700.986 309.18,695.647 319.045,701.848C320.627,702.843 297.434,745.222 276.43,776.455C265.676,792.445 264.166,792.673 262.457,792.932C256.244,792.217 256.527,791.542 243.613,787.195C217.628,778.449 218.234,777.424 192.331,767.963C169.796,759.732 116.769,732.182 110.318,728.83C71.641,708.736 5.862,663.279 5.318,660.561C2.057,644.286 1.438,611.758 1.357,607.502C-0.679,500.578 7.471,458.793 13.306,419.472C24.776,342.181 64.894,226.114 103.242,157.359C144.863,82.738 146.548,83.786 150.161,77.301C159.72,60.141 165.848,64.497 171.432,60.394C173.033,59.218 248.585,25.445 325.436,9.141C351.824,3.544 366.01,-2.239 370.433,4.535C382.939,23.689 380.26,24.972 381.346,26.617C389.974,39.688 391.904,57.219 398.453,56.21C501.286,40.371 597.058,51.143 626.445,56.758C629.461,57.335 640.435,27.699 653.883,2.709C657.484,-3.984 762.858,24.324 807.334,41.863C860.426,62.798 859.713,64.08 864.324,65.872C870.104,68.118 903.642,126.986 903.832,127.318C1032.742,351.987 1026.593,547.661 1019.59,650.509C1018.786,662.323 1017.318,662.133 1010.183,667.1C957.08,704.068 957.354,704.332 900.629,735.757C847.663,765.099 763.432,793.207 761.5,793.999L747.317,363.64C715.159,325.118 642.67,311.215 602.708,383.607C559.408,462.046 631.101,566.713 708.808,535.933C796.461,501.214 776.706,390.209 748.567,365.425C748.15,364.83 747.734,364.235 747.317,363.64L761.5,793.999L285.143,517.866C318.428,550.604 382.602,551.406 415.561,498.534C481.06,393.462 358.669,270.833 274.698,365.669C262.808,379.098 221.28,453.787 285.143,517.866L761.5,793.999Z"/>' +
      "</g></svg>"
  };

  function socialItem(label, href, iconName) {
    var icon = SOCIAL_SVGS[iconName] || "";
    return (
      '<li class="pk-menu-item pk-menu-item--social">' +
      '<a class="pk-menu-social" href="' +
      href +
      '" target="_blank" rel="noopener noreferrer" aria-label="' +
      label +
      '">' +
      icon +
      '<span class="pk-menu-social__text">' +
      label +
      "</span>" +
      "</a>" +
      "</li>"
    );
  }

  /* Geometry from assets/polykroma/icons/arrow-left.svg + arrow-right.svg */
  var MENU_ARROW_PATH =
    "M209,114C208.999,134.209 237.423,210 359,210L59,210L359,210C229.831,210 209,285.362 209,306";

  function menuSelectArrowSvg(direction) {
    var transform =
      direction === "prev"
        ? "matrix(-1.453333,0,0,2.270833,524.746667,-255.875)"
        : "matrix(1.453333,0,0,2.270833,-82.746667,-255.875)";
    return (
      '<svg class="pk-menu-select__arrow-svg" viewBox="0 0 442 442" aria-hidden="true" focusable="false">' +
      '<g transform="' +
      transform +
      '">' +
      '<path d="' +
      MENU_ARROW_PATH +
      '" fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="1.5"></path>' +
      "</g></svg>"
    );
  }

  function menuCarouselBlock() {
    return (
      '<div class="pk-menu-group pk-menu-group--primary pk-menu-group--carousel" aria-label="Navigate">' +
      '  <div class="pk-menu-carousel-wrap">' +
      '    <section class="pk-menu-select" data-pk-menu-select aria-label="Site sections">' +
      '      <div class="pk-menu-select__stage">' +
      '        <div class="pk-menu-select__viewport" data-menu-select-viewport>' +
      '          <canvas class="pk-menu-select__canvas" data-menu-select-canvas aria-hidden="true"></canvas>' +
      '          <div class="pk-menu-select__labels" data-menu-select-labels role="tablist" aria-label="Sections">' +
      '            <button type="button" class="pk-menu-select__hit is-active" data-menu-select-hit="0" role="tab" aria-selected="true" aria-label="Work">' +
      '              <span class="pk-menu-select__title is-active" data-menu-select-title="0">Work</span>' +
      '            </button>' +
      '            <button type="button" class="pk-menu-select__hit" data-menu-select-hit="1" role="tab" aria-selected="false" tabindex="-1" aria-label="Me">' +
      '              <span class="pk-menu-select__title" data-menu-select-title="1">Me</span>' +
      '            </button>' +
      '            <button type="button" class="pk-menu-select__hit" data-menu-select-hit="2" role="tab" aria-selected="false" tabindex="-1" aria-label="Insights">' +
      '              <span class="pk-menu-select__title" data-menu-select-title="2">Insights</span>' +
      '            </button>' +
      '          </div>' +
      '        </div>' +
      '      </div>' +
      '      <div class="pk-menu-select__controls">' +
      '        <button type="button" class="pk-menu-select__arrow pk-menu-select__arrow--prev" data-menu-select-prev aria-label="Previous section">' +
      menuSelectArrowSvg("prev") +
      '        </button>' +
      '        <button type="button" class="pk-menu-select__arrow pk-menu-select__arrow--next" data-menu-select-next aria-label="Next section">' +
      menuSelectArrowSvg("next") +
      '        </button>' +
      '      </div>' +
      '    </section>' +
      '  </div>' +
      '</div>'
    );
  }

  function menuCarouselHint() {
    return (
      '<div class="pk-menu-select__hint" aria-hidden="true">' +
      '  <div class="pk-menu-select__hint-desktop">' +
      '    <span class="pk-menu-select__hint-line">ENTER — select</span>' +
      '    <span class="pk-menu-select__hint-line">ESC — return</span>' +
      '    <span class="pk-menu-select__hint-line">Drag, Swipe, Scroll, Or ← Arrow Keys → — navigate</span>' +
      "  </div>" +
      '  <p class="pk-menu-select__hint-mobile">swipe or use ← arrows → to navigate</p>' +
      "</div>"
    );
  }

  function buildDOM() {
    var root = document.createElement("div");
    root.className = "pk-menu-root";
    root.setAttribute("data-pk-menu", "1");
    root.innerHTML =
      '<button type="button" class="pk-burger-hit pk-burger-in on" aria-label="Open menu" aria-expanded="false" aria-controls="pk-site-menu"></button>' +
      '<button type="button" class="pk-burger-hit pk-burger-out" aria-label="Close menu" aria-expanded="true" aria-controls="pk-site-menu"></button>' +
      '<div class="pk-coin-button pk-coin-button--select" aria-hidden="true">' +
      selectCoinMarkup() +
      "</div>" +
      '<div class="pk-nav-shell" id="pk-nav-shell" hidden>' +
      '  <div class="pk-menu-veil" aria-hidden="true">' +
      '    <div class="pk-menu-veil-wash"></div>' +
      "  </div>" +
      '  <nav class="pk-menu" id="pk-site-menu" aria-label="Site menu" role="dialog" aria-modal="true">' +
      '    <div class="pk-menu-panel">' +
      menuCarouselBlock() +
      '      <div class="pk-menu-rule" aria-hidden="true"></div>' +
      '      <div class="pk-menu-group pk-menu-group--util" aria-label="Utility">' +
      '        <ul class="pk-menu-list pk-menu-list--util">' +
      utilItem("Imprint", imprintPageHref(), "right") +
      utilItem("Contact", menuHref("contact"), "left") +
      "        </ul>" +
      '        <ul class="pk-menu-list pk-menu-list--social" aria-label="Social">' +
      socialItem(
        "Threads",
        "https://www.threads.net/@aimygwen",
        "threads"
      ) +
      socialItem(
        "Patreon",
        "https://www.patreon.com/aimygwen",
        "patreon"
      ) +
      socialItem("VGen", "https://vgen.co/aimygwen", "vgen") +
      socialItem(
        "YouTube",
        "https://www.youtube.com/@aimygwen",
        "youtube"
      ) +
      socialItem(
        "Discord",
        "https://discord.com/users/1124618102500511744",
        "discord"
      ) +
      "        </ul>" +
      "      </div>" +
      "    </div>" +
      menuCarouselHint() +
      "  </nav>" +
      "</div>";
    document.body.appendChild(root);
    document.body.classList.add("pk-menu-enabled");
    return root;
  }

  function pageKey() {
    if (window.AimySpa && typeof window.AimySpa.isHost === "function" && window.AimySpa.isHost()) {
      return window.AimySpa.getView();
    }

    var params = new URLSearchParams(window.location.search || "");
    var qView = params.get("view");
    if (qView) return qView;

    var path = (window.location.pathname || "").toLowerCase();
    if (path.match(/\/work\/?$/)) return "work";
    if (path.match(/\/insights\/?$/)) return "insights";
    if (path.match(/\/me\/?$/)) return "me";
    if (path.indexOf("contact") !== -1) return "contact";
    if (path.indexOf("imprint") !== -1) return "imprint";
    if (path.indexOf("legal") !== -1) return "legal";
    if (path.indexOf("lowpoly") !== -1) return "work";
    if (path.indexOf("gallery") !== -1) return "work";
    if (path.indexOf("insights") !== -1) return "insights";
    if (path.indexOf("about") !== -1) return "me";
    if (path.indexOf("videos") !== -1) return "work";
    return "start";
  }

  function markCurrent(root) {
    var key = pageKey();
    root.querySelectorAll(".pk-menulink").forEach(function (a) {
      var href = (a.getAttribute("href") || "").toLowerCase();
      var navId = a.getAttribute("data-spa-nav");
      var is = navId
        ? navId === key
        : (key === "start" && (href === "./" || href.indexOf("index.html") !== -1)) ||
          (key === "work" && (href.indexOf("work") !== -1 || href.indexOf("lowpoly") !== -1 || href.indexOf("gallery") !== -1)) ||
          (key === "insights" && href.indexOf("insights") !== -1) ||
          (key === "me" && href.indexOf("about") !== -1) ||
          (key === "contact" && href.indexOf("contact") !== -1) ||
          (key === "imprint" && href.indexOf("imprint") !== -1) ||
          (key === "legal" && href.indexOf("legal") !== -1);
      a.classList.toggle("is-current", !!is);
      if (is) {
        a.setAttribute("aria-current", "page");
        a.setAttribute("aria-disabled", "true");
        a.setAttribute("tabindex", "-1");
      } else {
        a.removeAttribute("aria-current");
        a.removeAttribute("aria-disabled");
        a.removeAttribute("tabindex");
      }
    });
  }

  function bootMenuDom() {
    if (document.querySelector("[data-pk-menu]")) return;

    var root = buildDOM();
    markCurrent(root);
    window.__aimyMarkMenuCurrent = function () {
      markCurrent(root);
    };
    window.__aimyPageKey = pageKey;

    var shell = root.querySelector(".pk-nav-shell");
    var menuEl = root.querySelector(".pk-menu");
    var menuVeil = root.querySelector(".pk-menu-veil");
    var menuPanel = root.querySelector(".pk-menu-panel");
    var menuRule = root.querySelector(".pk-menu-rule");
    var menuCarouselWrap = root.querySelector(".pk-menu-carousel-wrap");
    var menuCarouselFocus = root.querySelector("[data-pk-menu-select] [data-menu-select-hit].is-active");
    var hitIn = root.querySelector(".pk-burger-in");
    var hitOut = root.querySelector(".pk-burger-out");
    var coinButton = root.querySelector(".pk-coin-button");
    var coin = root.querySelector(".pk-coin");
    var navLinks = Array.prototype.slice.call(root.querySelectorAll(".pk-menulink"));
    var allLinks = root.querySelectorAll(".pk-menu-link");
    var socialLinks = root.querySelectorAll(".pk-menu-social");
    var focusables = [];
    var isOpen = false;
    var canClick = true;
    var shellIgnoreUntil = 0;
    var selectedIndex = -1;
    var lastFocus = null;
    var openTimeline = null;

    function refreshFocusables() {
      focusables = Array.prototype.slice.call(
        root.querySelectorAll(
          ".pk-burger-hit.on, .pk-menu-link, .pk-menu-social, [data-pk-menu-select] [data-menu-select-prev], [data-pk-menu-select] [data-menu-select-next], [data-pk-menu-select] [data-menu-select-hit]"
        )
      );
    }

    function showHits(open) {
      if (open) {
        hitIn.classList.remove("on");
        hitOut.classList.add("on");
        hitIn.setAttribute("aria-expanded", "true");
        hitOut.setAttribute("aria-expanded", "true");
      } else {
        hitOut.classList.remove("on");
        hitIn.classList.add("on");
        hitIn.setAttribute("aria-expanded", "false");
        hitOut.setAttribute("aria-expanded", "false");
      }
    }

    function setSelected(index) {
      selectedIndex = index;
      navLinks.forEach(function (link, i) {
        link.classList.toggle("is-selected", i === index);
      });
    }

    function indexOfCurrent() {
      for (var i = 0; i < navLinks.length; i++) {
        if (navLinks[i].classList.contains("is-current")) return i;
      }
      return 0;
    }

    function stopScroll() {
      if (window.Polyglide && typeof window.Polyglide.stop === "function") {
        window.Polyglide.stop();
      }
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    }

    function startScroll() {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      if (window.Polyglide && typeof window.Polyglide.start === "function") {
        window.Polyglide.start();
      }
    }

    function pageFrostTargets() {
      var kids = document.body.children;
      var out = [];
      for (var i = 0; i < kids.length; i++) {
        var el = kids[i];
        if (el === root) continue;
        if (el.tagName === "SCRIPT" || el.tagName === "STYLE" || el.tagName === "LINK") {
          continue;
        }
        if (el.classList && el.classList.contains("site-header")) continue;
        out.push(el);
      }
      return out;
    }

    function setPageFrost(on) {
      var targets = pageFrostTargets();
      for (var i = 0; i < targets.length; i++) {
        var el = targets[i];
        el.style.transition = on
          ? "filter 1.45s cubic-bezier(0.16, 1, 0.3, 1)"
          : "filter 1.05s cubic-bezier(0.4, 0, 0.2, 1)";
        el.style.filter = on ? "blur(11px)" : "blur(0px)";
      }
      if (!on) {
        window.setTimeout(function () {
          var again = pageFrostTargets();
          for (var j = 0; j < again.length; j++) {
            again[j].style.removeProperty("filter");
            again[j].style.removeProperty("transition");
          }
        }, 1100);
      }
    }

    function clearPageBlur() {
      var kids = document.body.children;
      for (var i = 0; i < kids.length; i++) {
        var el = kids[i];
        if (el === root) continue;
        el.style.removeProperty("filter");
        el.style.removeProperty("transition");
      }
    }

    function resetMenuMotionStyles() {
      var motionTargets = [menuVeil, menuPanel, menuRule].concat(
        Array.prototype.slice.call(allLinks),
        Array.prototype.slice.call(socialLinks)
      );
      gsap.set(motionTargets, { clearProps: "opacity,transform,filter" });
    }

    function beginMenuCarouselReveal(open) {
      var ms = window.AimyMenuSelect;
      if (!ms) return;
      if (open) {
        if (typeof ms.playMenuReveal === "function") {
          ms.playMenuReveal(true);
        }
        if (typeof ms.resumeMenu === "function") {
          ms.resumeMenu({ revealing: true });
        }
        return;
      }
      if (typeof ms.playMenuReveal === "function") {
        ms.playMenuReveal(open);
      }
    }

    function animateMenuMotion(open, onDone) {
      if (!hasGsap || reducedMotion || isLegalPage()) {
        if (open) {
          if (menuVeil) {
            menuVeil.style.opacity = "1";
            menuVeil.style.transform = "scale(1)";
          }
          allLinks.forEach(function (link) {
            link.style.opacity = "1";
          });
          socialLinks.forEach(function (link) {
            link.style.opacity = "1";
          });
          if (menuPanel) menuPanel.style.opacity = "1";
          if (menuRule) menuRule.style.opacity = "1";
          if (menuCarouselWrap) menuCarouselWrap.style.opacity = "1";
          setPageFrost(true);
          if (open) beginMenuCarouselReveal(true);
        } else {
          if (menuVeil) {
            menuVeil.style.opacity = "0";
            menuVeil.style.transform = "scale(1.02)";
          }
          allLinks.forEach(function (link) {
            link.style.opacity = "0";
          });
          socialLinks.forEach(function (link) {
            link.style.opacity = "0";
          });
          if (menuPanel) menuPanel.style.opacity = "0";
          if (menuRule) menuRule.style.opacity = "0";
          setPageFrost(false);
          clearPageBlur();
        }
        if (onDone) onDone();
        return;
      }

      if (openTimeline) openTimeline.kill();
      openTimeline = gsap.timeline({
        onComplete: function () {
          if (!open) resetMenuMotionStyles();
          if (onDone) onDone();
        },
      });

      if (open) {
        gsap.set(menuVeil, { opacity: 0, scale: 1.045, force3D: true });
        gsap.set(menuPanel, {
          opacity: 0,
          y: 34,
          scale: 0.965,
          filter: "blur(10px)",
          force3D: true,
        });
        gsap.set(menuRule, { opacity: 0, scaleX: 0.35, transformOrigin: "center center" });
        gsap.set(allLinks, { opacity: 0, y: 22, filter: "blur(7px)", force3D: true });
        if (menuCarouselWrap) {
          gsap.set(menuCarouselWrap, { opacity: 0, filter: "blur(8px)", force3D: true });
        }
        gsap.set(socialLinks, { opacity: 0, y: 14, force3D: true });
        setPageFrost(true);

        openTimeline
          .to(menuVeil, { opacity: 1, scale: 1, duration: 1.08, ease: "expo.out" }, 0)
          .to(
            menuPanel,
            {
              opacity: 1,
              y: 0,
              scale: 1,
              filter: "blur(0px)",
              duration: 0.98,
              ease: "power3.out",
            },
            0.14
          )
          .to(
            allLinks,
            {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              duration: 0.78,
              ease: "power3.out",
              stagger: 0.055,
            },
            0.3
          );
        if (menuCarouselWrap) {
          openTimeline.to(
            menuCarouselWrap,
            {
              opacity: 1,
              filter: "blur(0px)",
              duration: 0.92,
              ease: "power2.out",
            },
            0.22
          );
          openTimeline.add(function () {
            beginMenuCarouselReveal(true);
          }, 0.22);
        }
        openTimeline
          .to(
            menuRule,
            { opacity: 1, scaleX: 1, duration: 0.62, ease: "power2.out" },
            0.48
          )
          .to(
            socialLinks,
            { opacity: 1, y: 0, duration: 0.56, ease: "power2.out", stagger: 0.04 },
            0.58
          );
      } else {
        setPageFrost(false);
        openTimeline
          .to(
            allLinks,
            {
              opacity: 0,
              y: -16,
              filter: "blur(5px)",
              duration: 0.42,
              ease: "power2.in",
              stagger: { each: 0.028, from: "end" },
            },
            0
          );
        if (menuCarouselWrap) {
          openTimeline.to(
            menuCarouselWrap,
            {
              opacity: 0,
              filter: "blur(6px)",
              duration: 0.48,
              ease: "power2.in",
            },
            0.08
          );
        }
        openTimeline
          .to(
            socialLinks,
            { opacity: 0, y: -10, duration: 0.34, ease: "power2.in", stagger: 0.022 },
            0.04
          )
          .to(
            menuRule,
            { opacity: 0, scaleX: 0.2, duration: 0.34, ease: "power2.in" },
            0.08
          )
          .to(
            menuPanel,
            {
              opacity: 0,
              y: -22,
              scale: 0.975,
              filter: "blur(8px)",
              duration: 0.62,
              ease: "power3.in",
            },
            0.14
          )
          .to(menuVeil, { opacity: 0, scale: 1.03, duration: 0.82, ease: "power2.inOut" }, 0.22)
          .add(function () {
            clearPageBlur();
          }, 0.9);
      }
    }

    function openMenu() {
      if (isOpen || !canClick) return;
      canClick = false;
      isOpen = true;
      shellIgnoreUntil = performance.now() + 450;
      lastFocus = document.activeElement;
      root.classList.add("is-menu-open");
      document.documentElement.classList.add("pk-menu-open");
      shell.hidden = false;
      menuEl.classList.add("is-visible");
      shell.classList.add("is-open");
      stopScroll();
      showHits(true);
      setSelected(-1);
      refreshFocusables();

      if (window.AimyMenuSelect && typeof window.AimyMenuSelect.bootMenu === "function") {
        window.AimyMenuSelect.bootMenu();
      }

      function finishOpen() {
        if (window.AimyMenuSelect && typeof window.AimyMenuSelect.bootMenu === "function") {
          window.AimyMenuSelect.bootMenu();
        }
        window.setTimeout(function () {
          if (window.AimyMenuSelect && typeof window.AimyMenuSelect.resize === "function") {
            window.AimyMenuSelect.resize();
          }
          if (menuCarouselFocus) menuCarouselFocus.focus({ preventScroll: true });
        }, 120);
        canClick = true;
      }

      animateMenuMotion(true, finishOpen);
    }

    function closeMenu(opts) {
      if (!isOpen || !canClick) return;
      var restoreFocus = !opts || opts.restoreFocus !== false;
      canClick = false;
      isOpen = false;
      root.classList.remove("is-menu-open");
      showHits(false);
      setSelected(-1);

      function finishClose() {
        if (window.AimyMenuSelect && typeof window.AimyMenuSelect.pauseMenu === "function") {
          window.AimyMenuSelect.pauseMenu();
        }
        menuEl.classList.remove("is-visible");
        shell.classList.remove("is-open");
        shell.hidden = true;
        document.documentElement.classList.remove("pk-menu-open");
        if (restoreFocus && lastFocus && typeof lastFocus.focus === "function") {
          try {
            lastFocus.focus({ preventScroll: true });
          } catch (e) {}
        }
        canClick = true;
      }

      function runCloseUiMotion() {
        startScroll();
        if (reducedMotion || !hasGsap) {
          animateMenuMotion(false);
          finishClose();
          return;
        }
        animateMenuMotion(false, finishClose);
      }

      if (window.AimyMenuSelect && typeof window.AimyMenuSelect.playMenuReveal === "function") {
        window.AimyMenuSelect.playMenuReveal(false, runCloseUiMotion);
        return;
      }

      runCloseUiMotion();
    }

    function toggle() {
      if (isOpen) closeMenu();
      else openMenu();
    }

    function goTo(href) {
      if (isLegalHref(href)) {
        window.location.replace(normalizeLegalHref(href));
        return;
      }
      if (window.AimySpa && typeof window.AimySpa.canHandle === "function" && window.AimySpa.canHandle(href)) {
        window.AimySpa.navigate(href);
        return;
      }
      if (window.AimyPageTransition && typeof window.AimyPageTransition.navigate === "function") {
        window.AimyPageTransition.navigate(href);
      } else {
        window.location.href = href;
      }
    }

    hitIn.addEventListener("click", function (e) {
      e.preventDefault();
      toggle();
    });
    hitOut.addEventListener("click", function (e) {
      e.preventDefault();
      toggle();
    });

    shell.addEventListener("click", function (e) {
      if (!isOpen || !canClick) return;
      if (performance.now() < shellIgnoreUntil) return;
      if (e.target.closest(".pk-menulink, .pk-menu-social, .pk-menu-panel")) return;
      closeMenu();
    });

    navLinks.forEach(function (link) {
      link.addEventListener("click", function (e) {
        if (this.classList.contains("is-current")) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        var href = this.href || this.getAttribute("href");
        if (!href || !isOpen) return;
        e.preventDefault();
        e.stopPropagation();
        closeMenu({ restoreFocus: false });
        goTo(href);
      });
    });

    /* —— Coin 3D idle / hover (no GSAP / canvas) —— */
    var coinHover = 0;
    var coinPointer = { x: 0, y: 0 };
    var coinRendered = { x: 0, y: 0 };
    var coinScrollImpulse = 0;
    var coinScrollVelocity = 0;
    var coinLastScroll = window.scrollY || 0;
    var coinScrollTurn = 0;
    var lastCoinTransform = "";

    function updateCoinScrollTurn(scrollY) {
      var length = Math.max(1, window.innerHeight * 0.9);
      var progress = Math.max(0, Math.min(1, scrollY / length));
      var eased = progress * progress * (3 - 2 * progress);
      coinScrollTurn = 360 * eased;
    }

    updateCoinScrollTurn(coinLastScroll);

    function syncCoinMotion(time) {
      if (reducedMotion) {
        coin.style.transform = "rotateX(-7deg) rotateY(8deg)";
        return;
      }
      coinRendered.x += (coinPointer.x - coinRendered.x) * 0.075;
      coinRendered.y += (coinPointer.y - coinRendered.y) * 0.075;
      coinScrollVelocity += (coinScrollImpulse - coinScrollVelocity) * 0.14;
      coinScrollImpulse *= 0.8;

      var idleX = Math.sin(time * 0.0005) * 23 * (1 - coinHover);
      var idleY = Math.cos(time * 0.0005) * 23 * (1 - coinHover);
      var scrollTilt = Math.max(-32, Math.min(32, coinScrollVelocity * 0.55));
      var rx = idleX - coinRendered.y * 40 * coinHover + scrollTilt;
      var ry = coinScrollTurn + idleY + coinRendered.x * 40 * coinHover;
      var next =
        "rotateX(" + rx.toFixed(2) + "deg) " + "rotateY(" + ry.toFixed(2) + "deg)";
      if (next !== lastCoinTransform) {
        lastCoinTransform = next;
        coin.style.transform = next;
      }
    }

    function enterCoin() {
      coinHover = 1;
    }
    function moveCoin(e) {
      var rect = coinButton.getBoundingClientRect();
      var x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      var y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      coinPointer.x = Math.max(-1, Math.min(1, x));
      coinPointer.y = Math.max(-1, Math.min(1, y));
    }
    function leaveCoin() {
      coinHover = 0;
      coinPointer.x = 0;
      coinPointer.y = 0;
    }

    [hitIn, hitOut].forEach(function (hit) {
      hit.addEventListener("pointerenter", enterCoin);
      hit.addEventListener("pointermove", moveCoin, { passive: true });
      hit.addEventListener("pointerleave", leaveCoin);
    });

    window.addEventListener(
      "scroll",
      function () {
        var nextScroll = window.scrollY || 0;
        var delta = nextScroll - coinLastScroll;
        coinLastScroll = nextScroll;
        coinScrollImpulse = delta;
        updateCoinScrollTurn(nextScroll);
      },
      { passive: true }
    );

    document.addEventListener("keydown", function (e) {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        if (canClick) closeMenu();
        return;
      }

      if (menuCarouselWrap) return;

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        var dir = e.key === "ArrowDown" ? 1 : -1;
        var next = selectedIndex < 0 ? 0 : selectedIndex + dir;
        if (next < 0) next = navLinks.length - 1;
        if (next >= navLinks.length) next = 0;
        setSelected(next);
        navLinks[next].focus({ preventScroll: true });
        return;
      }

      if (e.key === "Home") {
        e.preventDefault();
        setSelected(0);
        navLinks[0].focus({ preventScroll: true });
        return;
      }

      if (e.key === "End") {
        e.preventDefault();
        setSelected(navLinks.length - 1);
        navLinks[navLinks.length - 1].focus({ preventScroll: true });
        return;
      }

      if (e.key === "Tab") {
        refreshFocusables();
        if (!focusables.length) return;
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    function draw(time) {
      syncCoinMotion(time || performance.now());
      requestAnimationFrame(draw);
    }

    window.__aimyCloseMenu = closeMenu;

    showHits(false);
    requestAnimationFrame(draw);
  }

  function startWhenReady(onReady) {
    /* GSAP is deferred on pages — wait briefly so veil reveal can use it */
    function finish() {
      hasGsap = typeof gsap !== "undefined";
      bootMenuDom();
      if (typeof onReady === "function") onReady();
    }
    if (isLegalPage()) {
      finish();
      return;
    }
    if (typeof gsap !== "undefined" || reducedMotion) {
      finish();
      return;
    }
    var tries = 0;
    var poll = window.setInterval(function () {
      tries += 1;
      if (typeof gsap !== "undefined" || tries > 40) {
        window.clearInterval(poll);
        finish();
      }
    }, 50);
  }

  function bootOverlayMenu(onReady) {
    if (menuBooted) {
      if (typeof onReady === "function") onReady();
      return;
    }
    menuBooted = true;
    startWhenReady(onReady);
  }

  function boot(options) {
    bootSocialsScroll(options);
    bootOverlayMenu(function () {
      bootChromeReveal(options);
    });
  }

  global.Polykroma = {
    version: VERSION,
    boot: boot,
    bootSocialsScroll: bootSocialsScroll,
    bootChromeReveal: bootChromeReveal,
    bootOverlayMenu: bootOverlayMenu,
  };

  function start() {
    var splashOnly = document.querySelector("[data-aimy-splash-only]");
    if (splashOnly) {
      bootSocialsScroll();
      bootOverlayMenu(function () {
        bootChromeReveal({ settleMs: prefersReducedMotion() ? 40 : 640 });
      });
      return;
    }
    boot();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})(typeof window !== "undefined" ? window : this);
