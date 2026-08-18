/**
 * work-sticker-holo.js — Rainbow Rare holo pointer tilt for Work sticker book.
 */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var IDLE_OPACITY = 0.18;

  function holoAdjust(value, fromLow, fromHigh, toLow, toHigh) {
    return toLow + ((value - fromLow) * (toHigh - toLow)) / (fromHigh - fromLow);
  }

  function holoClamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function holoRound(value) {
    return Math.round(value);
  }

  function bindRainbowHoloSurface(surface, options) {
    options = options || {};
    if (!surface) return function () {};

    var tiltEl = options.tiltTarget || surface;
    var interactEl = options.interactTarget || surface;
    var varEl = options.varTarget || surface;
    var enableTilt = options.tilt !== false;
    var onRefresh = typeof options.onRefresh === "function" ? options.onRefresh : null;
    var target = { x: 0, y: 0 };
    var current = { x: 0, y: 0 };
    var rafId = 0;
    var hovering = false;

    function applyPointer(px, py, opacity) {
      var centerX = px - 50;
      var centerY = py - 50;
      var fromCenter = holoClamp(Math.sqrt(centerY * centerY + centerX * centerX) / 50, 0, 1);

      varEl.style.setProperty("--pointer-x", px + "%");
      varEl.style.setProperty("--pointer-y", py + "%");
      varEl.style.setProperty("--pointer-from-center", fromCenter.toFixed(3));
      varEl.style.setProperty("--pointer-from-top", (py / 100).toFixed(3));
      varEl.style.setProperty("--pointer-from-left", (px / 100).toFixed(3));
      varEl.style.setProperty("--background-x", holoAdjust(px, 0, 100, 37, 63).toFixed(1) + "%");
      varEl.style.setProperty("--background-y", holoAdjust(py, 0, 100, 33, 67).toFixed(1) + "%");
      varEl.style.setProperty("--card-opacity", String(opacity));
    }

    function paintTilt() {
      if (enableTilt) {
        current.x += (target.x - current.x) * 0.22;
        current.y += (target.y - current.y) * 0.22;
        tiltEl.style.setProperty("--sticker-tilt-x", current.x.toFixed(3));
        tiltEl.style.setProperty("--sticker-tilt-y", current.y.toFixed(3));
      }
      if (
        hovering ||
        (enableTilt &&
          (Math.abs(target.x - current.x) > 0.001 || Math.abs(target.y - current.y) > 0.001))
      ) {
        rafId = requestAnimationFrame(paintTilt);
      } else {
        rafId = 0;
      }
    }

    function queueTiltPaint() {
      if (!rafId) rafId = requestAnimationFrame(paintTilt);
    }

    function measureRect() {
      return varEl.getBoundingClientRect();
    }

    function updatePointer(clientX, clientY) {
      var rect = measureRect();
      if (!rect.width || !rect.height) return;
      var px = holoClamp(holoRound((100 / rect.width) * (clientX - rect.left)), 0, 100);
      var py = holoClamp(holoRound((100 / rect.height) * (clientY - rect.top)), 0, 100);
      applyPointer(px, py, 1);
    }

    function clearPointer() {
      surface.classList.remove("interacting");
      interactEl.classList.remove("interacting");
      if (enableTilt) tiltEl.classList.remove("is-tilting");
      applyPointer(50, 50, IDLE_OPACITY);
      target.x = 0;
      target.y = 0;
      if (enableTilt) queueTiltPaint();
    }

    function onEnter(event) {
      hovering = true;
      surface.classList.add("interacting");
      interactEl.classList.add("interacting");
      if (enableTilt) tiltEl.classList.add("is-tilting");
      if (onRefresh) onRefresh(surface);
      updatePointer(event.clientX, event.clientY);
      if (enableTilt) queueTiltPaint();
    }

    function onLeave() {
      hovering = false;
      clearPointer();
    }

    function onMove(event) {
      var rect = measureRect();
      if (!rect.width || !rect.height) return;
      if (enableTilt) {
        target.x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
        target.y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));
        queueTiltPaint();
      }
      updatePointer(event.clientX, event.clientY);
    }

    applyPointer(50, 50, IDLE_OPACITY);

    if (!reduced && window.matchMedia("(pointer: fine)").matches) {
      surface.addEventListener("pointerenter", onEnter);
      surface.addEventListener("pointerleave", onLeave);
      surface.addEventListener("pointermove", onMove, { passive: true });
    } else {
      applyPointer(42, 38, 0.85);
      surface.classList.add("interacting");
      interactEl.classList.add("interacting");
    }

    return function () {
      if (!reduced && window.matchMedia("(pointer: fine)").matches) {
        surface.removeEventListener("pointerenter", onEnter);
        surface.removeEventListener("pointerleave", onLeave);
        surface.removeEventListener("pointermove", onMove);
      }
      if (rafId) cancelAnimationFrame(rafId);
      if (enableTilt) {
        tiltEl.style.removeProperty("--sticker-tilt-x");
        tiltEl.style.removeProperty("--sticker-tilt-y");
      }
      surface.classList.remove("interacting");
      interactEl.classList.remove("interacting");
      if (enableTilt) tiltEl.classList.remove("is-tilting");
      varEl.style.removeProperty("--pointer-x");
      varEl.style.removeProperty("--pointer-y");
      varEl.style.removeProperty("--pointer-from-center");
      varEl.style.removeProperty("--pointer-from-top");
      varEl.style.removeProperty("--pointer-from-left");
      varEl.style.removeProperty("--background-x");
      varEl.style.removeProperty("--background-y");
      varEl.style.removeProperty("--card-opacity");
    };
  }

  window.WorkStickerHolo = {
    bind: bindRainbowHoloSurface,
  };
})();
