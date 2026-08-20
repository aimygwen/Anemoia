/**
 * charm-glass.js
 * Charm stack: shape blur pane + layer order; iris clipped to sclera eye sockets.
 */
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var HOST_SELECTOR =
    ".site-header[data-aimy-chrome] .brand, .ins-logo-pin-inner, .lp-logo-pin-inner";
  var BLUR_LAYERS = ["charm-shape"];
  var LAYER_STACK = [
    "charm-shape",
    "charm-sclera",
    "charm-iris",
    "charm-face",
    "charm-hair",
    "charm-bow",
    "charm-lashes",
  ];
  var markCounter = 0;

  function whenGlassReady(cb) {
    if (window.AimyCharmMark && window.AimyCharmMark.ready) {
      window.AimyCharmMark.ready.then(cb);
      return;
    }
    document.addEventListener("aimy-charm-mark-ready", cb, { once: true });
  }

  function supportsBlur() {
    if (window.matchMedia("(prefers-reduced-transparency: reduce)").matches) {
      return false;
    }
    if (typeof CSS === "undefined" || !CSS.supports) return true;
    return (
      CSS.supports("backdrop-filter", "blur(1px)") ||
      CSS.supports("-webkit-backdrop-filter", "blur(1px)")
    );
  }

  function unwrapIrisMask(irisLayer) {
    if (!irisLayer) return;
    var wrap = irisLayer.querySelector(".mono-charm-iris-mask-wrap");
    if (!wrap) return;
    while (wrap.firstChild) irisLayer.insertBefore(wrap.firstChild, wrap);
    wrap.parentNode.removeChild(wrap);
    irisLayer.removeAttribute("mask");
  }

  function removeIrisDefs(mark) {
    if (!mark) return;
    var defs = mark.querySelector("defs.mono-charm-glass-defs");
    if (defs && defs.parentNode) defs.parentNode.removeChild(defs);
  }

  function cleanupGlassPortal(host, mark) {
    if (host) {
      var portal = host.querySelector(".brand-glass-portal");
      if (portal && portal.parentNode) portal.parentNode.removeChild(portal);
      host.removeAttribute("data-mono-charm-glass");
      host.removeAttribute("data-mono-charm-glass-fallback");
      host.removeAttribute("data-brand-glass-portal");
      host.style.isolation = "";
    }
    if (mark) mark.removeAttribute("data-mono-charm-glass");
  }

  function cleanupLegacy(host, mark) {
    var stage = host && host.querySelector(".brand-glass-stage");
    if (stage) {
      var stagedMark = stage.querySelector(".brand-mark");
      if (stagedMark) host.insertBefore(stagedMark, stage);
      stage.parentNode.removeChild(stage);
    }

    if (mark) {
      removeIrisDefs(mark);
      unwrapIrisMask(mark.querySelector(".brand-layer--charm-iris"));
      mark.removeAttribute("data-mono-charm-glass");
      mark.removeAttribute("data-charm-stack-ready");
    }

    cleanupGlassPortal(host, mark);
  }

  function verifyBlur(pane) {
    var style = window.getComputedStyle(pane);
    var webkitBlur = style.webkitBackdropFilter || "";
    var blur = style.backdropFilter || "";
    var blurOk =
      (webkitBlur && webkitBlur !== "none") || (blur && blur !== "none");
    return blurOk && pane.offsetWidth > 0 && pane.offsetHeight > 0;
  }

  function enableGlassSampling(host) {
    /* isolation:isolate on .brand traps backdrop samples — release before verify. */
    host.style.isolation = "auto";
  }

  function reorderLayerStack(mark) {
    var stack = mark.querySelector(".brand-mark-stack");
    if (!stack) return;

    var i;
    for (i = 0; i < LAYER_STACK.length; i++) {
      var layer = stack.querySelector(".brand-layer--" + LAYER_STACK[i]);
      if (layer) stack.appendChild(layer);
    }
  }

  function applyIrisMaskWrap(irisLayer, maskId) {
    var wrap = document.createElementNS(SVG_NS, "g");
    wrap.setAttribute("class", "mono-charm-iris-mask-wrap");
    wrap.setAttribute("mask", "url(#" + maskId + ")");

    while (irisLayer.firstChild) {
      wrap.appendChild(irisLayer.firstChild);
    }
    irisLayer.appendChild(wrap);
    return wrap;
  }

  function buildTransformChain(scleraLayer, clipPathEl) {
    var charmRoot =
      scleraLayer.querySelector("[id*='Charm']") || scleraLayer.firstElementChild;
    var scleraNode = clipPathEl && clipPathEl.parentNode;

    var outer = document.createElementNS(SVG_NS, "g");
    if (charmRoot && charmRoot.getAttribute("transform")) {
      outer.setAttribute("transform", charmRoot.getAttribute("transform"));
    }

    var inner = document.createElementNS(SVG_NS, "g");
    if (
      scleraNode &&
      scleraNode !== charmRoot &&
      scleraNode.getAttribute &&
      scleraNode.getAttribute("transform")
    ) {
      inner.setAttribute("transform", scleraNode.getAttribute("transform"));
    }

    var paths = clipPathEl.querySelectorAll("path");
    var i;
    for (i = 0; i < paths.length; i++) {
      inner.appendChild(paths[i].cloneNode(true));
    }

    outer.appendChild(inner);
    return outer;
  }

  function buildIrisScleraClip(mark, slot) {
    var irisLayer = mark.querySelector(".brand-layer--charm-iris");
    var scleraLayer = mark.querySelector(".brand-layer--charm-sclera");
    if (!irisLayer || !scleraLayer) return null;

    var clipPathEl = scleraLayer.querySelector("clipPath");
    if (!clipPathEl || !clipPathEl.querySelector("path")) return null;

    unwrapIrisMask(irisLayer);
    removeIrisDefs(mark);

    var maskId = "mono-charm-iris-sclera-" + slot;
    var defs = document.createElementNS(SVG_NS, "defs");
    defs.setAttribute("class", "mono-charm-glass-defs");

    var mask = document.createElementNS(SVG_NS, "mask");
    mask.setAttribute("id", maskId);
    mask.setAttribute("maskUnits", "userSpaceOnUse");
    mask.setAttribute("maskContentUnits", "userSpaceOnUse");
    mask.setAttribute("x", "0");
    mask.setAttribute("y", "0");
    mask.setAttribute("width", "2048");
    mask.setAttribute("height", "2048");

    var maskContent = buildTransformChain(scleraLayer, clipPathEl);
    var paths = maskContent.querySelectorAll("path");
    var i;

    for (i = 0; i < paths.length; i++) {
      paths[i].setAttribute("fill", "#ffffff");
      paths[i].removeAttribute("id");
      paths[i].removeAttribute("style");
    }

    mask.appendChild(maskContent);
    defs.appendChild(mask);
    mark.insertBefore(defs, mark.firstChild);
    applyIrisMaskWrap(irisLayer, maskId);
    return mask;
  }

  function prepareMarkStack(mark) {
    if (!mark || mark.getAttribute("data-charm-stack-ready") === "1") return;

    reorderLayerStack(mark);
    markCounter += 1;
    buildIrisScleraClip(mark, markCounter);
    mark.setAttribute("data-charm-stack-ready", "1");

    if (window.AimyBrandEyes && typeof window.AimyBrandEyes.rescan === "function") {
      window.AimyBrandEyes.rescan();
    } else if (
      window.AimyBrandEyes &&
      typeof window.AimyBrandEyes.remeasure === "function"
    ) {
      window.AimyBrandEyes.remeasure();
    }
  }

  function buildGlassPane(layerId, withOrb) {
    var pane = document.createElement("div");
    pane.className = "mono-charm-glass-layer mono-charm-glass-layer--" + layerId;
    pane.setAttribute("aria-hidden", "true");

    if (withOrb) {
      var orb = document.createElement("span");
      orb.className = "brand-charm-orb-pane";
      orb.setAttribute("aria-hidden", "true");
      pane.appendChild(orb);
    }

    return pane;
  }

  function buildPortal() {
    var portal = document.createElement("div");
    portal.className = "brand-glass-portal";
    portal.setAttribute("aria-hidden", "true");

    var panes = [];
    var i;

    for (i = 0; i < BLUR_LAYERS.length; i++) {
      var pane = buildGlassPane(BLUR_LAYERS[i], i === 0);
      portal.appendChild(pane);
      panes.push(pane);
    }

    return { portal: portal, panes: panes };
  }

  function resolveHost(host) {
    if (!host) return null;
    if (host.classList && host.classList.contains("brand")) return host;
    if (
      host.classList &&
      (host.classList.contains("ins-logo-pin-inner") ||
        host.classList.contains("lp-logo-pin-inner"))
    ) {
      return host;
    }
    return host.closest(".brand") || host;
  }

  function glassifyHost(host) {
    host = resolveHost(host);
    if (!host) return;

    var mark = host.querySelector(".brand-mark");
    if (!mark) return;

    prepareMarkStack(mark);

    if (!supportsBlur()) return;

    var existingPortal = host.querySelector(".brand-glass-portal");
    if (host.getAttribute("data-mono-charm-glass") === "1") {
      if (existingPortal && existingPortal.querySelector(".mono-charm-glass-layer")) {
        enableGlassSampling(host);
        return;
      }
      cleanupGlassPortal(host, mark);
      host.removeAttribute("data-mono-charm-glass");
      if (mark) mark.removeAttribute("data-mono-charm-glass");
    }
    if (existingPortal && !existingPortal.querySelector(".mono-charm-glass-layer")) {
      cleanupGlassPortal(host, mark);
    }
    if (host.querySelector(".brand-glass-portal")) return;

    cleanupGlassPortal(host, mark);

    function finish() {
      var built = buildPortal();
      host.insertBefore(built.portal, mark);
      enableGlassSampling(host);

      function commitGlass(fallback) {
        host.setAttribute("data-mono-charm-glass", "1");
        mark.setAttribute("data-mono-charm-glass", "1");
        if (fallback) {
          host.setAttribute("data-mono-charm-glass-fallback", "1");
        } else {
          host.removeAttribute("data-mono-charm-glass-fallback");
        }
      }

      function tryVerify(attempt) {
        enableGlassSampling(host);
        if (verifyBlur(built.panes[0])) {
          commitGlass(false);
          return;
        }
        if (attempt >= 24) {
          commitGlass(true);
          return;
        }
        window.setTimeout(function () {
          tryVerify(attempt + 1);
        }, 80);
      }

      tryVerify(0);
    }

    requestAnimationFrame(function () {
      requestAnimationFrame(finish);
    });
  }

  function boot() {
    var hosts = document.querySelectorAll(HOST_SELECTOR);
    var i;
    for (i = 0; i < hosts.length; i++) glassifyHost(hosts[i]);
  }

  function start() {
    whenGlassReady(boot);
  }

  window.AimyCharmGlass = {
    boot: boot,
    prepareMarkStack: prepareMarkStack,
    glassifyHost: glassifyHost,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
