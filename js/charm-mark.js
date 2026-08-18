/**
 * charm-mark.js
 * Hydrates .brand-mark layers from assets/polykroma/branding/charm-*.svg
 * so SVG edits in branding/ appear on the site without duplicating paths in HTML.
 */
(function () {
  "use strict";

  var VERSION = "branding-10";
  var ASSET_DIR = "./assets/polykroma/branding/";

  var LAYER_FILES = {
    "charm-base": "charm-base.svg",
    "charm-iris": "charm-iris.svg",
    "charm-face": "charm-face.svg",
    "charm-hair": "charm-hair.svg",
    "charm-lashes": "charm-lashes.svg",
    "charm-bow": "charm-bow.svg",
    "charm-highlight": "charm-highlight.svg",
  };

  var readyResolve;
  var ready = new Promise(function (resolve) {
    readyResolve = resolve;
  });

  function layerKey(el) {
    var classes = el.className;
    if (classes && classes.baseVal) classes = classes.baseVal;
    if (typeof classes !== "string") classes = "";
    var match = classes.match(/brand-layer--(charm-[a-z-]+)/);
    return match ? match[1] : null;
  }

  function stripPaint(root, keepStroke) {
    if (!root || !root.querySelectorAll) return;

    var nodes = [root];
    var desc = root.querySelectorAll("*");
    for (var i = 0; i < desc.length; i++) nodes.push(desc[i]);

    nodes.forEach(function (node) {
      node.removeAttribute("fill");
      var style = node.getAttribute("style");
      if (!style) return;
      style = style
        .replace(/fill\s*:\s*[^;]+;?\s*/gi, "")
        .replace(/fill-opacity\s*:\s*[^;]+;?\s*/gi, "");
      if (!keepStroke) {
        style = style
          .replace(/stroke\s*:\s*[^;]+;?\s*/gi, "")
          .replace(/stroke-width\s*:\s*[^;]+;?\s*/gi, "");
      }
      style = style.trim();
      if (style) node.setAttribute("style", style);
      else node.removeAttribute("style");
    });
  }

  function collectSvgNodes(root) {
    var nodes = [root];
    if (root && root.querySelectorAll) {
      var desc = root.querySelectorAll("*");
      for (var i = 0; i < desc.length; i++) nodes.push(desc[i]);
    }
    return nodes;
  }

  /* Affinity exports reuse ids (_Image1, Brand, …) — scope per layer inside one brand-mark. */
  function namespaceSvgIds(root, prefix) {
    if (!root || !prefix) return;

    var idMap = {};
    var nodes = collectSvgNodes(root);

    nodes.forEach(function (node) {
      if (!node.getAttribute) return;
      var id = node.getAttribute("id");
      if (!id) return;
      var scoped = prefix + id;
      idMap[id] = scoped;
      node.setAttribute("id", scoped);
    });

    function mapId(id) {
      return idMap[id] || prefix + id;
    }

    function rewriteStyleUrls(style) {
      if (!style || style.indexOf("#") === -1) return style;
      return style.replace(/url\(\s*#([^)\s]+)\s*\)/gi, function (_, id) {
        return "url(#" + mapId(id) + ")";
      });
    }

    nodes.forEach(function (node) {
      if (!node.getAttribute) return;

      ["href", "xlink:href"].forEach(function (attr) {
        var val = node.getAttribute(attr);
        if (!val || val.charAt(0) !== "#") return;
        node.setAttribute(attr, "#" + mapId(val.slice(1)));
      });

      ["clip-path", "mask", "filter"].forEach(function (attr) {
        var val = node.getAttribute(attr);
        if (!val) return;
        node.setAttribute(attr, rewriteStyleUrls(val));
      });

      var style = node.getAttribute("style");
      if (style) {
        var next = rewriteStyleUrls(style);
        if (next !== style) node.setAttribute("style", next);
      }
    });
  }

  function importSvgChildren(layerEl, svgText) {
    var doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
    var root = doc.documentElement;
    if (!root || root.querySelector("parsererror")) return false;

    var key = layerKey(layerEl);

    while (layerEl.firstChild) layerEl.removeChild(layerEl.firstChild);

    var frag = document.createDocumentFragment();
    while (root.firstChild) frag.appendChild(root.firstChild);
    layerEl.appendChild(frag);

    if (key) namespaceSvgIds(layerEl, key + "--");

    var fillRule = root.style && root.style.fillRule;
    if (!fillRule) {
      var rootStyle = root.getAttribute("style");
      if (rootStyle) {
        var match = rootStyle.match(/fill-rule\s*:\s*([a-z]+)/i);
        if (match) fillRule = match[1];
      }
    }
    if (!fillRule) fillRule = root.getAttribute("fill-rule");
    if (fillRule) layerEl.setAttribute("fill-rule", fillRule);

    if (key === "charm-highlight") {
      stripPaint(layerEl, true);
      var paths = layerEl.querySelectorAll("path");
      for (var p = 0; p < paths.length; p++) {
        paths[p].setAttribute("fill", "none");
      }
    } else {
      stripPaint(layerEl);
    }

    return true;
  }

  function fetchLayer(file) {
    return fetch(ASSET_DIR + file + "?v=" + VERSION).then(function (res) {
      if (!res.ok) throw new Error("charm layer " + file);
      return res.text();
    });
  }

  function hydrateLayer(layerEl) {
    var key = layerKey(layerEl);
    if (!key || !LAYER_FILES[key]) return Promise.resolve(false);
    return fetchLayer(LAYER_FILES[key]).then(function (text) {
      return importSvgChildren(layerEl, text);
    });
  }

  function hydrateMark(mark) {
    if (!mark || mark.__charmHydrated) return Promise.resolve(mark);

    var layers = mark.querySelectorAll(".brand-layer");
    if (!layers.length) return Promise.resolve(mark);

    var jobs = [];
    for (var i = 0; i < layers.length; i++) jobs.push(hydrateLayer(layers[i]));

    return Promise.all(jobs).then(function () {
      mark.__charmHydrated = true;
      return mark;
    });
  }

  function refreshEyes() {
    if (!window.AimyBrandEyes) return;
    if (typeof window.AimyBrandEyes.rescan === "function") {
      window.AimyBrandEyes.rescan();
      return;
    }
    window.AimyBrandEyes.scan();
    window.AimyBrandEyes.remeasure();
    window.AimyBrandEyes.nudge();
  }

  function hydrateAll() {
    var marks = document.querySelectorAll(".brand-mark");
    if (!marks.length) {
      readyResolve();
      return ready;
    }

    var jobs = [];
    for (var i = 0; i < marks.length; i++) jobs.push(hydrateMark(marks[i]));

    return Promise.all(jobs)
      .then(function () {
        refreshEyes();
        if (window.AimyCharmGlass && window.AimyCharmGlass.prepareMarkStack) {
          var marks = document.querySelectorAll(".brand-mark");
          for (var m = 0; m < marks.length; m++) {
            window.AimyCharmGlass.prepareMarkStack(marks[m]);
          }
        }
        readyResolve();
        document.dispatchEvent(new CustomEvent("aimy-charm-mark-ready"));
      })
      .catch(function () {
        readyResolve();
      });
  }

  window.AimyCharmMark = {
    VERSION: VERSION,
    ready: ready,
    hydrateAll: hydrateAll,
    hydrateMark: hydrateMark,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hydrateAll);
  } else {
    hydrateAll();
  }
})();
