/**
 * work-stickerbook.js — Hytale sketchbook (manifest-driven, uniform-gap layout).
 */
(function () {
  "use strict";

  var MANIFEST_URL = "./assets/content/hytale/sketchbook/index.json?v=sketchbook-8";
  var ASSET_BASE = "./assets/content/hytale/";
  var MANIFEST_TAG = "sketchbook-8";

  var holoCleanups = [];
  var resizeObserver = null;
  var onWindowResize = null;
  var onZoomKeydown = null;
  var canvasEl = null;
  var shellEl = null;
  var zoomEl = null;
  var zoomImg = null;
  var zoomLastFocus = null;
  var zoomMountParent = null;
  var zoomMountNext = null;
  var stickerStates = [];
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function hashSeed(str) {
    var h = 0;
    for (var i = 0; i < str.length; i += 1) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  function seededRandom(seed) {
    var x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function resolveSrc(relativePath) {
    if (!relativePath) return "";
    if (
      relativePath.indexOf("data:") === 0 ||
      relativePath.indexOf("http://") === 0 ||
      relativePath.indexOf("https://") === 0
    ) {
      return relativePath;
    }
    var base = ASSET_BASE.charAt(ASSET_BASE.length - 1) === "/" ? ASSET_BASE : ASSET_BASE + "/";
    var combined =
      relativePath.indexOf("./") === 0 || relativePath.indexOf("/") === 0
        ? relativePath
        : base + relativePath;
    try {
      return new URL(combined, document.baseURI || window.location.href).href;
    } catch (err) {
      return combined;
    }
  }

  function readGap(canvas) {
    var host = canvas && canvas.parentElement;
    if (!host) return 24;
    var raw = getComputedStyle(host).getPropertyValue("--sketch-gap").trim();
    if (!raw) return 24;
    var probe = document.createElement("div");
    probe.style.width = raw;
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    document.body.appendChild(probe);
    var px = probe.getBoundingClientRect().width;
    probe.remove();
    return px > 0 ? px : 24;
  }

  function minCellForWidth(width) {
    var narrow = 360;
    var wide = 1920;
    var t = (width - narrow) / (wide - narrow);
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    return 108 + t * 152;
  }

  function columnCount(innerWidth, gap, minCell) {
    return Math.max(2, Math.floor((innerWidth + gap) / (minCell + gap)));
  }

  function stickerRotation(id) {
    var seed = hashSeed(String(id || "sticker"));
    return -9 + seededRandom(seed + 17) * 18;
  }

  function layoutStickers() {
    if (!canvasEl || !stickerStates.length) return;

    var gap = readGap(canvasEl);
    var pad = gap;
    var width = canvasEl.clientWidth;
    if (width <= 0) return;

    var innerW = Math.max(1, width - pad * 2);
    var minCell = minCellForWidth(width);
    var cols = columnCount(innerW, gap, minCell);
    var cellW = (innerW - (cols - 1) * gap) / cols;
    var colHeights = [];
    var c;

    for (c = 0; c < cols; c += 1) {
      colHeights[c] = pad;
    }

    stickerStates.forEach(function (state) {
      var col = 0;
      for (c = 1; c < cols; c += 1) {
        if (colHeights[c] < colHeights[col]) col = c;
      }

      var aspect = state.aspect || 1;
      var itemH = cellW * aspect;
      var x = pad + col * (cellW + gap);
      var y = colHeights[col];

      state.el.style.width = cellW + "px";
      state.el.style.left = x + "px";
      state.el.style.top = y + "px";

      colHeights[col] += itemH + gap;
    });

    var maxH = pad;
    colHeights.forEach(function (h) {
      if (h > maxH) maxH = h;
    });
    canvasEl.style.height = maxH + "px";
  }

  function refreshStickerMask(card, src) {
    if (!card || !src) return;
    card.style.setProperty("--sticker-mask", 'url("' + String(src).replace(/"/g, '\\"') + '")');
  }

  function syncStickerStage(card, img) {
    var stage = card.querySelector(".hytale-sketchbook__stage");
    if (!stage || !img || !img.naturalWidth || !img.naturalHeight) return;
    stage.style.aspectRatio = img.naturalWidth + " / " + img.naturalHeight;
  }

  function loadStickerImage(state) {
    return new Promise(function (resolve) {
      var img = state.el.querySelector(".hytale-sketchbook__img");
      if (!img) {
        resolve(state);
        return;
      }

      function finish() {
        state.aspect = img.naturalHeight / Math.max(1, img.naturalWidth);
        syncStickerStage(state.el, img);
        refreshStickerMask(state.el, img.currentSrc || img.src);
        resolve(state);
      }

      img.addEventListener("load", finish, { once: true });
      img.addEventListener(
        "error",
        function () {
          state.aspect = 1;
          resolve(state);
        },
        { once: true }
      );

      img.decoding = "async";
      img.loading = "lazy";
      img.src = state.src;

      if (img.complete && img.naturalWidth) finish();
    });
  }

  function ensureZoomShell() {
    if (!shellEl) return;
    zoomEl = shellEl.querySelector("[data-sketchbook-zoom]");
    zoomImg = shellEl.querySelector("[data-sketchbook-zoom-img]");
    if (!zoomEl || zoomEl.dataset.zoomBound === "1") return;

    var closeBtn = zoomEl.querySelector("[data-sketchbook-zoom-close]");
    if (closeBtn) {
      closeBtn.addEventListener("click", closeZoom);
    }

    zoomEl.dataset.zoomBound = "1";
  }

  function stopScrollForZoom() {
    if (window.Polyglide && typeof window.Polyglide.stop === "function") {
      window.Polyglide.stop();
    }
  }

  function startScrollAfterZoom() {
    if (window.Polyglide && typeof window.Polyglide.start === "function") {
      window.Polyglide.start();
    }
  }

  function bindZoomKeydown() {
    if (onZoomKeydown) return;
    onZoomKeydown = function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeZoom();
      }
    };
    document.addEventListener("keydown", onZoomKeydown);
  }

  function unbindZoomKeydown() {
    if (!onZoomKeydown) return;
    document.removeEventListener("keydown", onZoomKeydown);
    onZoomKeydown = null;
  }

  function mountZoomOverlay() {
    if (!zoomEl || zoomEl.dataset.sketchbookZoomMounted === "1") return;

    zoomMountParent = zoomEl.parentNode;
    zoomMountNext = zoomEl.nextSibling;
    zoomEl.dataset.sketchbookZoomMounted = "1";
    document.body.appendChild(zoomEl);
  }

  function unmountZoomOverlay() {
    if (!zoomEl || zoomEl.dataset.sketchbookZoomMounted !== "1") return;

    zoomEl.dataset.sketchbookZoomMounted = "0";
    if (zoomMountParent) {
      zoomMountParent.insertBefore(zoomEl, zoomMountNext || null);
    }
    zoomMountParent = null;
    zoomMountNext = null;
  }

  function openZoom(state) {
    if (!zoomEl || !zoomImg || !state) return;

    var thumb = state.el.querySelector(".hytale-sketchbook__img");
    var src = (thumb && (thumb.currentSrc || thumb.src)) || state.src;
    var label = state.el.getAttribute("aria-label") || "Model preview";

    zoomLastFocus = document.activeElement;
    zoomImg.src = src;
    zoomImg.alt = label;

    mountZoomOverlay();
    zoomEl.hidden = false;
    zoomEl.classList.add("is-open");
    document.body.classList.add("is-sketchbook-zoom-open");
    stopScrollForZoom();
    bindZoomKeydown();
  }

  function closeZoom() {
    if (!zoomEl) return;

    zoomEl.classList.remove("is-open");
    zoomEl.hidden = true;
    document.body.classList.remove("is-sketchbook-zoom-open");
    unmountZoomOverlay();
    startScrollAfterZoom();
    unbindZoomKeydown();

    if (zoomImg) {
      zoomImg.removeAttribute("src");
      zoomImg.alt = "";
    }

    if (zoomLastFocus && typeof zoomLastFocus.focus === "function") {
      zoomLastFocus.focus();
    }
    zoomLastFocus = null;
  }

  function bindStickerOpen(state) {
    var card = state.el;

    function openFromSticker(event) {
      if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") return;
      if (event.type === "keydown") event.preventDefault();
      openZoom(state);
    }

    card.addEventListener("click", openFromSticker);
    card.addEventListener("keydown", openFromSticker);
  }

  function bindStickerHolo(card) {
    if (!window.WorkStickerHolo || typeof window.WorkStickerHolo.bind !== "function") return;
    var rotator = card.querySelector(".hytale-sketchbook__rotator");
    var stage = card.querySelector(".hytale-sketchbook__stage");
    if (!rotator || !stage) return;

    holoCleanups.push(
      window.WorkStickerHolo.bind(card, {
        varTarget: stage,
        tiltTarget: rotator,
        interactTarget: card,
        onRefresh: function () {
          var img = card.querySelector(".hytale-sketchbook__img");
          if (!img) return;
          refreshStickerMask(card, img.currentSrc || img.src || "");
        },
      })
    );
  }

  function createSticker(relativePath, index) {
    var id = relativePath + ":" + index;
    var rot = stickerRotation(id);
    var card = document.createElement("div");

    card.className =
      "hytale-sketchbook__sticker work-sticker card interactive";
    card.setAttribute("data-rarity", "rare rainbow");
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    card.dataset.sketchSrc = relativePath;
    card.style.setProperty("--sketch-rot", rot.toFixed(2) + "deg");

    var label = relativePath.split("/").pop().replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
    card.setAttribute("aria-label", label);

    var translater = document.createElement("div");
    translater.className = "card__translater hytale-sketchbook__translater";

    var rotator = document.createElement("div");
    rotator.className = "card__rotator hytale-sketchbook__rotator";

    var stage = document.createElement("div");
    stage.className = "hytale-sketchbook__stage";

    var shine = document.createElement("div");
    shine.className = "card__shine hytale-sketchbook__shine";
    shine.setAttribute("aria-hidden", "true");

    var glare = document.createElement("div");
    glare.className = "card__glare hytale-sketchbook__glare";
    glare.setAttribute("aria-hidden", "true");

    var img = document.createElement("img");
    img.className = "card__front hytale-sketchbook__img";
    img.alt = label;

    stage.appendChild(shine);
    stage.appendChild(glare);
    stage.appendChild(img);
    rotator.appendChild(stage);
    translater.appendChild(rotator);
    card.appendChild(translater);

    bindStickerHolo(card);

    var state = {
      id: id,
      src: resolveSrc(relativePath),
      relativePath: relativePath,
      aspect: 1,
      el: card,
    };

    bindStickerOpen(state);
    return state;
  }

  function fetchManifest() {
    return fetch(MANIFEST_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("manifest fetch failed");
        return res.json();
      })
      .then(function (data) {
        if (!data || !Array.isArray(data.items)) return [];
        return data.items.filter(function (item) {
          return typeof item === "string" && item.trim();
        });
      });
  }

  function bindResize() {
    if (onWindowResize) return;

    onWindowResize = function () {
      window.requestAnimationFrame(layoutStickers);
    };

    window.addEventListener("resize", onWindowResize, { passive: true });
    window.addEventListener("orientationchange", onWindowResize, { passive: true });

    if (typeof ResizeObserver !== "undefined" && canvasEl) {
      resizeObserver = new ResizeObserver(onWindowResize);
      resizeObserver.observe(canvasEl);
    }
  }

  function unbindResize() {
    if (onWindowResize) {
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("orientationchange", onWindowResize);
      onWindowResize = null;
    }
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
  }

  function renderManifest(items) {
    if (!canvasEl) return Promise.resolve();

    canvasEl.innerHTML = "";
    stickerStates = items.map(function (path, index) {
      return createSticker(path, index);
    });

    stickerStates.forEach(function (state) {
      canvasEl.appendChild(state.el);
    });

    layoutStickers();
    bindResize();

    stickerStates.forEach(function (state) {
      loadStickerImage(state).then(function () {
        layoutStickers();
      });
    });

    return Promise.resolve();
  }

  function build(panel) {
    panel = panel || document.querySelector('[data-work-category-panel="hytale"]');
    if (!panel) return Promise.resolve();

    shellEl = panel.querySelector("[data-hytale-sketchbook]");
    canvasEl = shellEl && shellEl.querySelector("[data-sketchbook-canvas]");
    var legacyGrid = panel.querySelector("#models-grid");

    if (!shellEl || !canvasEl) return Promise.resolve();

    if (shellEl.dataset.sketchbookReady === "1" && stickerStates.length) {
      ensureZoomShell();
      layoutStickers();
      return Promise.resolve();
    }

    teardown();

    shellEl = panel.querySelector("[data-hytale-sketchbook]");
    canvasEl = shellEl.querySelector("[data-sketchbook-canvas]");

    return fetchManifest()
      .then(function (items) {
        if (!items.length) {
          shellEl.hidden = true;
          shellEl.dataset.sketchbookReady = "0";
          return;
        }

        shellEl.hidden = false;
        if (legacyGrid) {
          legacyGrid.hidden = true;
          legacyGrid.setAttribute("aria-hidden", "true");
        }

        return renderManifest(items).then(function () {
          ensureZoomShell();
          shellEl.dataset.sketchbookReady = "1";
        });
      })
      .catch(function () {
        shellEl.hidden = true;
        shellEl.dataset.sketchbookReady = "0";
      });
  }

  function teardown() {
    closeZoom();
    unbindResize();
    holoCleanups.forEach(function (fn) {
      if (typeof fn === "function") fn();
    });
    holoCleanups = [];

    var shell = document.querySelector("[data-hytale-sketchbook]");
    var grid = document.querySelector('[data-work-category-panel="hytale"] #models-grid');

    if (shell) {
      shell.hidden = true;
      delete shell.dataset.sketchbookReady;
    }
    if (canvasEl) canvasEl.innerHTML = "";

    if (grid) {
      grid.hidden = false;
      grid.removeAttribute("aria-hidden");
    }

    canvasEl = null;
    shellEl = null;
    zoomEl = null;
    zoomImg = null;
    stickerStates = [];
  }

  window.WorkStickerbook = {
    build: build,
    teardown: teardown,
    isBuilt: function () {
      return !!(shellEl && shellEl.dataset.sketchbookReady === "1");
    },
    relayout: layoutStickers,
    manifestTag: MANIFEST_TAG,
  };
})();
