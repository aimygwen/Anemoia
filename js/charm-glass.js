/**
 * charm-glass.js
 * Charm stack prep (iris clipped to charm-base) + frosted blur panes for base/face/bow/hair.
 */
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var HOST_SELECTOR = ".site-header[data-aimy-chrome] .brand";
  var BLUR_LAYERS = [
    "charm-base",
    "charm-face",
    "charm-bow",
    "charm-hair",
  ];
  var LAYER_STACK = [
    "charm-base",
    "charm-face",
    "charm-hair",
    "charm-bow",
    "charm-iris",
    "charm-lashes",
    "charm-highlight",
  ];
  var markCounter = 0;

  function whenGlassReady(cb) {
    var markReady = false;
    var chromeReady =
      document.documentElement.classList.contains("pk-chrome-settled");
    var ran = false;

    function tryRun() {
      if (ran || !markReady || !chromeReady) return;
      ran = true;
      cb();
    }

    function onMarkReady() {
      markReady = true;
      tryRun();
    }

    function markChromeReady() {
      if (chromeReady) return;
      chromeReady = true;
      tryRun();
    }

    if (window.AimyCharmMark && window.AimyCharmMark.ready) {
      window.AimyCharmMark.ready.then(onMarkReady);
    } else {
      document.addEventListener("aimy-charm-mark-ready", onMarkReady, {
        once: true,
      });
    }

    if (chromeReady) {
      tryRun();
    }

    var obs = new MutationObserver(function () {
      if (!document.documentElement.classList.contains("pk-chrome-settled")) {
        return;
      }
      obs.disconnect();
      markChromeReady();
    });
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    /* Fallback if chrome reveal never settles (menu boot delay, etc.). */
    window.setTimeout(markChromeReady, 2400);
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
      host.removeAttribute("data-brand-glass-portal");
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
    var blurOk =
      style.webkitBackdropFilter !== "none" || style.backdropFilter !== "none";
    return blurOk && pane.offsetWidth > 0 && pane.offsetHeight > 0;
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

  function sanitizeMaskNode(node) {
    if (!node || node.nodeType !== 1) return;

    node.removeAttribute("id");
    node.removeAttribute("class");
    node.removeAttribute("data-iris");
    node.removeAttribute("data-spec-edge");
    node.removeAttribute("serif:id");

    var kids = node.childNodes;
    var i;
    for (i = 0; i < kids.length; i++) sanitizeMaskNode(kids[i]);
  }

  function paintFillRecursive(node, fill, fillRule) {
    if (!node || node.nodeType !== 1) return;

    var tag = node.tagName.toLowerCase();
    if (
      tag === "path" ||
      tag === "circle" ||
      tag === "rect" ||
      tag === "ellipse" ||
      tag === "polygon" ||
      tag === "polyline"
    ) {
      node.setAttribute("fill", fill);
      if (fillRule) {
        node.setAttribute("fill-rule", fillRule);
        node.setAttribute("clip-rule", fillRule);
      }
      node.removeAttribute("style");
    }

    var kids = node.childNodes;
    var i;
    for (i = 0; i < kids.length; i++) paintFillRecursive(kids[i], fill, fillRule);
  }

  function cloneLayerGeometry(layer, fill, fillRule) {
    var group = document.createElementNS(SVG_NS, "g");
    if (!layer) return group;

    if (!fillRule) fillRule = layer.getAttribute("fill-rule");
    if (fillRule) group.setAttribute("fill-rule", fillRule);

    var i;
    for (i = 0; i < layer.childNodes.length; i++) {
      var clone = layer.childNodes[i].cloneNode(true);
      sanitizeMaskNode(clone);
      paintFillRecursive(clone, fill, fillRule);
      group.appendChild(clone);
    }
    return group;
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

  function buildIrisBaseClip(mark, slot) {
    var irisLayer = mark.querySelector(".brand-layer--charm-iris");
    var baseLayer = mark.querySelector(".brand-layer--charm-base");
    if (!irisLayer || !baseLayer) return null;

    unwrapIrisMask(irisLayer);
    removeIrisDefs(mark);

    var maskId = "mono-charm-iris-base-" + slot;
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

    /* Iris visible only inside charm-base.svg geometry (eye sockets). */
    mask.appendChild(cloneLayerGeometry(baseLayer, "#ffffff", "evenodd"));

    defs.appendChild(mask);
    mark.insertBefore(defs, mark.firstChild);
    applyIrisMaskWrap(irisLayer, maskId);
    return mask;
  }

  function prepareMarkStack(mark) {
    if (!mark || mark.getAttribute("data-charm-stack-ready") === "1") return;

    reorderLayerStack(mark);
    markCounter += 1;
    buildIrisBaseClip(mark, markCounter);
    mark.setAttribute("data-charm-stack-ready", "1");

    if (window.AimyBrandEyes && typeof window.AimyBrandEyes.remeasure === "function") {
      window.AimyBrandEyes.remeasure();
    }
  }

  function buildPortal() {
    var portal = document.createElement("div");
    portal.className = "brand-glass-portal";
    portal.setAttribute("aria-hidden", "true");

    var panes = [];
    var i;

    for (i = 0; i < BLUR_LAYERS.length; i++) {
      var pane = document.createElement("div");
      pane.className =
        "mono-charm-glass-layer mono-charm-glass-layer--" + BLUR_LAYERS[i];
      var orb = document.createElement("span");
      orb.className = "brand-charm-orb-pane";
      orb.setAttribute("aria-hidden", "true");
      pane.appendChild(orb);
      portal.appendChild(pane);
      panes.push(pane);
    }

    return { portal: portal, panes: panes };
  }

  function glassifyHost(host) {
    if (!host) return;

    var mark = host.querySelector(".brand-mark");
    if (!mark) return;

    prepareMarkStack(mark);

    if (!supportsBlur()) return;
    if (host.getAttribute("data-mono-charm-glass") === "1") return;
    if (host.querySelector(".brand-glass-portal")) return;

    cleanupGlassPortal(host, mark);

    function finish() {
      var built = buildPortal();
      host.insertBefore(built.portal, mark);

      function commitGlass() {
        host.setAttribute("data-mono-charm-glass", "1");
        mark.setAttribute("data-mono-charm-glass", "1");
      }

      function tryVerify(attempt) {
        if (verifyBlur(built.panes[0])) {
          commitGlass();
          return;
        }
        if (attempt >= 20) {
          cleanupGlassPortal(host, mark);
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
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
