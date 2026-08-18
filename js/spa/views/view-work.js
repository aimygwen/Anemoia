/**
 * view-work.js — Work hub: deck chooser + category panels (no reveal/transition motion).
 */
(function () {
  "use strict";

  window.SpaPages = window.SpaPages || {};

  var activeCategory = null;
  var mountToken = 0;
  var deckBound = false;

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
    var isLowpoly = category === "hytale" || category === "lowpoly";
    var isGallery = category === "stills" || category === "motion";
    document.body.classList.toggle("lowpoly-page-body", isLowpoly);
    document.body.classList.toggle("gallery-page-body", isGallery);
    if (category) {
      document.body.setAttribute("data-work-bare", "1");
    } else {
      document.body.removeAttribute("data-work-bare");
    }
    if (category === "hytale") {
      document.body.setAttribute("data-work-layout", "hytale-stickerbook");
    } else {
      document.body.removeAttribute("data-work-layout");
      teardownStickerbook();
    }
    if (isGallery) {
      document.body.setAttribute("data-gal-view", category === "motion" ? "films" : "stills");
    } else {
      document.body.removeAttribute("data-gal-view");
    }
  }

  function ensureStickerbookAssets() {
    return loadCss("./css/work-stickerbook.css?v=stickerbook-17").then(function () {
      return loadScript("./js/work-sticker-holo.js?v=stickerbook-17");
    }).then(function () {
      return loadScript("./js/work-stickerbook.js?v=stickerbook-17");
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
    return loadCss("./css/gallery.css?v=gallery-atelier-4").then(function () {
      return loadScript("./js/gallery.js?v=gallery-atelier-4");
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
      if (!item.classList.contains("work-sticker")) {
        item.classList.add("work-content-item");
      }
    });
  }

  function mountCategoryContent(category) {
    var root = workRoot();
    if (!root || !category) return Promise.resolve();

    syncPanels(root, category);
    setBodyModes(category);

    if (category === "hytale" || category === "lowpoly") {
      var assetChain = category === "hytale" ? ensureStickerbookAssets() : Promise.resolve();
      return assetChain.then(function () {
        return ensureLowpolyAssets();
      }).then(function () {
        if (!window.SpaPages.lowpoly || typeof window.SpaPages.lowpoly.init !== "function") {
          return;
        }
        if (!root.__lowpolyReady) {
          document.body.setAttribute("data-lp-library-view", "grid");
          window.SpaPages.lowpoly.init();
          root.__lowpolyReady = true;
        }
        forceWorkLibraryLayout(category);
        syncCategoryScroll(category);
        if (category === "hytale") {
          var hytalePanel = root.querySelector('[data-work-category-panel="hytale"]');
          return buildStickerbookLayout(hytalePanel).then(function () {
            markContentItems(hytalePanel);
          });
        }
        markContentItems(root.querySelector('[data-work-category-panel="' + category + '"]'));
      });
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
      document.body.setAttribute("data-work-layout", "hytale-stickerbook");
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

  function deckItems(root) {
    if (!root) return [];
    return Array.prototype.slice.call(root.querySelectorAll(".work-deck__item"));
  }

  function isDeckPick(el) {
    return !!(el && el.closest && el.closest(".work-deck__pick"));
  }

  function readDeckSpread(root) {
    var hub = root.querySelector("[data-work-hub]") || root;
    var style = window.getComputedStyle(hub);
    return {
      base: parseFloat(style.getPropertyValue("--work-deck-spread-base")) || 160,
      step: parseFloat(style.getPropertyValue("--work-deck-spread-step")) || 72,
    };
  }

  function spreadOffset(index, activeIndex, spread) {
    if (index === activeIndex) return 0;
    var direction = index < activeIndex ? -1 : 1;
    return direction * spread.base;
  }

  function resetDeckSpread(items) {
    items.forEach(function (item) {
      item.style.transform = "";
    });
  }

  function clearDeckFocus(root) {
    var scroller = root && root.querySelector("[data-work-scroller]");
    if (scroller) scroller.classList.remove("has-focus");
    var items = deckItems(root);
    items.forEach(function (item) {
      item.classList.remove("is-active");
    });
    resetDeckSpread(items);
  }

  function focusDeckItem(root, item) {
    var scroller = root.querySelector("[data-work-scroller]");
    var items = deckItems(root);
    if (!scroller || !item) return;

    scroller.classList.add("has-focus");
    var index = items.indexOf(item);
    var spread = readDeckSpread(root);

    items.forEach(function (el, i) {
      el.classList.toggle("is-active", el === item);
      var targetScale = el === item ? 1.12 : 0.9;
      var x = spreadOffset(i, index, spread);
      el.style.transform = "translateX(" + x + "px) scale(" + targetScale + ")";
    });
  }

  var DECK_GLIDE_DURATION = 0.52;
  var DECK_WHEEL_MULT = 0.82;

  function createDeckGlide(scroller) {
    var state = {
      target: scroller.scrollLeft,
      current: scroller.scrollLeft,
      raf: null,
      last: 0,
    };

    function maxScroll() {
      return Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    }

    function clamp(value) {
      return Math.max(0, Math.min(maxScroll(), value));
    }

    function sync(value) {
      var next = clamp(value != null ? value : scroller.scrollLeft);
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
      var lerp = 1 - Math.exp(-dt / DECK_GLIDE_DURATION);
      state.current += (state.target - state.current) * lerp;
      if (Math.abs(state.target - state.current) < 0.35) {
        state.current = state.target;
      }
      scroller.scrollLeft = state.current;
      if (Math.abs(state.target - state.current) > 0.35) {
        state.raf = requestAnimationFrame(frame);
      } else {
        stopRaf();
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

    return { push: push, sync: sync, stop: stopRaf, clamp: clamp };
  }

  function deckGlide(scroller) {
    if (!scroller.__deckGlide) {
      scroller.__deckGlide = createDeckGlide(scroller);
    }
    return scroller.__deckGlide;
  }

  function wheelScrollDelta(event, scroller) {
    var delta = event.deltaY;
    if (event.deltaMode === 1) delta *= 18;
    else if (event.deltaMode === 2) delta *= scroller.clientWidth;
    return delta * DECK_WHEEL_MULT;
  }

  function bindDeck(root) {
    if (!root || deckBound) return;
    deckBound = true;

    var scroller = root.querySelector("[data-work-scroller]");
    if (!scroller) return;
    scroller.removeAttribute("tabindex");

    var glide = deckGlide(scroller);
    var dragging = false;
    var dragStartX = 0;
    var dragStartScroll = 0;
    var dragDistance = 0;
    var activePointer = null;

    scroller.addEventListener(
      "wheel",
      function (event) {
        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
        if (scroller.scrollWidth <= scroller.clientWidth + 2) return;
        event.preventDefault();
        glide.push(wheelScrollDelta(event, scroller));
      },
      { passive: false }
    );

    scroller.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      glide.stop();
      glide.sync(scroller.scrollLeft);
      activePointer = event.pointerId;
      dragging = false;
      dragDistance = 0;
      dragStartX = event.clientX;
      dragStartScroll = scroller.scrollLeft;
    });

    scroller.addEventListener("pointermove", function (event) {
      if (event.pointerId !== activePointer) return;
      var dx = event.clientX - dragStartX;
      if (!dragging) {
        if (Math.abs(dx) < 8) return;
        dragging = true;
        scroller.classList.add("is-dragging");
        try {
          scroller.setPointerCapture(event.pointerId);
        } catch (e) {}
      }
      dragDistance = Math.max(dragDistance, Math.abs(dx));
      scroller.scrollLeft = dragStartScroll - dx;
      glide.sync(scroller.scrollLeft);
    });

    function endDrag(event) {
      if (event.pointerId !== activePointer) return;
      activePointer = null;
      dragging = false;
      scroller.setAttribute("data-drag-px", String(dragDistance));
      scroller.classList.remove("is-dragging");
      glide.sync(scroller.scrollLeft);
      try {
        scroller.releasePointerCapture(event.pointerId);
      } catch (e) {}
    }

    scroller.addEventListener("pointerup", endDrag);
    scroller.addEventListener("pointercancel", endDrag);

    deckItems(root).forEach(function (item) {
      var pick = item.querySelector(".work-deck__pick");
      if (!pick) return;

      pick.addEventListener("pointerenter", function () {
        focusDeckItem(root, item);
      });

      pick.addEventListener("pointerleave", function (event) {
        if (isDeckPick(event.relatedTarget)) return;
        clearDeckFocus(root);
      });

      pick.addEventListener("focusin", function () {
        focusDeckItem(root, item);
      });

      pick.addEventListener("focusout", function (event) {
        if (isDeckPick(event.relatedTarget)) return;
        clearDeckFocus(root);
      });
    });
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
    deckItems(root).forEach(function (item) {
      item.style.opacity = "";
      item.style.pointerEvents = "";
      item.style.transform = "";
      item.querySelectorAll(".work-deck__art").forEach(function (art) {
        art.style.opacity = "";
      });
    });
  }

  function showChooser(root) {
    if (!root) return Promise.resolve();

    var canvas = root.querySelector("[data-work-canvas]");
    var deck = root.querySelector("[data-work-deck]");

    syncPickButtons(root, null);
    syncPanels(root, null);
    syncDockTitle(root, null);
    setBodyModes(null);
    setDockVisible(root, false);
    clearDeckFocus(root);
    haltScroll();

    if (canvas) canvas.hidden = true;
    if (deck) resetDeck(root);
    setPhase(root, "choose");

    return Promise.resolve();
  }

  function openCategory(root, category) {
    if (!root || !category) return Promise.resolve();

    var canvas = root.querySelector("[data-work-canvas]");
    var deck = root.querySelector("[data-work-deck]");

    syncPanels(root, category);
    syncPickButtons(root, category);
    syncDockTitle(root, category);
    setDockVisible(root, true);

    if (deck) deck.style.display = "none";
    if (canvas) canvas.hidden = false;
    setPhase(root, "open", category);

    return mountCategoryContent(category);
  }

  function bindHub(root) {
    if (!root || root.__workHubBound) return;
    root.__workHubBound = true;
    bindDeck(root);

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
      var pickItem = e.target.closest("[data-work-pick]");
      if (pickItem) {
        var pickBtn = pickItem.querySelector(".work-deck__pick");
        if (pickBtn && e.target !== pickBtn && !pickBtn.contains(e.target)) return;
        e.preventDefault();
        var scroller = root.querySelector("[data-work-scroller]");
        if (scroller && Number(scroller.getAttribute("data-drag-px") || 0) >= 12) return;
        var next = pickItem.getAttribute("data-work-pick");
        if (window.AimySpa && typeof window.AimySpa.navigate === "function") {
          window.AimySpa.navigate("./work?category=" + encodeURIComponent(next));
        }
        return;
      }

      if (e.target.closest("[data-work-back]")) {
        e.preventDefault();
        if (!activeCategory) return;
        if (window.AimySpa && typeof window.AimySpa.navigate === "function") {
          window.AimySpa.navigate("./work");
        }
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
      if (!category) {
        flow = showChooser(root);
      } else {
        flow = openCategory(root, category);
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
      var root = workRoot();
      resetWorkChrome(root);
      if (root) {
        setDockVisible(root, false);
        resetDeck(root);
        clearDeckFocus(root);
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
      teardownStickerbook();
      document.body.classList.remove("spa-work-choose");
      document.body.removeAttribute("data-work-layout");
    },
  };
})();
