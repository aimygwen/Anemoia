/**
 * work-sculpts.js — fullscreen depth snap gallery (scroll + zoom/blur transitions).
 */
(function () {
  "use strict";

  var MANIFEST_URL = "./assets/content/sculpts/manifest.json?v=sculpts-10";
  var ASSET_BASE = "./assets/content/sculpts/";
  var TRANSITION_MS =
    window.Polyglide && window.Polyglide.DURATION
      ? Math.round(window.Polyglide.DURATION * 1000)
      : 1150;
  var WHEEL_THRESHOLD = 48;
  var SWIPE_THRESHOLD = 52;

  var mountedPanel = null;
  var stageEl = null;
  var stackEl = null;
  var items = [];
  var currentIndex = 0;
  var animating = false;
  var wheelAccum = 0;
  var wheelResetTimer = null;
  var unlockTimer = null;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var onWheel = null;
  var onKeydown = null;
  var touchStartY = 0;
  var onTouchStart = null;
  var onTouchEnd = null;

  function labelFromFilename(name) {
    if (!name) return "Sculpt";
    return name
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, function (ch) {
        return ch.toUpperCase();
      });
  }

  function resolveSrc(filename) {
    return ASSET_BASE + filename;
  }

  function normalizeWheelDelta(delta, mode, pageSize) {
    if (mode === 1) return delta * 18;
    if (mode === 2) return delta * pageSize;
    return delta;
  }

  function applyRestState(index) {
    var i;
    for (i = 0; i < items.length; i++) {
      items[i].classList.remove("is-active", "is-waiting", "is-passed");
      if (i === index) {
        items[i].classList.add("is-active");
      } else if (i > index) {
        items[i].classList.add("is-waiting");
      } else {
        items[i].classList.add("is-passed");
      }
    }
  }

  function lockStage() {
    animating = true;
    if (stageEl) stageEl.classList.add("is-locked");
    if (unlockTimer) clearTimeout(unlockTimer);
    unlockTimer = setTimeout(function () {
      animating = false;
      if (stageEl) stageEl.classList.remove("is-locked");
      unlockTimer = null;
    }, reduced ? 16 : TRANSITION_MS);
  }

  function goToIndex(next, options) {
    options = options || {};
    if (!items.length) return;
    if (next < 0 || next >= items.length) return;
    if (next === currentIndex) return;
    if (animating && !options.force) return;

    if (Math.abs(next - currentIndex) !== 1) {
      currentIndex = next;
      applyRestState(currentIndex);
      if (stageEl) stageEl.setAttribute("data-sculpt-index", String(currentIndex));
      return;
    }

    var dir = next > currentIndex ? 1 : -1;
    var outgoing = items[currentIndex];
    var incoming = items[next];

    lockStage();

    outgoing.classList.remove("is-active", "is-waiting", "is-passed");
    incoming.classList.remove("is-active", "is-waiting", "is-passed");

    if (dir > 0) {
      outgoing.classList.add("is-passed");
      incoming.classList.add("is-waiting");
      incoming.offsetHeight;
      incoming.classList.remove("is-waiting");
      incoming.classList.add("is-active");
    } else {
      outgoing.classList.add("is-waiting");
      incoming.classList.add("is-passed");
      incoming.offsetHeight;
      incoming.classList.remove("is-passed");
      incoming.classList.add("is-active");
    }

    currentIndex = next;

    if (stageEl) {
      stageEl.setAttribute("data-sculpt-index", String(currentIndex));
    }

    if (reduced) {
      applyRestState(currentIndex);
      animating = false;
      if (stageEl) stageEl.classList.remove("is-locked");
      if (unlockTimer) {
        clearTimeout(unlockTimer);
        unlockTimer = null;
      }
      return;
    }

    setTimeout(function () {
      applyRestState(currentIndex);
    }, TRANSITION_MS);
  }

  function nudge(dir) {
    goToIndex(currentIndex + dir);
  }

  function onWheelEvent(event) {
    if (!items.length || animating) {
      event.preventDefault();
      return;
    }

    var page = stageEl ? stageEl.clientHeight : window.innerHeight;
    var deltaY = normalizeWheelDelta(event.deltaY, event.deltaMode, page);
    var deltaX = normalizeWheelDelta(event.deltaX, event.deltaMode, page);
    var delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;

    if (Math.abs(delta) < 0.5) return;

    event.preventDefault();
    event.stopPropagation();

    wheelAccum += delta;

    if (wheelResetTimer) clearTimeout(wheelResetTimer);
    wheelResetTimer = setTimeout(function () {
      wheelAccum = 0;
      wheelResetTimer = null;
    }, 180);

    if (Math.abs(wheelAccum) < WHEEL_THRESHOLD) return;

    var dir = wheelAccum > 0 ? 1 : -1;
    wheelAccum = 0;
    nudge(dir);
  }

  function onKeydownEvent(event) {
    if (!stageEl || !items.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowRight" || event.key === "PageDown") {
      event.preventDefault();
      nudge(1);
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft" || event.key === "PageUp") {
      event.preventDefault();
      nudge(-1);
    }
  }

  function bindStage(stage, panel) {
    if (!stage || stage.__sculptsBound) return;
    stage.__sculptsBound = true;

    onWheel = onWheelEvent;
    onKeydown = onKeydownEvent;
    onTouchStart = function (event) {
      if (!event.touches || !event.touches.length) return;
      touchStartY = event.touches[0].clientY;
    };
    onTouchEnd = function (event) {
      if (animating || !event.changedTouches || !event.changedTouches.length) return;
      var dy = touchStartY - event.changedTouches[0].clientY;
      if (Math.abs(dy) < SWIPE_THRESHOLD) return;
      nudge(dy > 0 ? 1 : -1);
    };

    (panel || stage).addEventListener("wheel", onWheel, { passive: false, capture: true });
    stage.addEventListener("keydown", onKeydown);
    stage.addEventListener("touchstart", onTouchStart, { passive: true });
    stage.addEventListener("touchend", onTouchEnd, { passive: true });
  }

  function unbindStage(stage, panel) {
    if (unlockTimer) {
      clearTimeout(unlockTimer);
      unlockTimer = null;
    }
    if (wheelResetTimer) {
      clearTimeout(wheelResetTimer);
      wheelResetTimer = null;
    }

    var host = panel || stage;
    if (host && onWheel) host.removeEventListener("wheel", onWheel, true);
    if (stage && onKeydown) stage.removeEventListener("keydown", onKeydown);
    if (stage && onTouchStart) stage.removeEventListener("touchstart", onTouchStart);
    if (stage && onTouchEnd) stage.removeEventListener("touchend", onTouchEnd);

    if (stage) {
      stage.__sculptsBound = false;
      stage.classList.remove("is-locked");
    }

    onWheel = null;
    onKeydown = null;
    onTouchStart = null;
    onTouchEnd = null;
    animating = false;
    wheelAccum = 0;
  }

  function clearPanel(panel) {
    if (stageEl) unbindStage(stageEl, panel);
    stageEl = null;
    stackEl = null;
    items = [];
    currentIndex = 0;
    animating = false;
    wheelAccum = 0;

    if (!panel) return;
    var stack = panel.querySelector("[data-work-sculpts-stack]");
    if (stack) stack.textContent = "";
    panel.querySelectorAll("[data-work-sculpts-dots]").forEach(function (node) {
      node.remove();
    });
  }

  function ensureStructure(panel) {
    var section = panel && panel.querySelector(".work-sculpts");
    if (!section) return null;

    var stage = section.querySelector("[data-work-sculpts-stage]");
    var stack = section.querySelector("[data-work-sculpts-stack]");

    if (!stage) {
      var legacyViewport = section.querySelector("[data-work-sculpts-viewport]");
      stage = document.createElement("div");
      stage.className = "work-sculpts__stage";
      stage.setAttribute("data-work-sculpts-stage", "");
      stage.setAttribute("tabindex", "0");
      stage.setAttribute("aria-label", "Sculpts gallery, scroll to explore");

      stack = document.createElement("div");
      stack.className = "work-sculpts__stack";
      stack.setAttribute("data-work-sculpts-stack", "");
      stage.appendChild(stack);

      if (legacyViewport) {
        legacyViewport.replaceWith(stage);
      } else {
        section.textContent = "";
        section.appendChild(stage);
      }
    }

    if (!stack) return null;

    section.querySelectorAll("[data-work-sculpts-dots]").forEach(function (node) {
      node.remove();
    });

    return { section: section, stage: stage, stack: stack };
  }

  function render(panel, images) {
    var nodes = ensureStructure(panel);
    if (!nodes) return;

    stageEl = nodes.stage;
    stackEl = nodes.stack;
    stackEl.textContent = "";
    items = [];
    currentIndex = 0;

    var i;
    for (i = 0; i < images.length; i++) {
      var filename = images[i];
      var figure = document.createElement("figure");
      figure.className = "work-sculpts__item";

      var img = document.createElement("img");
      img.className = "work-sculpts__img";
      img.src = resolveSrc(filename);
      img.alt = labelFromFilename(filename);
      img.decoding = "async";
      img.loading = i < 2 ? "eager" : "lazy";

      figure.appendChild(img);
      stackEl.appendChild(figure);
      items.push(figure);
    }

    applyRestState(0);
    stageEl.setAttribute("data-sculpt-index", "0");
    bindStage(stageEl, panel);
  }

  function mount(panel) {
    panel = panel || document.querySelector('[data-work-category-panel="sculpts"]');
    if (!panel) return Promise.resolve();

    mountedPanel = panel;
    clearPanel(panel);

    return fetch(MANIFEST_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("sculpts manifest");
        return res.json();
      })
      .then(function (data) {
        if (!mountedPanel || mountedPanel !== panel) return;
        var images = Array.isArray(data.images) ? data.images.slice() : [];
        render(panel, images);
      })
      .catch(function () {
        if (!mountedPanel || mountedPanel !== panel) return;
        clearPanel(panel);
      });
  }

  function teardown() {
    clearPanel(mountedPanel);
    mountedPanel = null;
  }

  window.WorkSculpts = {
    mount: mount,
    teardown: teardown,
  };
})();
