/**
 * charm-mark.js
 * Hydrates .brand-mark layers from assets/polykroma/branding/charm-*.svg
 * and Charm Redesign/Charm.svg (bow, eyes: sclera / iris / lashes).
 */
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var VERSION = "branding-25";
  var ASSET_DIR = "./assets/polykroma/branding/";
  var REDesign_FILE = "Charm Redesign/Charm.svg";
  var IRIS_SPLIT_X = 1000;

  var REDesign_PARTS = {
    "charm-bow": "Bow",
    "charm-sclera": "Sclera",
    "charm-iris": "Iris",
    "charm-lashes": "Lashes",
  };

  var redesignDocPromise = null;

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

  function fetchRedesignDoc() {
    if (!redesignDocPromise) {
      redesignDocPromise = fetch(
        ASSET_DIR + encodeURI(REDesign_FILE) + "?v=" + VERSION
      ).then(function (res) {
        if (!res.ok) throw new Error("Charm redesign SVG");
        return res.text();
      }).then(function (text) {
        var doc = new DOMParser().parseFromString(text, "image/svg+xml");
        if (doc.querySelector("parsererror")) throw new Error("Charm redesign parse");
        return doc;
      });
    }
    return redesignDocPromise;
  }

  function queryId(root, id) {
    if (!root) return null;
    return root.querySelector('[id="' + id + '"]');
  }

  function extractRedesignLayerSvg(doc, layerKey) {
    var part = REDesign_PARTS[layerKey];
    if (!part) return null;

    var charm = queryId(doc.documentElement, "Charm");
    if (!charm) return null;

    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("xmlns", SVG_NS);
    svg.setAttribute(
      "viewBox",
      doc.documentElement.getAttribute("viewBox") || "0 0 2000 2000"
    );

    var wrap = document.createElementNS(SVG_NS, "g");
    wrap.setAttribute("id", "Charm");

    if (part === "Bow") {
      var bow = queryId(charm, "Bow");
      if (!bow) return null;
      wrap.appendChild(bow.cloneNode(true));
    } else {
      var eyes = queryId(charm, "Eyes");
      if (!eyes) return null;
      var eyesClone = document.createElementNS(SVG_NS, "g");
      eyesClone.setAttribute("id", "Eyes");
      if (eyes.getAttribute("transform")) {
        eyesClone.setAttribute("transform", eyes.getAttribute("transform"));
      }
      var partEl = queryId(eyes, part);
      if (!partEl) return null;
      eyesClone.appendChild(partEl.cloneNode(true));
      wrap.appendChild(eyesClone);
    }

    svg.appendChild(wrap);
    return new XMLSerializer().serializeToString(svg);
  }

  function splitPathSegments(d) {
    return (d || "").split(/(?=M)/i).filter(function (segment) {
      return segment && segment.trim().length > 1;
    });
  }

  function measureSegmentCentroidX(d, irisRoot) {
    var probe = document.createElementNS(SVG_NS, "svg");
    probe.setAttribute("viewBox", "0 0 2000 2000");
    probe.setAttribute("width", "0");
    probe.setAttribute("height", "0");
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";

    var chain = document.createElementNS(SVG_NS, "g");
    if (irisRoot.getAttribute("transform")) {
      chain.setAttribute("transform", irisRoot.getAttribute("transform"));
    }
    var path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d.trim());
    chain.appendChild(path);
    probe.appendChild(chain);
    document.body.appendChild(probe);

    var bb;
    try {
      bb = path.getBBox();
    } catch (e) {
      bb = { x: 0, width: 0 };
    }

    probe.parentNode.removeChild(probe);
    return bb.x + bb.width * 0.5;
  }

  function prepareRedesignScleraLayer(layerEl) {
    if (!layerEl || layerEl.querySelector("clipPath")) return;

    var scleraPath =
      layerEl.querySelector('[id$="Sclera"]') ||
      layerEl.querySelector("path#Sclera") ||
      layerEl.querySelector("#Eyes path");

    if (!scleraPath || scleraPath.tagName !== "path") return;

    var host =
      scleraPath.parentNode && scleraPath.parentNode.getAttribute("id") &&
      scleraPath.parentNode.getAttribute("id").indexOf("Sclera") !== -1
        ? scleraPath.parentNode
        : null;

    if (!host) {
      host = document.createElementNS(SVG_NS, "g");
      host.setAttribute("id", "Sclera");
      scleraPath.parentNode.insertBefore(host, scleraPath);
      host.appendChild(scleraPath);
    }

    var clip = document.createElementNS(SVG_NS, "clipPath");
    clip.setAttribute("id", "_clip1");
    clip.appendChild(scleraPath.cloneNode(true));

    while (host.firstChild) host.removeChild(host.firstChild);
    host.appendChild(clip);
  }

  function prepareRedesignIrisLayer(layerEl) {
    if (!layerEl || layerEl.querySelector(".iris-pupil")) return;

    var irisRoot =
      layerEl.querySelector('[id$="Iris"]') || layerEl.querySelector("#Iris");
    if (!irisRoot) {
      prepareIrisLayer(layerEl);
      return;
    }

    var leftWrap = document.createElementNS(SVG_NS, "g");
    leftWrap.setAttribute("class", "iris-pupil");
    leftWrap.setAttribute("data-iris", "left");
    var rightWrap = document.createElementNS(SVG_NS, "g");
    rightWrap.setAttribute("class", "iris-pupil");
    rightWrap.setAttribute("data-iris", "right");

    var paths = irisRoot.querySelectorAll("path");
    var p;
    for (p = 0; p < paths.length; p++) {
      var parts = splitPathSegments(paths[p].getAttribute("d"));
      var i;
      for (i = 0; i < parts.length; i++) {
        var cx = measureSegmentCentroidX(parts[i], irisRoot);
        var pupilPath = document.createElementNS(SVG_NS, "path");
        pupilPath.setAttribute("d", parts[i].trim());
        if (cx < IRIS_SPLIT_X) leftWrap.appendChild(pupilPath);
        else rightWrap.appendChild(pupilPath);
      }
    }

    while (irisRoot.firstChild) irisRoot.removeChild(irisRoot.firstChild);
    irisRoot.appendChild(leftWrap);
    irisRoot.appendChild(rightWrap);
  }

  function prepareIrisLayer(layerEl) {
    if (!layerEl || layerEl.querySelector(".iris-pupil")) return;

    var paths = layerEl.querySelectorAll("path");
    var sideNames = ["left", "right"];
    var p;

    for (p = 0; p < paths.length; p++) {
      var path = paths[p];
      var d = path.getAttribute("d") || "";
      var parts = d.split(/(?=M)/i).filter(function (segment) {
        return segment && segment.trim().length > 1;
      });
      var parent = path.parentNode;
      if (!parent) continue;

      if (parts.length < 2) {
        var single = document.createElementNS("http://www.w3.org/2000/svg", "g");
        single.setAttribute("class", "iris-pupil");
        single.setAttribute("data-iris", "left");
        parent.insertBefore(single, path);
        single.appendChild(path);
        continue;
      }

      var i;
      for (i = 0; i < parts.length; i++) {
        var wrap = document.createElementNS("http://www.w3.org/2000/svg", "g");
        wrap.setAttribute("class", "iris-pupil");
        wrap.setAttribute("data-iris", sideNames[i] || "right");
        var pupilPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pupilPath.setAttribute("d", parts[i].trim());
        wrap.appendChild(pupilPath);
        parent.insertBefore(wrap, path);
      }
      parent.removeChild(path);
    }
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

    if (key === "charm-sclera") {
      prepareRedesignScleraLayer(layerEl);
    }

    if (key === "charm-iris") {
      prepareRedesignIrisLayer(layerEl);
    }

    stripPaint(layerEl);

    return true;
  }

  function hydrateLayer(layerEl) {
    var key = layerKey(layerEl);
    if (!key) return Promise.resolve(false);

    if (REDesign_PARTS[key]) {
      return fetchRedesignDoc().then(function (doc) {
        var text = extractRedesignLayerSvg(doc, key);
        if (!text) throw new Error("charm redesign layer " + key);
        return importSvgChildren(layerEl, text);
      });
    }

    return Promise.resolve(false);
  }

  function hydrateMark(mark) {
    if (!mark || mark.__charmHydrated) return Promise.resolve(mark);

    var layers = mark.querySelectorAll(".brand-layer");
    if (!layers.length) return Promise.resolve(mark);

    var jobs = [];
    for (var i = 0; i < layers.length; i++) jobs.push(hydrateLayer(layers[i]));

    return Promise.all(jobs).then(function () {
      mark.__charmHydrated = true;
      mark.setAttribute("data-charm-hydrated", "1");
      return mark;
    });
  }

  function flattenRedesignLensWrap(mark) {
    if (!mark || mark.getAttribute("data-charm-redesign") !== "1") return;

    var stack = mark.querySelector(".brand-mark-stack");
    if (!stack) return;

    var wrap = stack.querySelector(".charm-lens-ink-wrap");
    if (wrap) {
      var sharp = wrap.querySelector(".charm-lens-ink-sharp") || wrap;
      var layers = sharp.querySelectorAll(
        ".brand-layer--charm-iris, .brand-layer--charm-bow, .brand-layer--charm-lashes"
      );
      var i;
      for (i = 0; i < layers.length; i++) {
        stack.insertBefore(layers[i], wrap);
      }
      wrap.parentNode.removeChild(wrap);
    }

    var defs = mark.querySelector(".charm-lens-aberr-defs");
    if (defs && defs.parentNode) defs.parentNode.removeChild(defs);

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
        if (window.AimyCharmGlass && window.AimyCharmGlass.prepareMarkStack) {
          var marks = document.querySelectorAll(".brand-mark");
          for (var m = 0; m < marks.length; m++) {
            window.AimyCharmGlass.prepareMarkStack(marks[m]);
          }
        }
        var hydrated = document.querySelectorAll(".brand-mark");
        for (var h = 0; h < hydrated.length; h++) {
          flattenRedesignLensWrap(hydrated[h]);
        }
        refreshEyes();
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
