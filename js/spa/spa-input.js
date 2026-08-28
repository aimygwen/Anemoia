/**
 * spa-input.js — site-wide keyboard + gamepad navigation.
 *
 * ESC — toggle coin menu
 * Tab / ← / → — previous / next (menu + hub pickers)
 * ↑ / ↓ — scroll page
 * Enter — confirm selection
 * Backspace / gamepad B — in-app back (overlays, menu, then AimySpa.goBack)
 */
(function () {
  "use strict";

  var SCROLL_STEP = 140;
  var GP_REPEAT_MS = 140;
  var gpHeld = {};
  var gpLastFire = {};
  var gpRaf = 0;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function isTyping() {
    var el = document.activeElement;
    if (!el) return false;
    var tag = (el.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    if (el.isContentEditable) return true;
    return false;
  }

  function menuIsOpen() {
    if (typeof window.__aimyMenuIsOpen === "function") return window.__aimyMenuIsOpen();
    return document.documentElement.classList.contains("pk-menu-open");
  }

  function toggleMenu() {
    if (typeof window.__aimyToggleMenu === "function") {
      window.__aimyToggleMenu();
      return;
    }
    if (menuIsOpen()) {
      if (typeof window.__aimyCloseMenu === "function") window.__aimyCloseMenu();
    } else if (typeof window.__aimyOpenMenu === "function") {
      window.__aimyOpenMenu();
    }
  }

  function lightboxOpen() {
    var lb = document.querySelector("#lightbox.active, .lightbox.active");
    if (!lb) return false;
    return lb.getAttribute("aria-hidden") !== "true";
  }

  function sketchbookZoomOpen() {
    return document.body.classList.contains("is-sketchbook-zoom-open");
  }

  function closeSketchbookZoom() {
    var btn = document.querySelector("[data-sketchbook-zoom-close]");
    if (btn) {
      btn.click();
      return true;
    }
    var zoom = document.querySelector("[data-sketchbook-zoom].is-open");
    if (zoom) {
      zoom.classList.remove("is-open");
      zoom.hidden = true;
      document.body.classList.remove("is-sketchbook-zoom-open");
      return true;
    }
    return false;
  }

  function closeLightbox() {
    var btn = document.getElementById("lightbox-close");
    if (btn) {
      btn.click();
      return true;
    }
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    return true;
  }

  function spaState() {
    if (window.AimySpaState && typeof window.AimySpaState.get === "function") {
      return window.AimySpaState.get();
    }
    return { view: "start", query: {} };
  }

  function goBack() {
    if (lightboxOpen()) return closeLightbox();
    if (sketchbookZoomOpen()) return closeSketchbookZoom();
    if (menuIsOpen()) {
      if (typeof window.__aimyCloseMenu === "function") window.__aimyCloseMenu();
      return true;
    }
    if (window.AimySpa && typeof window.AimySpa.goBack === "function") {
      window.AimySpa.goBack();
      return true;
    }
    return false;
  }

  function scrollPage(dir) {
    var delta = dir * SCROLL_STEP;
    if (window.__lenis && typeof window.__lenis.scrollTo === "function") {
      var target = (typeof window.__lenis.scroll === "number" ? window.__lenis.scroll : window.scrollY) + delta;
      window.__lenis.scrollTo(target, {
        duration: reduced ? 0.01 : 0.85,
      });
      return;
    }
    window.scrollBy({ top: delta, behavior: reduced ? "auto" : "smooth" });
  }

  function menuStep(dir) {
    if (!window.AimyMenuSelect) return false;
    if (dir > 0 && typeof window.AimyMenuSelect.next === "function") {
      window.AimyMenuSelect.next();
      return true;
    }
    if (dir < 0 && typeof window.AimyMenuSelect.prev === "function") {
      window.AimyMenuSelect.prev();
      return true;
    }
    return false;
  }

  function menuConfirm() {
    if (window.AimyMenuSelect && typeof window.AimyMenuSelect.openCurrent === "function") {
      window.AimyMenuSelect.openCurrent();
      return true;
    }
    return false;
  }

  function horizontalNav(dir) {
    if (menuIsOpen()) return menuStep(dir);

    if (lightboxOpen() || sketchbookZoomOpen()) return false;

    var state = spaState();
    var view = state.view || "start";
    var query = state.query || {};

    if (view === "work" && !query.category) {
      if (window.SpaPages && window.SpaPages.work && typeof window.SpaPages.work.cyclePicker === "function") {
        return window.SpaPages.work.cyclePicker(dir);
      }
    }

    if (view === "insights" && !query.log) {
      if (window.SpaPages && window.SpaPages.insights && typeof window.SpaPages.insights.cycleDeck === "function") {
        return window.SpaPages.insights.cycleDeck(dir);
      }
    }

    if (view === "imprint" && document.body.classList.contains("imprint-phase-choose")) {
      return cycleImprintPicker(dir);
    }

    if (view === "work" && query.category === "sculpts") {
      return false;
    }

    return false;
  }

  function cycleImprintPicker(dir) {
    var btns = Array.prototype.slice.call(document.querySelectorAll(".imprint-picker__btn[data-imprint-panel]"));
    if (!btns.length) return false;
    var idx = btns.findIndex(function (btn) {
      return btn.classList.contains("is-aimy-input-focus");
    });
    if (idx < 0) {
      idx = btns.findIndex(function (btn) {
        return btn.classList.contains("is-active");
      });
    }
    if (idx < 0) idx = 0;
    idx = (idx + dir + btns.length) % btns.length;
    btns.forEach(function (btn, i) {
      btn.classList.toggle("is-aimy-input-focus", i === idx);
    });
    btns[idx].focus({ preventScroll: true });
    return true;
  }

  function confirmImprintPicker() {
    var btn =
      document.querySelector(".imprint-picker__btn.is-aimy-input-focus") ||
      document.querySelector(".imprint-picker__btn.is-active");
    if (!btn) return false;
    btn.click();
    return true;
  }

  function confirmSelection() {
    if (menuIsOpen()) return menuConfirm();

    if (lightboxOpen() || sketchbookZoomOpen()) return false;

    var state = spaState();
    var view = state.view || "start";
    var query = state.query || {};

    if (view === "work" && !query.category) {
      if (window.SpaPages && window.SpaPages.work && typeof window.SpaPages.work.confirmPicker === "function") {
        return window.SpaPages.work.confirmPicker();
      }
    }

    if (view === "insights" && !query.log) {
      if (window.SpaPages && window.SpaPages.insights && typeof window.SpaPages.insights.confirmDeck === "function") {
        return window.SpaPages.insights.confirmDeck();
      }
    }

    if (view === "imprint" && document.body.classList.contains("imprint-phase-choose")) {
      return confirmImprintPicker();
    }

    var focused = document.activeElement;
    if (focused && typeof focused.click === "function" && focused !== document.body) {
      if (focused.matches("a[href], button, [role='button'], [data-work-pick], [data-ins-log-pick]")) {
        focused.click();
        return true;
      }
    }

    return false;
  }

  function shouldIgnoreKey() {
    if (isTyping()) return true;
    return false;
  }

  function onKeydown(e) {
    if (shouldIgnoreKey()) return;

    var key = e.key;

    if (lightboxOpen()) {
      if (key === "Escape" || key === "Backspace") return;
      if (key === "ArrowLeft" || key === "ArrowRight") return;
    }

    if (key === "Escape") {
      e.preventDefault();
      if (sketchbookZoomOpen()) closeSketchbookZoom();
      else toggleMenu();
      return;
    }

    if (key === "Backspace") {
      e.preventDefault();
      goBack();
      return;
    }

    if (menuIsOpen()) {
      if (key === "Tab") {
        e.preventDefault();
        horizontalNav(e.shiftKey ? -1 : 1);
        return;
      }
      if (key === "ArrowLeft") {
        e.preventDefault();
        menuStep(-1);
        return;
      }
      if (key === "ArrowRight") {
        e.preventDefault();
        menuStep(1);
        return;
      }
      if (key === "Enter") {
        e.preventDefault();
        menuConfirm();
        return;
      }
      if (key === "ArrowUp" || key === "ArrowDown") {
        e.preventDefault();
        return;
      }
    }

    if (key === "Tab") {
      e.preventDefault();
      horizontalNav(e.shiftKey ? -1 : 1);
      return;
    }

    if (key === "ArrowLeft") {
      if (horizontalNav(-1)) e.preventDefault();
      return;
    }

    if (key === "ArrowRight") {
      if (horizontalNav(1)) e.preventDefault();
      return;
    }

    if (key === "ArrowUp") {
      e.preventDefault();
      scrollPage(-1);
      return;
    }

    if (key === "ArrowDown") {
      e.preventDefault();
      scrollPage(1);
      return;
    }

    if (key === "Enter") {
      if (confirmSelection()) e.preventDefault();
    }
  }

  function gpButtonPressed(index, pad) {
    return pad.buttons[index] && pad.buttons[index].pressed;
  }

  function gpFire(action, key) {
    var now = performance.now();
    if (!gpHeld[key]) {
      gpHeld[key] = true;
      gpLastFire[key] = now;
      return true;
    }
    if (now - gpLastFire[key] >= GP_REPEAT_MS) {
      gpLastFire[key] = now;
      return true;
    }
    return false;
  }

  function gpRelease(key) {
    gpHeld[key] = false;
  }

  function pollGamepad() {
    if (!navigator.getGamepads) {
      gpRaf = 0;
      return;
    }

    var pads = navigator.getGamepads();
    var i;
    for (i = 0; i < pads.length; i++) {
      var pad = pads[i];
      if (!pad) continue;

      if (gpButtonPressed(9, pad)) {
        if (gpFire("menu", "menu")) toggleMenu();
      } else {
        gpRelease("menu");
      }

      if (isTyping() || lightboxOpen()) continue;

      if (gpButtonPressed(1, pad)) {
        if (gpFire("back", "back")) goBack();
      } else {
        gpRelease("back");
      }

      if (gpButtonPressed(0, pad)) {
        if (gpFire("confirm", "confirm")) confirmSelection();
      } else {
        gpRelease("confirm");
      }

      var left = gpButtonPressed(14, pad);
      var right = gpButtonPressed(15, pad);
      var up = gpButtonPressed(12, pad);
      var down = gpButtonPressed(13, pad);

      if (!left && pad.axes && pad.axes.length > 0 && Math.abs(pad.axes[0]) > 0.55) {
        left = pad.axes[0] < -0.55;
        right = pad.axes[0] > 0.55;
      }
      if (!up && pad.axes && pad.axes.length > 1 && Math.abs(pad.axes[1]) > 0.55) {
        up = pad.axes[1] < -0.55;
        down = pad.axes[1] > 0.55;
      }

      if (left) {
        if (gpFire("left", "left")) horizontalNav(-1);
      } else {
        gpRelease("left");
      }

      if (right) {
        if (gpFire("right", "right")) horizontalNav(1);
      } else {
        gpRelease("right");
      }

      if (up) {
        if (gpFire("up", "up")) scrollPage(-1);
      } else {
        gpRelease("up");
      }

      if (down) {
        if (gpFire("down", "down")) scrollPage(1);
      } else {
        gpRelease("down");
      }

      break;
    }

    gpRaf = window.requestAnimationFrame(pollGamepad);
  }

  function startGamepad() {
    if (gpRaf) return;
    gpRaf = window.requestAnimationFrame(pollGamepad);
  }

  function boot() {
    if (!document.body || !document.body.hasAttribute("data-spa-host")) return;
    document.addEventListener("keydown", onKeydown, true);
    window.addEventListener("gamepadconnected", startGamepad);
    startGamepad();
  }

  window.AimySpaInput = {
    scrollPage: scrollPage,
    goBack: goBack,
    toggleMenu: toggleMenu,
    horizontalNav: horizontalNav,
    confirmSelection: confirmSelection,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
