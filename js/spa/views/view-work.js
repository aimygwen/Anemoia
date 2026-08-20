/**
 * view-work.js — Work hub: “I create” picker + category panels + preview reveal.
 */
(function () {
  "use strict";

  window.SpaPages = window.SpaPages || {};

  var activeCategory = null;
  var mountToken = 0;
  var pickerBound = false;
  var chooserActive = false;
  var revealToken = 0;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var REVEAL_MS = 920;

  var polRaf = 0;
  var polImpulse = 0;
  var polTargetY = 0;
  var polY = 0;
  var polVY = 0;
  var polX = 0;
  var polVX = 0;
  var polRot = 0;
  var polVRot = 0;
  var polSkew = 0;
  var polStretch = 1;
  var polSquash = 1;
  var polRunning = false;
  var lastPolPaint = 0;
  var activePickerEl = null;

  var loadedCss = Object.create(null);
  var loadedJs = Object.create(null);

  var CATEGORY_LABELS = {
    hytale: "Hytale",
    lowpoly: "Lowpoly",
    stills: "Stills",
    motion: "Motion",
  };

  function loadCss(href) {
    if (loadedCss[href]) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.onload = function () {
        loadedCss[href] = true;
        resolve();
      };
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }

  function loadScript(src) {
    if (loadedJs[src]) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = src;
      script.defer = true;
      script.onload = function () {
        loadedJs[src] = true;
        resolve();
      };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  function workRoot() {
    return document.querySelector('[data-spa-view="work"]');
  }

  function workHub(root) {
    root = root || workRoot();
    if (!root) return null;
    return root.querySelector("[data-work-hub]") || root;
  }

  function normalizeCategory(ctx) {
    if (window.AimySpa && typeof window.AimySpa.normalizeCategory === "function") {
      return window.AimySpa.normalizeCategory(ctx && ctx.query ? ctx.query.category : null);
    }
    return null;
  }

  function syncWorkBackChrome(category) {
    if (!window.AimySpaSubBack) return;
    if (!category) {
      window.AimySpaSubBack.hide();
      return;
    }
    window.AimySpaSubBack.show({
      onClick: function () {
        if (window.AimySpa && typeof window.AimySpa.navigate === "function") {
          window.AimySpa.navigate(window.AimySpa.buildUrl("work", {}));
        }
      },
    });
  }

  function setPhase(root, phase, category) {
    var hub = workHub(root);
    if (!hub) return;
    var choose = (phase || "choose") === "choose";
    hub.setAttribute("data-work-phase", choose ? "choose" : "open");
    document.body.classList.toggle("spa-work-choose", choose);
    syncCategoryScroll(choose ? null : category);
  }

  function syncCategoryScroll(category) {
    var scroll = window.AimySpaViews || {};
    if (category === "lowpoly") {
      if (typeof scroll.lockPageScroll === "function") scroll.lockPageScroll();
      haltScroll();
      return;
    }
    if (category) {
      if (typeof scroll.unlockPageScroll === "function") scroll.unlockPageScroll();
      startScroll();
      return;
    }
    if (typeof scroll.lockPageScroll === "function") scroll.lockPageScroll();
    haltScroll();
  }

  function haltScroll() {
    if (window.AimySpaViews && typeof window.AimySpaViews.haltScroll === "function") {
      window.AimySpaViews.haltScroll();
      return;
    }
    stopScroll();
  }

  function syncPickButtons(root, category) {
    if (!root) return;
    root.querySelectorAll("[data-work-pick]").forEach(function (item) {
      var id = item.getAttribute("data-work-pick");
      item.classList.toggle("is-active", !!category && id === category);
    });
    syncPreview(root, category);
  }

  function syncPreview(root, category) {
    if (!root) return;
    var picker = root.querySelector("[data-work-picker]");
    var items = pickerItems(root);
    var activeId = category;

    if (!activeId && items.length) {
      var current = items.filter(function (item) {
        return item.classList.contains("is-active");
      })[0];
      activeId = current ? current.getAttribute("data-work-pick") : items[0].getAttribute("data-work-pick");
    }

    if (picker) {
      var prevId = picker.getAttribute("data-work-preview");
      picker.setAttribute("data-work-preview", activeId || "hytale");
      if (activeId && activeId !== prevId) {
        nudgePolaroid(12, picker);
      }
    }

    root.querySelectorAll("[data-work-preview-img]").forEach(function (img) {
      var id = img.getAttribute("data-work-preview-img");
      img.classList.toggle("is-active", !!activeId && id === activeId);
    });
  }

  function resetPolaroidMotion(picker) {
    if (!picker) return;
    polImpulse = 0;
    polTargetY = 0;
    polY = 0;
    polVY = 0;
    polX = 0;
    polVX = 0;
    polRot = 0;
    polVRot = 0;
    polSkew = 0;
    polStretch = 1;
    polSquash = 1;
    picker.style.setProperty("--work-pol-y", "0px");
    picker.style.setProperty("--work-pol-x", "0px");
    picker.style.setProperty("--work-pol-rot", "0deg");
    picker.style.setProperty("--work-pol-skew", "0deg");
    picker.style.setProperty("--work-pol-stretch", "1");
    picker.style.setProperty("--work-pol-squash", "1");
  }

  function nudgePolaroid(delta, picker) {
    if (reducedMotion) return;
    picker = picker || activePickerEl;
    if (!picker) return;
    polImpulse += Math.max(-40, Math.min(40, delta));
    startPolaroidLoop(picker);
  }

  function stopPolaroidLoop() {
    polRunning = false;
    activePickerEl = null;
    if (polRaf) {
      cancelAnimationFrame(polRaf);
      polRaf = 0;
    }
  }

  function paintPolaroid(time, picker) {
    if (!picker || reducedMotion) return;
    if (time - lastPolPaint < 16) return;
    lastPolPaint = time;

    var speed = polImpulse;
    polImpulse *= 0.55;

    var stiffness = 0.08;
    var damping = 0.8;
    var force = (polTargetY - polY) * stiffness;
    polVY = (polVY + force) * damping;
    polY += polVY;

    if (polY > 20) polY = 20;
    if (polY < -80) polY = -80;

    var driftTarget = speed * 0.2;
    polVX += (driftTarget - polX) * 0.05;
    polVX *= 0.88;
    polX += polVX;

    var rotTarget = speed * 0.08;
    polVRot += (rotTarget - polRot) * 0.06;
    polVRot *= 0.86;
    polRot += polVRot;

    var stretchTarget = 1 + Math.max(-0.12, Math.min(0.18, -speed * 0.008));
    var squashTarget = 1 + Math.max(-0.1, Math.min(0.08, speed * 0.005));
    var skewTarget = Math.max(-8, Math.min(8, speed * 0.14 + polVX * 0.04));

    polStretch += (stretchTarget - polStretch) * 0.2;
    polSquash += (squashTarget - polSquash) * 0.2;
    polSkew += (skewTarget - polSkew) * 0.18;

    if (Math.abs(speed) < 0.3) {
      polStretch += (1 - polStretch) * 0.08;
      polSquash += (1 - polSquash) * 0.08;
      polSkew += (0 - polSkew) * 0.1;
    }

    picker.style.setProperty("--work-pol-y", polY.toFixed(2) + "px");
    picker.style.setProperty("--work-pol-x", polX.toFixed(2) + "px");
    picker.style.setProperty("--work-pol-rot", polRot.toFixed(2) + "deg");
    picker.style.setProperty("--work-pol-skew", polSkew.toFixed(2) + "deg");
    picker.style.setProperty("--work-pol-stretch", polStretch.toFixed(3));
    picker.style.setProperty("--work-pol-squash", polSquash.toFixed(3));

    var settled =
      Math.abs(polTargetY - polY) < 0.4 &&
      Math.abs(polVY) < 0.2 &&
      Math.abs(polStretch - 1) < 0.01 &&
      Math.abs(polSkew) < 0.05 &&
      Math.abs(speed) < 0.2;

    if (settled) {
      polRunning = false;
      if (polRaf) {
        cancelAnimationFrame(polRaf);
        polRaf = 0;
      }
    }
  }

  function startPolaroidLoop(picker) {
    if (reducedMotion || !picker) return;
    activePickerEl = picker;
    polRunning = true;
    if (polRaf) return;

    function frame(time) {
      if (!polRunning || !activePickerEl) {
        polRaf = 0;
        return;
      }
      paintPolaroid(time, activePickerEl);
      if (polRunning) {
        polRaf = requestAnimationFrame(frame);
      } else {
        polRaf = 0;
      }
    }

    polRaf = requestAnimationFrame(frame);
  }

  function syncPanels(root, category) {
    if (!root) return;
    root.querySelectorAll("[data-work-category-panel]").forEach(function (panel) {
      var id = panel.getAttribute("data-work-category-panel");
      panel.hidden = !category || id !== category;
    });
  }

  function syncDockTitle(root, category) {
    if (!root) return;
    var dockTitle = root.querySelector("[data-work-dock-title]");
    if (dockTitle) {
      dockTitle.textContent = category ? CATEGORY_LABELS[category] || "Work" : "";
    }
  }

  function setBodyModes(category) {
    var isHytale = category === "hytale";
    var isLowpolySoon = category === "lowpoly";
    var isGallery = category === "stills" || category === "motion";
    document.body.classList.toggle("lowpoly-page-body", isHytale);
    document.body.classList.toggle("gallery-page-body", isGallery);
    if (isHytale) {
      document.body.setAttribute("data-work-bare", "1");
    } else {
      document.body.removeAttribute("data-work-bare");
    }
    if (isHytale) {
      document.body.setAttribute("data-work-layout", "hytale-sketchbook");
    } else if (isLowpolySoon) {
      document.body.setAttribute("data-work-layout", "lowpoly-soon");
    } else {
      document.body.removeAttribute("data-work-layout");
      teardownStickerbook();
    }
    if (isLowpolySoon) {
      teardownStickerbook();
    }
    if (isGallery) {
      document.body.setAttribute("data-gal-view", category === "motion" ? "films" : "stills");
    } else {
      document.body.removeAttribute("data-gal-view");
    }
  }

  function ensureStickerbookAssets() {
    return loadCss("./css/work-stickerbook.css?v=sketchbook-7").then(function () {
      return loadScript("./js/work-sticker-holo.js?v=sketchbook-7");
    }).then(function () {
      return loadScript("./js/work-stickerbook.js?v=sketchbook-7");
    });
  }

  function buildStickerbookLayout(panel) {
    panel = panel || document.querySelector('[data-work-category-panel="hytale"]');
    if (!panel || !window.WorkStickerbook || typeof window.WorkStickerbook.build !== "function") {
      return Promise.resolve();
    }
    return window.WorkStickerbook.build(panel);
  }

  function teardownStickerbook() {
    if (window.WorkStickerbook && typeof window.WorkStickerbook.teardown === "function") {
      window.WorkStickerbook.teardown();
    }
  }

  function ensureLowpolyAssets() {
    window.LOWPOLY_ASSET_BASE = "./assets/content/";
    window.LOWPOLY_CATALOG_URL = "./assets/content/lowpoly/catalog.json";
    return loadCss("./css/lowpoly.css?v=lowpoly-rail-43")
      .then(function () {
        return loadCss("./css/lowpoly-aimy.css?v=branding-1");
      })
      .then(function () {
        return loadScript("./js/lowpoly-catalog-data.js?v=lowpoly-rail-43");
      })
      .then(function () {
        return loadScript("./js/lowpoly-catalog.js?v=lowpoly-rail-43");
      })
      .then(function () {
        return loadScript("./js/lowpoly.js?v=lowpoly-rail-44");
      });
  }

  function ensureGalleryAssets() {
    return loadCss("./css/gallery.css?v=gallery-atelier-8").then(function () {
      return loadScript("./js/gallery.js?v=gallery-atelier-8");
    });
  }

  function startScroll() {
    if (!window.Polyglide) return;
    if (window.__lenis && typeof window.Polyglide.start === "function") {
      window.Polyglide.start();
    } else if (typeof window.Polyglide.boot === "function") {
      window.Polyglide.boot();
    }
  }

  function stopScroll() {
    if (window.Polyglide && typeof window.Polyglide.stop === "function") {
      window.Polyglide.stop();
    }
  }

  function teardownCategory(category) {
    if (category === "stills" || category === "motion") {
      if (window.SpaPages.gallery && typeof window.SpaPages.gallery.unmount === "function") {
        window.SpaPages.gallery.unmount();
      }
    }
  }

  function markContentItems(panel) {
    if (!panel) return;
    panel.querySelectorAll(".bento-card, .gal-project").forEach(function (item) {
      if (!item.classList.contains("work-sticker") && !item.classList.contains("hytale-sketchbook__sticker")) {
        item.classList.add("work-content-item");
      }
    });
  }

  function mountCategoryContent(category) {
    var root = workRoot();
    if (!root || !category) return Promise.resolve();

    syncPanels(root, category);
    setBodyModes(category);

    if (category === "hytale") {
      return ensureStickerbookAssets().then(function () {
        forceWorkLibraryLayout(category);
        syncCategoryScroll(category);
        var hytalePanel = root.querySelector('[data-work-category-panel="hytale"]');
        return buildStickerbookLayout(hytalePanel).then(function () {
          markContentItems(hytalePanel);
        });
      });
    }

    if (category === "lowpoly") {
      return Promise.resolve();
    }

    if (category === "stills" || category === "motion") {
      var galView = category === "motion" ? "films" : "stills";
      return ensureGalleryAssets().then(function () {
        if (!window.SpaPages.gallery || typeof window.SpaPages.gallery.mount !== "function") {
          return;
        }
        window.SpaPages.gallery.mount({
          main: '[data-work-gal-main="' + category + '"]',
          dots: '[data-work-gal-dots="' + category + '"]',
          lightbox: "#gal-lightbox",
          view: galView,
          spaMode: true,
        });
        markContentItems(root.querySelector('[data-work-category-panel="' + category + '"]'));
        startScroll();
      });
    }

    return Promise.resolve();
  }

  function resetWorkChrome(root) {
    root = root || workRoot();
    if (!root) return;

    var lb = root.querySelector("#lightbox");
    if (lb) {
      lb.classList.remove("active", "lb-leaving", "lb-from-card", "lb-settled");
      lb.setAttribute("aria-hidden", "true");
      lb.hidden = true;
      lb.className = "lightbox";
      lb.style.removeProperty("--lb-from-x");
      lb.style.removeProperty("--lb-from-y");
      lb.style.removeProperty("--lb-from-scale");
      var lbImg = lb.querySelector("#lightbox-main-img");
      if (lbImg) lbImg.removeAttribute("src");
    }

    var galLb = root.querySelector("#gal-lightbox");
    if (galLb) galLb.hidden = true;

    document.body.classList.remove("lightbox-open");
    document.body.style.overflow = "";
  }

  function stripWorkMediaChrome(el) {
    if (!el) return;
    el.style.setProperty("border", "none", "important");
    el.style.setProperty("background", "none", "important");
    el.style.setProperty("box-shadow", "none", "important");
    el.style.setProperty("backdrop-filter", "none", "important");
    el.style.setProperty("-webkit-backdrop-filter", "none", "important");
    el.style.setProperty("outline", "none", "important");
    el.style.setProperty("border-radius", "0", "important");
  }

  function flattenWorkMedia(card) {
    if (!card || card.dataset.workFlattened === "1" || card.classList.contains("work-sticker")) return;
    var media = card.querySelector(".card-media");
    var img = card.querySelector(".card-preview-img");
    if (!img) return;
    card.dataset.workFlattened = "1";
    if (media) media.style.setProperty("display", "none", "important");
    if (img.parentElement !== card) {
      card.insertBefore(img, media || null);
    }
    stripWorkMediaChrome(card);
    stripWorkMediaChrome(img);
  }

  function forceWorkLibraryLayout(category) {
    document.body.setAttribute("data-lp-library-view", "grid");
    document.body.setAttribute("data-work-bare", "1");
    if (category === "hytale") {
      document.body.setAttribute("data-work-layout", "hytale-sketchbook");
    } else if (category) {
      document.body.removeAttribute("data-work-layout");
    }
    document.querySelectorAll(".lp-models-rail-spacer, .bento-card[data-gallery-clone]").forEach(function (node) {
      node.remove();
    });
    document.querySelectorAll(".lp-models-rail .bento-card, #models-grid .bento-card, #works-grid .bento-card").forEach(function (card) {
      card.style.removeProperty("--gallery-w");
      card.style.removeProperty("--gallery-h");
      card.style.removeProperty("--gallery-focus");
      card.style.removeProperty("z-index");
      card.classList.remove("is-center");
      stripWorkMediaChrome(card);
      flattenWorkMedia(card);
    });
    document.querySelectorAll(".gal-project .gal-card, .gal-project .gal-media, .gal-project img, .gal-project video").forEach(stripWorkMediaChrome);
  }

  function pickerItems(root) {
    if (!root) return [];
    return Array.prototype.slice.call(root.querySelectorAll(".work-picker__item"));
  }

  function isPickerItem(el) {
    return !!(el && el.closest && el.closest(".work-picker__item"));
  }

  function clearPickerFocus(root) {
    var scroller = root && root.querySelector("[data-work-scroller]");
    if (scroller) scroller.classList.remove("has-focus");
    pickerItems(root).forEach(function (item) {
      item.classList.remove("is-active");
    });
    syncPreview(root, null);
  }

  function scrollTopForItem(scroller, item) {
    if (!scroller || !item) return 0;
    var rail = item.parentElement;
    var itemTop = item.offsetTop;
    if (rail && rail !== scroller) itemTop += rail.offsetTop;
    var target = itemTop + item.offsetHeight / 2 - scroller.clientHeight / 2;
    var maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    return Math.max(0, Math.min(maxScroll, target));
  }

  function scrollItemToCenter(scroller, item) {
    if (!scroller || !item) return;
    scroller.scrollTop = scrollTopForItem(scroller, item);
  }

  function focusPickerItem(root, item, options) {
    options = options || {};
    var scroller = root.querySelector("[data-work-scroller]");
    var items = pickerItems(root);
    if (!scroller || !item) return;

    scroller.classList.add("has-focus");
    items.forEach(function (el) {
      el.classList.toggle("is-active", el === item);
    });

    var id = item.getAttribute("data-work-pick");
    syncPreview(root, id);

    if (options.scroll !== false) {
      scrollItemToCenter(scroller, item);
    }
  }

  function nearestPickerItem(scroller) {
    var root = scroller.closest("[data-work-hub]") || workRoot();
    var items = pickerItems(root);
    if (!items.length) return null;

    var scrollerRect = scroller.getBoundingClientRect();
    var viewportCenter = scrollerRect.top + scrollerRect.height / 2;
    var closest = items[0];
    var closestDist = Infinity;

    items.forEach(function (item) {
      var itemRect = item.getBoundingClientRect();
      var itemCenter = itemRect.top + itemRect.height / 2;
      var dist = Math.abs(itemCenter - viewportCenter);
      if (dist < closestDist) {
        closestDist = dist;
        closest = item;
      }
    });

    return closest;
  }

  var PICKER_GLIDE_DURATION = 0.52;
  var PICKER_WHEEL_MULT = 0.82;

  function createPickerGlide(scroller, hooks) {
    hooks = hooks || {};
    var state = {
      target: scroller.scrollTop,
      current: scroller.scrollTop,
      raf: null,
      last: 0,
    };

    function maxScroll() {
      return Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    }

    function clamp(value) {
      return Math.max(0, Math.min(maxScroll(), value));
    }

    function sync(value) {
      var next = clamp(value != null ? value : scroller.scrollTop);
      state.target = next;
      state.current = next;
    }

    function stopRaf() {
      if (!state.raf) return;
      cancelAnimationFrame(state.raf);
      state.raf = null;
      state.last = 0;
    }

    function frame(time) {
      if (!state.last) state.last = time;
      var dt = Math.min(0.064, (time - state.last) / 1000);
      state.last = time;
      var lerp = 1 - Math.exp(-dt / PICKER_GLIDE_DURATION);
      var prev = state.current;
      state.current += (state.target - state.current) * lerp;
      if (Math.abs(state.target - state.current) < 0.35) {
        state.current = state.target;
      }
      scroller.scrollTop = state.current;
      if (hooks.onTick) hooks.onTick(state.current - prev);
      if (Math.abs(state.target - state.current) > 0.35) {
        state.raf = requestAnimationFrame(frame);
      } else {
        stopRaf();
        if (hooks.onSettle) hooks.onSettle();
      }
    }

    function start() {
      if (state.raf) return;
      state.last = 0;
      state.raf = requestAnimationFrame(frame);
    }

    function push(delta) {
      state.target = clamp(state.target + delta);
      start();
    }

    function goTo(value) {
      state.target = clamp(value);
      start();
    }

    return { push: push, goTo: goTo, sync: sync, stop: stopRaf, clamp: clamp };
  }

  function pickerGlide(scroller, hooks) {
    if (!scroller.__pickerGlide) {
      scroller.__pickerGlide = createPickerGlide(scroller, hooks);
    }
    return scroller.__pickerGlide;
  }

  function wheelScrollDelta(event, scroller) {
    var delta = event.deltaY;
    if (event.deltaMode === 1) delta *= 18;
    else if (event.deltaMode === 2) delta *= scroller.clientHeight;
    return delta * PICKER_WHEEL_MULT;
  }

  function bindPicker(root) {
    if (!root || pickerBound) return;
    pickerBound = true;

    var scroller = root.querySelector("[data-work-scroller]");
    if (!scroller) return;

    var picker = root.querySelector("[data-work-picker]");
    resetPolaroidMotion(picker);

    var dragging = false;
    var dragStartY = 0;
    var dragStartScroll = 0;
    var dragDistance = 0;
    var lastMoveY = 0;
    var activePointer = null;
    var scrollSyncRaf = null;
    var snapTimer = null;

    function syncFocusedItem() {
      var item = nearestPickerItem(scroller);
      if (!item) return;
      focusPickerItem(root, item, { scroll: false });
    }

    function snapToNearest() {
      var item = nearestPickerItem(scroller);
      if (!item) return;
      focusPickerItem(root, item, { scroll: false });
      glide.goTo(scrollTopForItem(scroller, item));
    }

    function scheduleSnap() {
      if (snapTimer) clearTimeout(snapTimer);
      snapTimer = setTimeout(function () {
        snapTimer = null;
        snapToNearest();
      }, 140);
    }

    function scheduleScrollSync() {
      if (scrollSyncRaf) return;
      scrollSyncRaf = requestAnimationFrame(function () {
        scrollSyncRaf = null;
        syncFocusedItem();
      });
    }

    var glide = pickerGlide(scroller, {
      onTick: function (delta) {
        nudgePolaroid(delta * 0.35, picker);
        scheduleScrollSync();
      },
      onSettle: function () {
        syncFocusedItem();
      },
    });

    scroller.addEventListener(
      "wheel",
      function (event) {
        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
        if (scroller.scrollHeight <= scroller.clientHeight + 2) return;
        event.preventDefault();
        var delta = wheelScrollDelta(event, scroller);
        glide.push(delta);
        nudgePolaroid(delta * 0.12, picker);
        scheduleScrollSync();
        scheduleSnap();
      },
      { passive: false }
    );

    scroller.addEventListener("scroll", scheduleScrollSync, { passive: true });

    scroller.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      glide.stop();
      glide.sync(scroller.scrollTop);
      activePointer = event.pointerId;
      dragging = false;
      dragDistance = 0;
      dragStartY = event.clientY;
      lastMoveY = event.clientY;
      dragStartScroll = scroller.scrollTop;
    });

    scroller.addEventListener("pointermove", function (event) {
      if (event.pointerId !== activePointer) return;
      var dy = event.clientY - dragStartY;
      if (!dragging) {
        if (Math.abs(dy) < 8) return;
        dragging = true;
        scroller.classList.add("is-dragging");
        try {
          scroller.setPointerCapture(event.pointerId);
        } catch (e) {}
      }
      dragDistance = Math.max(dragDistance, Math.abs(dy));
      var step = event.clientY - lastMoveY;
      lastMoveY = event.clientY;
      scroller.scrollTop = dragStartScroll - dy;
      glide.sync(scroller.scrollTop);
      nudgePolaroid(-step * 0.18, picker);
      scheduleScrollSync();
    });

    function endDrag(event) {
      if (event.pointerId !== activePointer) return;
      activePointer = null;
      dragging = false;
      scroller.setAttribute("data-drag-px", String(dragDistance));
      scroller.classList.remove("is-dragging");
      glide.sync(scroller.scrollTop);
      try {
        scroller.releasePointerCapture(event.pointerId);
      } catch (e) {}
      scheduleScrollSync();
      snapToNearest();
    }

    scroller.addEventListener("pointerup", endDrag);
    scroller.addEventListener("pointercancel", endDrag);

    pickerItems(root).forEach(function (item) {
      item.addEventListener("pointerenter", function () {
        focusPickerItem(root, item);
      });

      item.addEventListener("pointerleave", function (event) {
        if (isPickerItem(event.relatedTarget)) return;
        scroller.classList.remove("has-focus");
      });

      item.addEventListener("focusin", function () {
        focusPickerItem(root, item);
      });
    });

    var first = pickerItems(root)[0];
    if (first) {
      focusPickerItem(root, first, { scroll: false });
    }
  }

  function setDockVisible(root, visible) {
    var dock = root && root.querySelector("[data-work-dock]");
    if (!dock) return;
    dock.hidden = !visible;
    dock.setAttribute("aria-hidden", visible ? "false" : "true");
    dock.classList.toggle("is-visible", !!visible);
  }

  function resetDeck(root) {
    var deck = root && root.querySelector("[data-work-deck]");
    if (!deck) return;
    deck.style.display = "";
    deck.style.visibility = "";
    deck.style.opacity = "";
    deck.style.pointerEvents = "";
    var scroller = root.querySelector("[data-work-scroller]");
    if (scroller) {
      scroller.classList.remove("has-focus", "is-dragging");
      scroller.removeAttribute("data-drag-px");
    }
  }

  function showChooser(root) {
    if (!root) return Promise.resolve();

    revealToken++;
    var canvas = root.querySelector("[data-work-canvas]");
    var deck = root.querySelector("[data-work-deck]");

    syncPickButtons(root, null);
    syncPanels(root, null);
    syncDockTitle(root, null);
    syncWorkBackChrome(null);
    setBodyModes(null);
    setDockVisible(root, false);
    clearPickerFocus(root);
    haltScroll();
    clearCanvasReveal(canvas);
    clearPreviewRevealPin(root);

    if (canvas) canvas.hidden = true;
    if (deck) resetDeck(root);
    var picker = root.querySelector("[data-work-picker]");
    if (picker) picker.classList.remove("is-revealing");
    resetPolaroidMotion(picker);
    setPhase(root, "choose");
    chooserActive = true;

    var first = pickerItems(root)[0];
    if (first) focusPickerItem(root, first, { scroll: false });

    return Promise.resolve();
  }

  function setRevealPhase(root, revealing) {
    var hub = workHub(root);
    if (!hub) return;
    if (revealing) {
      hub.setAttribute("data-work-phase", "revealing");
      document.body.classList.add("spa-work-revealing");
      document.body.classList.remove("spa-work-choose");
    } else {
      document.body.classList.remove("spa-work-revealing");
    }
  }

  function clearPreviewRevealPin(root) {
    if (!root) return;
    var photo = root.querySelector("[data-work-preview-photo]");
    if (!photo) return;
    photo.style.removeProperty("position");
    photo.style.removeProperty("left");
    photo.style.removeProperty("top");
    photo.style.removeProperty("width");
    photo.style.removeProperty("height");
    photo.style.removeProperty("z-index");
    photo.style.removeProperty("transform");
    photo.style.removeProperty("transform-origin");
    photo.style.removeProperty("will-change");
  }

  function pinPreviewForReveal(root, rect) {
    var photo = root && root.querySelector("[data-work-preview-photo]");
    if (!photo || !rect) return;
    photo.style.position = "fixed";
    photo.style.left = rect.left + "px";
    photo.style.top = rect.top + "px";
    photo.style.width = rect.width + "px";
    photo.style.height = rect.height + "px";
    photo.style.zIndex = "12";
    photo.style.transform = "rotate(-3deg)";
    photo.style.transformOrigin = "50% 55%";
    photo.style.willChange = "opacity";
  }

  function clearCanvasReveal(canvas) {
    if (!canvas) return;
    canvas.classList.remove("is-revealing");
    canvas.style.removeProperty("--work-reveal-top");
    canvas.style.removeProperty("--work-reveal-right");
    canvas.style.removeProperty("--work-reveal-bottom");
    canvas.style.removeProperty("--work-reveal-left");
    canvas.style.removeProperty("clip-path");
    canvas.style.removeProperty("transition");
  }

  function previewPhotoRect(root) {
    var photo = root && root.querySelector("[data-work-preview-photo]");
    if (!photo) return null;
    var rect = photo.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return null;
    return rect;
  }

  function playCategoryReveal(root, category) {
    var token = ++revealToken;
    var picker = root.querySelector("[data-work-picker]");
    var canvas = root.querySelector("[data-work-canvas]");
    var deck = root.querySelector("[data-work-deck]");

    syncPanels(root, category);
    setBodyModes(category);
    setRevealPhase(root, true);
    haltScroll();
    setDockVisible(root, false);

    return mountCategoryContent(category).then(function () {
      if (token !== revealToken || !canvas) {
        clearCanvasReveal(canvas);
        clearPreviewRevealPin(root);
        if (picker) picker.classList.remove("is-revealing");
        setRevealPhase(root, false);
        if (deck) deck.style.display = "none";
        if (canvas) canvas.hidden = false;
        setPhase(root, "open", category);
        setDockVisible(root, true);
        return;
      }

      var rect = previewPhotoRect(root);
      if (!rect) {
        clearCanvasReveal(canvas);
        clearPreviewRevealPin(root);
        if (picker) picker.classList.remove("is-revealing");
        setRevealPhase(root, false);
        if (deck) deck.style.display = "none";
        canvas.hidden = false;
        setPhase(root, "open", category);
        setDockVisible(root, true);
        startScroll();
        return;
      }

      var vw = window.innerWidth || document.documentElement.clientWidth;
      var vh = window.innerHeight || document.documentElement.clientHeight;

      canvas.hidden = false;
      canvas.classList.add("is-revealing");
      canvas.style.setProperty("--work-reveal-top", rect.top + "px");
      canvas.style.setProperty("--work-reveal-right", Math.max(0, vw - rect.right) + "px");
      canvas.style.setProperty("--work-reveal-bottom", Math.max(0, vh - rect.bottom) + "px");
      canvas.style.setProperty("--work-reveal-left", rect.left + "px");

      if (picker) {
        picker.classList.add("is-revealing");
        resetPolaroidMotion(picker);
      }
      pinPreviewForReveal(root, rect);

      return new Promise(function (resolve) {
        var finished = false;

        function finish() {
          if (finished || token !== revealToken) return;
          finished = true;
          clearCanvasReveal(canvas);
          clearPreviewRevealPin(root);
          if (picker) picker.classList.remove("is-revealing");
          setRevealPhase(root, false);
          if (deck) deck.style.display = "none";
          setPhase(root, "open", category);
          setDockVisible(root, true);
          startScroll();
          resolve();
        }

        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            if (token !== revealToken) return;
            canvas.style.setProperty("--work-reveal-top", "0px");
            canvas.style.setProperty("--work-reveal-right", "0px");
            canvas.style.setProperty("--work-reveal-bottom", "0px");
            canvas.style.setProperty("--work-reveal-left", "0px");
          });
        });

        function onTransitionEnd(event) {
          if (event.target !== canvas) return;
          if (event.propertyName !== "clip-path" && event.propertyName !== "-webkit-clip-path") return;
          canvas.removeEventListener("transitionend", onTransitionEnd);
          finish();
        }

        canvas.addEventListener("transitionend", onTransitionEnd);
        window.setTimeout(finish, REVEAL_MS + 120);
      });
    });
  }

  function openCategoryInstant(root, category) {
    var canvas = root.querySelector("[data-work-canvas]");
    var deck = root.querySelector("[data-work-deck]");

    syncPanels(root, category);
    setBodyModes(category);
    syncPickButtons(root, category);
    syncDockTitle(root, category);
    syncWorkBackChrome(category);
    setDockVisible(root, true);

    if (deck) deck.style.display = "none";
    if (canvas) canvas.hidden = false;
    setPhase(root, "open", category);

    return mountCategoryContent(category);
  }

  function openCategory(root, category, options) {
    if (!root || !category) return Promise.resolve();

    options = options || {};
    syncPickButtons(root, category);
    syncDockTitle(root, category);
    syncWorkBackChrome(category);

    if (options.animate && !reducedMotion) {
      return playCategoryReveal(root, category);
    }

    return openCategoryInstant(root, category);
  }

  function bindHub(root) {
    if (!root || root.__workHubBound) return;
    root.__workHubBound = true;
    bindPicker(root);

    root.addEventListener(
      "wheel",
      function (event) {
        var hub = workHub(root);
        if (!hub) return;
        if (hub.getAttribute("data-work-phase") === "choose") {
          if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
          var scroller = root.querySelector("[data-work-scroller]");
          if (scroller && scroller.contains(event.target)) return;
          event.preventDefault();
        }
      },
      { passive: false, capture: true }
    );

    root.addEventListener("click", function (e) {
      var pickLink = e.target.closest("[data-work-pick]");
      if (!pickLink) return;
      e.preventDefault();
      e.stopPropagation();
      var scroller = root.querySelector("[data-work-scroller]");
      if (scroller && Number(scroller.getAttribute("data-drag-px") || 0) >= 12) return;
      var next = pickLink.getAttribute("data-work-pick");
      if (window.AimySpa && typeof window.AimySpa.navigate === "function") {
        window.AimySpa.navigate(
          window.AimySpa.buildUrl("work", next ? { category: next } : {})
        );
      }
    });
  }

  window.SpaPages.work = {
    mount: function (ctx) {
      var root = workRoot();
      var category = normalizeCategory(ctx);
      var token = ++mountToken;

      resetWorkChrome(root);
      bindHub(root);

      if (activeCategory && activeCategory !== category) {
        teardownCategory(activeCategory);
        if (activeCategory === "hytale") {
          teardownStickerbook();
        }
      }

      var flow;
      var animateOpen = !!chooserActive && !!category && !reducedMotion && finePointer;
      chooserActive = !category;

      if (!category) {
        flow = showChooser(root);
      } else {
        flow = openCategory(root, category, { animate: animateOpen });
      }

      return flow.then(function () {
        if (token !== mountToken) return;
        activeCategory = category;
        if (category) {
          syncCategoryScroll(category);
        } else {
          haltScroll();
        }
        document.title = category
          ? (CATEGORY_LABELS[category] || "Work") + " — Aimy Gwen"
          : "Work — Aimy Gwen";
      });
    },
    unmount: function () {
      mountToken++;
      revealToken++;
      chooserActive = false;
      var root = workRoot();
      resetWorkChrome(root);
      if (root) {
        setDockVisible(root, false);
        resetDeck(root);
        clearPickerFocus(root);
        clearCanvasReveal(root && root.querySelector("[data-work-canvas]"));
        clearPreviewRevealPin(root);
        var picker = root.querySelector("[data-work-picker]");
        if (picker) picker.classList.remove("is-revealing");
        document.body.classList.remove("spa-work-revealing");
        var hub = workHub(root);
        if (hub) hub.setAttribute("data-work-phase", "choose");
        var canvas = root.querySelector("[data-work-canvas]");
        if (canvas) canvas.hidden = true;
        root.querySelectorAll("[data-work-category-panel]").forEach(function (panel) {
          panel.hidden = true;
        });
      }
      if (activeCategory) {
        teardownCategory(activeCategory);
      }
      if (workRoot() && workRoot().__lowpolyReady && window.SpaPages.lowpoly) {
        window.SpaPages.lowpoly.destroy();
        workRoot().__lowpolyReady = false;
      }
      document.body.classList.remove("lowpoly-page-body", "gallery-page-body");
      document.body.removeAttribute("data-gal-view");
      document.body.removeAttribute("data-work-bare");
      activeCategory = null;
      haltScroll();
      stopPolaroidLoop();
      teardownStickerbook();
      document.body.classList.remove("spa-work-choose");
      document.body.removeAttribute("data-work-layout");
      if (window.AimySpaSubBack) window.AimySpaSubBack.hide();
    },
  };
})();
