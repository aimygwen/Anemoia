/**
 * work-stickerbook.js — Hytale Work sticker book from assets/content/lowpoly/hytale/pages/.
 */
(function () {
  "use strict";

  var PAGES_INDEX_URL = "./assets/content/lowpoly/hytale/pages/index.json?v=hytale-pages-7";
  var PAGES_BASE = "./assets/content/lowpoly/hytale/pages/";
  var CONTENT_BASE = "./assets/content/";

  var holoCleanups = [];
  var variantCycleCleanups = [];
  var built = false;
  var currentPage = 0;
  var pageCount = 0;
  var pagesHost = null;
  var countEl = null;
  var nextBtn = null;
  var onNextClick = null;
  var pageData = [];
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var resizeTimer = 0;
  var onResize = null;

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

  function collectVariantFrames(sticker, pageFolder) {
    var baseLabel = sticker.label || sticker.title || sticker.name || "Sticker";
    var frames = [];

    if (Array.isArray(sticker.variants) && sticker.variants.length) {
      sticker.variants.forEach(function (variant) {
        if (!variant || !variant.image) return;
        var suffix =
          variant.label && variant.label !== "Default" ? ", " + variant.label : "";
        frames.push({
          image: resolveStickerImage(pageFolder, variant.image),
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
            image: resolveStickerImage(pageFolder, variant.image),
            label: baseLabel + suffix,
          });
        });
      }
    }

    if (frames.length) return frames;

    if (sticker.image) {
      return [
        {
          image: resolveStickerImage(pageFolder, sticker.image),
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

  function startVariantCycle(card, img, sticker, pageFolder) {
    if (reduced) return null;
    var frames = collectVariantFrames(sticker, pageFolder);
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
      var page = card.closest(".work-stickerbook__page");
      if (!page || !page.classList.contains("is-active") || page.hidden) return;
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

  function syncPageVariantCycles(page) {
    stopAllVariantCycles();
    if (!page || reduced) return;
    page.querySelectorAll(".work-sticker").forEach(function (card) {
      var sticker = card.__stickerConfig;
      var pageFolder = card.__pageFolder;
      var img = card.querySelector(".work-sticker__img, .card-preview-img");
      if (!sticker || !img) return;
      var cleanup = startVariantCycle(card, img, sticker, pageFolder);
      if (cleanup) variantCycleCleanups.push(cleanup);
    });
  }

  function fetchJson(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("Failed to load " + url);
      return res.json();
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
    try {
      return new URL(raw, window.location.href).href;
    } catch (err) {
      return raw;
    }
  }

  function resolveStickerImage(pageFolder, imagePath) {
    if (!imagePath) return "";
    var clean = String(imagePath).trim();
    if (/^(https?:|data:|\/\/)/.test(clean)) return clean;

    if (clean.indexOf("./") === 0 || clean.indexOf("../") === 0) {
      return resolveImageSrc(PAGES_BASE + pageFolder + "/" + clean.replace(/^\.\//, ""));
    }

    if (clean.indexOf("lowpoly/") === 0 || clean.indexOf("content/") === 0) {
      var rel = clean.indexOf("content/") === 0 ? clean.slice("content/".length) : clean;
      return resolveImageSrc(CONTENT_BASE + rel);
    }

    return resolveImageSrc(PAGES_BASE + pageFolder + "/" + clean);
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

  function applyStickerStyle(card, sticker, pageIndex, indexInPage) {
    var id = card.dataset.itemId || String(indexInPage);
    var seed = hashSeed(id + ":p" + pageIndex);
    var rot = -10 + seededRandom(seed + 23) * 20;
    var scale = 0.94 + seededRandom(seed + 37) * 0.08;
    var sizeMult = 1;

    if (sticker && sticker.size === "hero") {
      rot = -5 + seededRandom(seed + 23) * 10;
      scale = 1;
      sizeMult = heroSizeMultiplier();
    } else if (sticker && sticker.size === "large") {
      scale = 1;
      sizeMult = 1.28;
    }

    if (sticker && typeof sticker.scale === "number" && sticker.scale > 0) {
      sizeMult = sticker.scale;
    }

    card.style.setProperty("--sticker-rot", rot.toFixed(2) + "deg");
    card.style.setProperty("--sticker-scale", scale.toFixed(3));
    card.style.setProperty("--sticker-size", sizeMult.toFixed(3));
    applyStickerSize(card, sticker);
  }

  function layoutSticker(card, pageIndex, indexInPage, totalOnPage, sticker) {
    var spec = gridSpec(totalOnPage);
    var cols = spec.cols;
    var col = indexInPage % cols;
    var row = Math.floor(indexInPage / cols);
    var totalRows = Math.ceil(totalOnPage / cols);
    var itemsThisRow = Math.max(1, Math.min(cols, totalOnPage - row * cols));
    var isLastRow = row === totalRows - 1;
    var rowOffset = isLastRow ? (cols - itemsThisRow) * 0.5 : 0;

    card.style.gridColumn = String(Math.round(rowOffset + col) + 1);
    card.style.gridRow = String(row + 1);
    applyStickerStyle(card, sticker, pageIndex, indexInPage);
  }

  function relayoutPage(pageEl, stickers, pageIndex) {
    if (!pageEl || !stickers || !stickers.length) return;
    var spec = gridSpec(stickers.length);
    pageEl.style.setProperty("--sticker-cols", String(spec.cols));
    pageEl.style.setProperty("--sticker-rows", String(spec.rows));
    var cards = pageEl.querySelectorAll(".work-sticker");
    stickers.forEach(function (sticker, index) {
      var card = cards[index];
      if (card) layoutSticker(card, pageIndex, index, stickers.length, sticker);
    });
  }

  function relayoutAllPages() {
    if (!pagesHost || !pageData.length) return;
    pageData.forEach(function (entry, pageIndex) {
      var page = pagesHost.querySelector('[data-stickerbook-page="' + pageIndex + '"]');
      if (!page) return;
      relayoutPage(page, entry.config.stickers || [], pageIndex);
    });
  }

  function bindResize() {
    if (onResize) return;
    onResize = function () {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        resizeTimer = 0;
        relayoutAllPages();
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

  function createStickerCard(sticker, pageFolder, pageIndex, indexInPage, totalOnPage) {
    var label = sticker.label || sticker.title || sticker.name || "Sticker";
    var stickerId = sticker.id || sticker.catalogId || label;
    var frames = collectVariantFrames(sticker, pageFolder);
    var imageRaw = frames.length ? frames[0].image : resolveStickerImage(pageFolder, sticker.image);
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
    card.__pageFolder = pageFolder;

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

    layoutSticker(card, pageIndex, indexInPage, totalOnPage, sticker);
    bindStickerHolo(card);
    bindStickerClick(card, sticker);
    ensureStickerImage(img, card, imageRaw);

    return card;
  }

  function appendIntro(pageEl, config) {
    if (!config.topic && !config.title && !config.lede && !config.body) return;

    var intro = document.createElement("header");
    intro.className = "work-stickerbook__intro";

    if (config.topic) {
      var topic = document.createElement("p");
      topic.className = "work-stickerbook__topic";
      topic.textContent = config.topic;
      intro.appendChild(topic);
    }

    if (config.title) {
      var title = document.createElement("h2");
      title.className = "work-stickerbook__title";
      title.textContent = config.title;
      intro.appendChild(title);
    }

    if (config.lede) {
      var lede = document.createElement("p");
      lede.className = "work-stickerbook__lede";
      lede.textContent = config.lede;
      intro.appendChild(lede);
    }

    if (config.body) {
      var body = document.createElement("p");
      body.className = "work-stickerbook__body";
      body.textContent = config.body;
      intro.appendChild(body);
    }

    pageEl.appendChild(intro);
  }

  function buildPageElement(entry, pageIndex) {
    var config = entry.config;
    var stickers = Array.isArray(config.stickers) ? config.stickers : [];
    if (!stickers.length) return null;

    var spec = gridSpec(stickers.length);
    var page = document.createElement("article");
    page.className = "work-stickerbook__page";
    page.setAttribute("data-stickerbook-page", String(pageIndex));
    page.setAttribute("data-stickerbook-folder", entry.id);
    page.style.setProperty("--sticker-cols", String(spec.cols));
    page.style.setProperty("--sticker-rows", String(spec.rows));
    page.hidden = pageIndex !== 0;
    page.setAttribute("aria-hidden", pageIndex === 0 ? "false" : "true");
    if (pageIndex === 0) page.classList.add("is-active");

    appendIntro(page, config);

    var grid = document.createElement("div");
    grid.className = "work-stickerbook__grid";
    page.appendChild(grid);

    stickers.forEach(function (sticker, index) {
      grid.appendChild(createStickerCard(sticker, entry.id, pageIndex, index, stickers.length));
    });

    return page;
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

  function updateCountLabel() {
    if (!countEl) return;
    countEl.textContent = pageCount ? currentPage + 1 + " / " + pageCount : "";
  }

  function hydratePageImages(page) {
    if (!page) return;
    page.querySelectorAll(".work-sticker").forEach(function (card) {
      ensureStickerImage(
        card.querySelector(".work-sticker__img, .card-preview-img"),
        card
      );
    });
  }

  function showPage(index, animate) {
    if (!pagesHost || !pageCount) return;
    var nextIndex = ((index % pageCount) + pageCount) % pageCount;
    var pages = pagesHost.querySelectorAll(".work-stickerbook__page");

    pages.forEach(function (page, i) {
      var active = i === nextIndex;
      page.hidden = !active;
      page.classList.toggle("is-active", active);
      page.setAttribute("aria-hidden", active ? "false" : "true");
    });

    if (animate && !reduced && typeof gsap !== "undefined") {
      var activePage = pages[nextIndex];
      if (activePage) {
        gsap.fromTo(
          activePage,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.42, ease: "power2.out" }
        );
      }
    }

    currentPage = nextIndex;
    updateCountLabel();
    hydratePageImages(pages[nextIndex]);
    syncPageVariantCycles(pages[nextIndex]);

    if (window.Polyglide && typeof window.Polyglide.to === "function") {
      window.Polyglide.to(pagesHost, { offset: 0 });
    }
  }

  function nextPage() {
    showPage(currentPage + 1, true);
  }

  function getShell(panel) {
    panel = panel || document.querySelector('[data-work-category-panel="hytale"]');
    if (!panel) return null;
    return panel.querySelector("[data-work-stickerbook]");
  }

  function loadPageManifest() {
    return fetchJson(PAGES_INDEX_URL).then(function (index) {
      var ids = Array.isArray(index.pages) ? index.pages : [];
      return Promise.all(
        ids.map(function (id) {
          return fetchJson(PAGES_BASE + id + "/page.json?v=hytale-pages-7").then(function (config) {
            return { id: id, config: config };
          });
        })
      );
    });
  }

  function renderPages(entries) {
    pageData = entries.filter(function (entry) {
      return Array.isArray(entry.config.stickers) && entry.config.stickers.length;
    });

    pagesHost.innerHTML = "";
    pageCount = pageData.length;
    currentPage = 0;

    pageData.forEach(function (entry, index) {
      var page = buildPageElement(entry, index);
      if (page) pagesHost.appendChild(page);
    });

    pageCount = pagesHost.querySelectorAll(".work-stickerbook__page").length;
    updateCountLabel();
    var activePage = pagesHost.querySelector(".work-stickerbook__page.is-active");
    hydratePageImages(activePage);
    syncPageVariantCycles(activePage);
  }

  function build(panel) {
    panel = panel || document.querySelector('[data-work-category-panel="hytale"]');
    if (!panel) return Promise.resolve();

    var shell = getShell(panel);
    var grid = panel.querySelector("#models-grid");
    if (!shell) return Promise.resolve();

    if (shell.dataset.stickerbookReady === "1" && shell.querySelector(".work-stickerbook__page")) {
      pagesHost = shell.querySelector("[data-stickerbook-pages]");
      relayoutAllPages();
      var cachedActive = shell.querySelector(".work-stickerbook__page.is-active");
      hydratePageImages(cachedActive);
      syncPageVariantCycles(cachedActive);
      return Promise.resolve();
    }

    teardown();

    pagesHost = shell.querySelector("[data-stickerbook-pages]");
    countEl = shell.querySelector("[data-stickerbook-count]");
    nextBtn = shell.querySelector("[data-stickerbook-next]");
    if (!pagesHost) return Promise.resolve();

    return loadPageManifest()
      .then(function (entries) {
        renderPages(entries);

        shell.hidden = false;
        if (grid) {
          grid.hidden = true;
          grid.setAttribute("aria-hidden", "true");
        }

        if (nextBtn) {
          onNextClick = function () {
            nextPage();
          };
          nextBtn.addEventListener("click", onNextClick);
        }

        built = pageCount > 0;
        shell.dataset.stickerbookReady = built ? "1" : "0";
        if (built) bindResize();
      })
      .catch(function (err) {
        console.error("[WorkStickerbook] Failed to load pages:", err);
        built = false;
        delete shell.dataset.stickerbookReady;
      });
  }

  function teardown() {
    unbindResize();
    stopAllVariantCycles();
    holoCleanups.forEach(function (fn) {
      if (typeof fn === "function") fn();
    });
    holoCleanups = [];

    if (nextBtn && onNextClick) {
      nextBtn.removeEventListener("click", onNextClick);
    }
    onNextClick = null;
    nextBtn = null;
    countEl = null;

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
    currentPage = 0;
    pageCount = 0;
    pageData = [];
  }

  function getActivePage() {
    if (!pagesHost) return null;
    return pagesHost.querySelector(".work-stickerbook__page.is-active");
  }

  window.WorkStickerbook = {
    build: build,
    teardown: teardown,
    getActivePage: getActivePage,
    isBuilt: function () {
      return built;
    },
  };
})();
