/**
 * work-stickerbook.js — Hytale Work sticker book (single page, catalog-driven).
 */
(function () {
  "use strict";

  var CONTENT_BASE = "./assets/content/";

  var holoCleanups = [];
  var variantCycleCleanups = [];
  var built = false;
  var pagesHost = null;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var resizeTimer = 0;
  var onResize = null;

  var CATEGORY_ORDER = ["battlegear", "consumables", "collectibles", "cosmetics", "furnishings", "misc"];
  var CATEGORY_LABELS = {
    battlegear: "Battlegear",
    consumables: "Consumables",
    collectibles: "Collectibles",
    cosmetics: "Cosmetics",
    furnishings: "Furnishings",
    misc: "Misc",
  };
  var CATEGORY_LEDES = {
    battlegear: "Weapons, instruments, and gear built for adventure.",
    consumables: "Food, potions, and items that keep you going.",
    collectibles: "Plushies, treasures, and rare finds worth keeping.",
    cosmetics: "Outfits, accessories, and flair for every mood.",
    furnishings: "Modular storage, seating, lighting, and decor.",
    misc: "Torii gates, arcades, and everything in between.",
  };

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

  function gridSpec(stickerCount) {
    var w = window.innerWidth;
    var count = Math.max(1, stickerCount || 1);
    var pad = w < 640 ? 56 : w < 1024 ? 96 : 144;
    var available = Math.max(260, w - pad);
    var minCell = w < 400 ? 92 : w < 640 ? 100 : 112;
    var maxCols = Math.max(2, Math.floor(available / minCell));
    var cols;

    if (w < 400) cols = 2;
    else if (w < 560) cols = 3;
    else if (w < 768) cols = 3;
    else if (w < 1024) cols = 4;
    else if (w < 1320) cols = 5;
    else cols = 5;

    cols = Math.max(2, Math.min(cols, maxCols, count));
    var rows = Math.max(1, Math.ceil(count / cols));

    return { cols: cols, rows: rows };
  }

  function heroSizeMultiplier() {
    var w = window.innerWidth;
    if (w < 480) return 1.28;
    if (w < 768) return 1.45;
    return 1.65;
  }

  function findCatalogItem(catalogId) {
    if (!catalogId || !window.LOWPOLY_CATALOG || !Array.isArray(window.LOWPOLY_CATALOG.items)) {
      return null;
    }
    var id = String(catalogId);
    for (var i = 0; i < window.LOWPOLY_CATALOG.items.length; i += 1) {
      var item = window.LOWPOLY_CATALOG.items[i];
      if (item.id === id || item.stem === id) return item;
    }
    return null;
  }

  function collectVariantFrames(sticker) {
    var baseLabel = sticker.label || sticker.title || sticker.name || "Sticker";
    var frames = [];

    if (Array.isArray(sticker.variants) && sticker.variants.length) {
      sticker.variants.forEach(function (variant) {
        if (!variant || !variant.image) return;
        var suffix =
          variant.label && variant.label !== "Default" ? ", " + variant.label : "";
        frames.push({
          image: resolveImageSrc(variant.image),
          label: baseLabel + suffix,
        });
      });
    } else if (sticker.cycleVariants && sticker.catalogId) {
      var item = findCatalogItem(sticker.catalogId);
      if (item && Array.isArray(item.variants) && item.variants.length) {
        item.variants.forEach(function (variant) {
          if (!variant || !variant.image) return;
          var suffix =
            variant.label && variant.label !== "Default" ? ", " + variant.label : "";
          frames.push({
            image: resolveImageSrc(variant.image),
            label: baseLabel + suffix,
          });
        });
      }
    }

    if (frames.length) return frames;

    if (sticker.image) {
      return [
        {
          image: resolveImageSrc(sticker.image),
          label: baseLabel,
        },
      ];
    }

    return [];
  }

  function stopAllVariantCycles() {
    variantCycleCleanups.forEach(function (fn) {
      if (typeof fn === "function") fn();
    });
    variantCycleCleanups = [];
  }

  function swapStickerFrame(card, img, frame) {
    if (card.classList.contains("interacting")) return;
    card.classList.add("work-sticker--cycle-fade");
    window.setTimeout(function () {
      if (!card.isConnected) return;
      ensureStickerImage(img, card, frame.image);
      img.alt = frame.label;
      card.setAttribute("aria-label", frame.label);
      window.requestAnimationFrame(function () {
        card.classList.remove("work-sticker--cycle-fade");
      });
    }, 220);
  }

  function startVariantCycle(card, img, sticker) {
    if (reduced) return null;
    var frames = collectVariantFrames(sticker);
    if (frames.length < 2) return null;

    var index = 0;
    var seed = hashSeed(String(sticker.catalogId || sticker.label || "") + ":cycle");
    var intervalMs = 2600 + (seed % 900);
    var phaseDelay = seed % intervalMs;
    var timer = 0;
    var phaseTimer = 0;

    card.classList.add("work-sticker--cycle");

    function tick() {
      if (!card.isConnected) return;
      index = (index + 1) % frames.length;
      swapStickerFrame(card, img, frames[index]);
    }

    phaseTimer = window.setTimeout(function () {
      timer = window.setInterval(tick, intervalMs);
    }, phaseDelay);

    return function () {
      if (phaseTimer) window.clearTimeout(phaseTimer);
      if (timer) window.clearInterval(timer);
      card.classList.remove("work-sticker--cycle", "work-sticker--cycle-fade");
    };
  }

  function syncPageVariantCycles() {
    stopAllVariantCycles();
    if (reduced) return;
    if (!pagesHost) return;
    pagesHost.querySelectorAll(".work-sticker").forEach(function (card) {
      var sticker = card.__stickerConfig;
      var img = card.querySelector(".work-sticker__img, .card-preview-img");
      if (!sticker || !img) return;
      var cleanup = startVariantCycle(card, img, sticker);
      if (cleanup) variantCycleCleanups.push(cleanup);
    });
  }

  function resolveImageSrc(raw) {
    if (!raw) return "";
    if (
      raw.indexOf("data:") === 0 ||
      raw.indexOf("http://") === 0 ||
      raw.indexOf("https://") === 0 ||
      raw.indexOf("//") === 0
    ) {
      return raw;
    }
    var base = window.LOWPOLY_ASSET_BASE || CONTENT_BASE;
    if (base && raw.indexOf("./") !== 0 && raw.indexOf("/") !== 0) {
      var sep = base.charAt(base.length - 1) === "/" ? "" : "/";
      raw = base + sep + raw;
    }
    try {
      return new URL(raw, window.location.href).href;
    } catch (err) {
      return raw;
    }
  }

  function syncStickerImages(card, src) {
    if (!card || !src) return;
    var main = card.querySelector(".work-sticker__img, .card-preview-img");
    if (main && main.src !== src) main.src = src;
    refreshStickerMasks(card, src);
  }

  function syncStickerStage(card) {
    var img = card.querySelector(".work-sticker__img, .card-preview-img");
    var stage = card.querySelector(".work-sticker__stage");
    if (!img || !stage || !img.naturalWidth || !img.naturalHeight) return;
    stage.style.aspectRatio = img.naturalWidth + " / " + img.naturalHeight;
    stage.classList.add("work-sticker__stage--sized");
  }

  function refreshStickerMasks(card, src) {
    if (!card || !src) return;
    var mask = 'url("' + String(src).replace(/"/g, '\\"') + '")';
    card.style.setProperty("--sticker-mask", mask);
  }

  function ensureStickerImage(img, card, rawSrc) {
    if (!img || !card) return;

    var raw = rawSrc || card.getAttribute("data-sticker-src") || "";
    if (!raw) return;

    card.setAttribute("data-sticker-src", raw);
    var resolved = resolveImageSrc(raw);
    img.removeAttribute("data-src");
    img.loading = "eager";
    img.decoding = "async";

    function applySrc(nextSrc) {
      if (img.src !== nextSrc) {
        img.src = nextSrc;
      } else {
        img.src = "";
        img.src = nextSrc;
      }
    }

    function onReady() {
      refreshStickerMasks(card, img.currentSrc || resolved);
      syncStickerStage(card);
    }

    img.addEventListener("load", onReady, { once: true });
    img.addEventListener(
      "error",
      function onError() {
        img.removeEventListener("error", onError);
        var bust =
          resolved +
          (resolved.indexOf("?") >= 0 ? "&" : "?") +
          "sticker=" +
          String(Date.now());
        applySrc(bust);
      },
      { once: true }
    );

    applySrc(resolved);
    if (img.complete && img.naturalWidth) {
      onReady();
    }
  }

  function applyStickerSize(card, sticker) {
    if (!sticker || !sticker.size) return;
    card.classList.add("work-sticker--" + sticker.size);
  }

  function applyStickerStyle(card, sectionIndex, indexInSection) {
    var id = card.dataset.itemId || String(indexInSection);
    var seed = hashSeed(id + ":s" + sectionIndex);
    var rot = -10 + seededRandom(seed + 23) * 20;
    var scale = 0.94 + seededRandom(seed + 37) * 0.08;
    var sizeMult = 1;

    if (indexInSection === 0) {
      rot = -5 + seededRandom(seed + 23) * 10;
      scale = 1;
      sizeMult = heroSizeMultiplier();
    }

    card.style.setProperty("--sticker-rot", rot.toFixed(2) + "deg");
    card.style.setProperty("--sticker-scale", scale.toFixed(3));
    card.style.setProperty("--sticker-size", sizeMult.toFixed(3));
    applyStickerSize(card, null);
  }

  function layoutSticker(card, sectionIndex, indexInSection, totalInSection) {
    var spec = gridSpec(totalInSection);
    var cols = spec.cols;
    var col = indexInSection % cols;
    var row = Math.floor(indexInSection / cols);
    var totalRows = Math.ceil(totalInSection / cols);
    var itemsThisRow = Math.max(1, Math.min(cols, totalInSection - row * cols));
    var isLastRow = row === totalRows - 1;
    var rowOffset = isLastRow ? (cols - itemsThisRow) * 0.5 : 0;

    card.style.gridColumn = String(Math.round(rowOffset + col) + 1);
    card.style.gridRow = String(row + 1);
    applyStickerStyle(card, sectionIndex, indexInSection);
  }

  function relayoutSection(sectionEl, stickers, sectionIndex) {
    if (!sectionEl || !stickers || !stickers.length) return;
    var spec = gridSpec(stickers.length);
    sectionEl.style.setProperty("--sticker-cols", String(spec.cols));
    sectionEl.style.setProperty("--sticker-rows", String(spec.rows));
    var cards = sectionEl.querySelectorAll(".work-sticker");
    stickers.forEach(function (sticker, index) {
      var card = cards[index];
      if (card) layoutSticker(card, sectionIndex, index, stickers.length);
    });
  }

  function relayoutAllSections() {
    if (!pagesHost) return;
    pagesHost.querySelectorAll(".work-stickerbook__section").forEach(function (section, index) {
      var stickers = section.__sectionStickers || [];
      relayoutSection(section, stickers, index);
    });
  }

  function bindResize() {
    if (onResize) return;
    onResize = function () {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        resizeTimer = 0;
        relayoutAllSections();
      }, 120);
    };
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onResize, { passive: true });
  }

  function unbindResize() {
    if (onResize) {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      onResize = null;
    }
    if (resizeTimer) {
      window.clearTimeout(resizeTimer);
      resizeTimer = 0;
    }
  }

  function bindStickerClick(card, sticker) {
    card.addEventListener("click", function () {
      var catalogId = sticker.catalogId || sticker.id || "";
      if (
        catalogId &&
        window.SpaPages &&
        window.SpaPages.lowpoly &&
        typeof window.SpaPages.lowpoly.openCatalogItem === "function" &&
        window.SpaPages.lowpoly.openCatalogItem(catalogId, card)
      ) {
        return;
      }
    });
    card.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      card.click();
    });
  }

  function createStickerCard(sticker, sectionIndex, indexInSection, totalInSection) {
    var label = sticker.label || sticker.title || sticker.name || "Sticker";
    var stickerId = sticker.id || sticker.catalogId || label;
    var frames = collectVariantFrames(sticker);
    var imageRaw = frames.length ? frames[0].image : resolveImageSrc(sticker.image);
    var card = document.createElement("div");

    card.className = "bento-card card-normal work-sticker card interactive";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", frames.length ? frames[0].label : label);
    card.setAttribute("data-rarity", "rare rainbow");
    card.dataset.itemId = stickerId;
    if (sticker.catalogId) card.dataset.catalogId = sticker.catalogId;
    card.setAttribute("data-sticker-src", imageRaw);
    card.__stickerConfig = sticker;

    var translater = document.createElement("div");
    translater.className = "card__translater work-sticker__translater";

    var rotator = document.createElement("div");
    rotator.className = "card__rotator work-sticker__rotator";

    var stage = document.createElement("div");
    stage.className = "work-sticker__stage";

    var img = document.createElement("img");
    img.className = "card-preview-img card__front work-sticker__img";
    img.alt = frames.length ? frames[0].label : label;

    var shine = document.createElement("div");
    shine.className = "card__shine work-sticker__shine";
    shine.setAttribute("aria-hidden", "true");

    var glare = document.createElement("div");
    glare.className = "card__glare work-sticker__glare";
    glare.setAttribute("aria-hidden", "true");

    stage.appendChild(shine);
    stage.appendChild(glare);
    stage.appendChild(img);
    rotator.appendChild(stage);
    translater.appendChild(rotator);
    card.appendChild(translater);

    layoutSticker(card, sectionIndex, indexInSection, totalInSection);
    bindStickerHolo(card);
    bindStickerClick(card, sticker);
    ensureStickerImage(img, card, imageRaw);

    return card;
  }

  function appendSectionIntro(sectionEl, category) {
    var label = CATEGORY_LABELS[category] || category;
    var lede = CATEGORY_LEDES[category] || "";

    var intro = document.createElement("header");
    intro.className = "work-stickerbook__intro";

    var topic = document.createElement("p");
    topic.className = "work-stickerbook__topic";
    topic.textContent = label;
    intro.appendChild(topic);

    if (lede) {
      var ledeEl = document.createElement("p");
      ledeEl.className = "work-stickerbook__lede";
      ledeEl.textContent = lede;
      intro.appendChild(ledeEl);
    }

    sectionEl.appendChild(intro);
  }

  function buildSectionElement(category, items, sectionIndex) {
    var section = document.createElement("section");
    section.className = "work-stickerbook__section";
    section.setAttribute("data-stickerbook-section", category);

    var spec = gridSpec(items.length);
    section.style.setProperty("--sticker-cols", String(spec.cols));
    section.style.setProperty("--sticker-rows", String(spec.rows));
    section.__sectionStickers = items;

    appendSectionIntro(section, category);

    var grid = document.createElement("div");
    grid.className = "work-stickerbook__grid";
    section.appendChild(grid);

    items.forEach(function (item, index) {
      grid.appendChild(createStickerCard(item, sectionIndex, index, items.length));
    });

    return section;
  }

  function catalogItemToSticker(item) {
    return {
      id: item.id,
      catalogId: item.id,
      label: item.name || item.title || item.id,
      title: item.title,
      name: item.name,
      image: item.image,
      cycleVariants: Array.isArray(item.variants) && item.variants.length > 1,
      variants: item.variants,
    };
  }

  function groupCatalogItems() {
    if (!window.LOWPOLY_CATALOG || !Array.isArray(window.LOWPOLY_CATALOG.items)) {
      return {};
    }

    var groups = {};
    window.LOWPOLY_CATALOG.items.forEach(function (item) {
      if (!item.image || item.image.indexOf("lowpoly/hytale/") === -1) return;
      if (item.image.indexOf("Thumbnails/") !== -1) return;

      var cat = item.category || "misc";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(catalogItemToSticker(item));
    });

    return groups;
  }

  function renderSections(groups) {
    if (!pagesHost) return;
    pagesHost.innerHTML = "";

    var sectionIndex = 0;
    CATEGORY_ORDER.forEach(function (category) {
      var items = groups[category];
      if (!items || !items.length) return;
      var section = buildSectionElement(category, items, sectionIndex);
      pagesHost.appendChild(section);
      sectionIndex++;
    });
  }

  function build(panel) {
    panel = panel || document.querySelector('[data-work-category-panel="hytale"]');
    if (!panel) return Promise.resolve();

    var shell = panel.querySelector("[data-work-stickerbook]");
    var grid = panel.querySelector("#models-grid");
    if (!shell) return Promise.resolve();

    if (shell.dataset.stickerbookReady === "1" && shell.querySelector(".work-stickerbook__section")) {
      pagesHost = shell.querySelector("[data-stickerbook-pages]");
      relayoutAllSections();
      syncPageVariantCycles();
      return Promise.resolve();
    }

    teardown();

    pagesHost = shell.querySelector("[data-stickerbook-pages]");
    if (!pagesHost) return Promise.resolve();

    var groups = groupCatalogItems();
    renderSections(groups);

    shell.hidden = false;
    if (grid) {
      grid.hidden = true;
      grid.setAttribute("aria-hidden", "true");
    }

    built = pagesHost.querySelectorAll(".work-stickerbook__section").length > 0;
    shell.dataset.stickerbookReady = built ? "1" : "0";
    if (built) bindResize();
    syncPageVariantCycles();

    return Promise.resolve();
  }

  function bindStickerHolo(card) {
    if (!window.WorkStickerHolo || typeof window.WorkStickerHolo.bind !== "function") return;
    var rotator = card.querySelector(".work-sticker__rotator");
    var stage = card.querySelector(".work-sticker__stage");
    if (!rotator || !stage) return;
    holoCleanups.push(
      window.WorkStickerHolo.bind(card, {
        varTarget: stage,
        tiltTarget: rotator,
        interactTarget: card,
        onRefresh: function () {
          var img = card.querySelector(".work-sticker__img, .card-preview-img");
          if (!img) return;
          var src = img.currentSrc || img.src || card.getAttribute("data-sticker-src") || "";
          if (src) refreshStickerMasks(card, src);
        },
      })
    );
  }

  function teardown() {
    unbindResize();
    stopAllVariantCycles();
    holoCleanups.forEach(function (fn) {
      if (typeof fn === "function") fn();
    });
    holoCleanups = [];

    var shell = document.querySelector("[data-work-stickerbook]");
    var grid = document.querySelector('[data-work-category-panel="hytale"] #models-grid');

    if (shell) {
      shell.hidden = true;
      delete shell.dataset.stickerbookReady;
    }
    if (pagesHost) pagesHost.innerHTML = "";

    if (grid) {
      grid.hidden = false;
      grid.removeAttribute("aria-hidden");
    }

    pagesHost = null;
    built = false;
  }

  window.WorkStickerbook = {
    build: build,
    teardown: teardown,
    isBuilt: function () {
      return built;
    },
  };
})();
