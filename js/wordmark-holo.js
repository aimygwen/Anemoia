/**
 * wordmark-holo.js — Rainbow Rare holo sticker wordmark (pointer tilt + idle shimmer).
 */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var instances = {};

  function holoAdjust(value, fromLow, fromHigh, toLow, toHigh) {
    return toLow + ((value - fromLow) * (toHigh - toLow)) / (fromHigh - fromLow);
  }

  function holoClamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function holoRound(value) {
    return Math.round(value);
  }

  function resolveNode(root, selector) {
    if (!selector) return null;
    if (typeof selector !== "string") return selector;
    if (root && root !== document && typeof root.querySelector === "function") {
      return root.querySelector(selector);
    }
    return document.querySelector(selector);
  }

  function boot(options) {
    options = options || {};
    var instanceId = options.id || "default";

    if (instances[instanceId]) {
      instances[instanceId]();
      instances[instanceId] = null;
    }

    var root = options.root || document;
    var interactive = resolveNode(root, options.wrap || ".aimy-wordmark-holo-wrap");
    var wordmark = resolveNode(root, options.wordmark || "[data-aimy-wordmark-holo]");
    var sticker = wordmark && wordmark.querySelector(".aimy-type-logo__sticker");
    if (!interactive || !wordmark || !sticker) return null;

    var trackViewport = options.track === "viewport";
    var stickerOpacity =
      typeof options.stickerOpacity === "number" ? options.stickerOpacity : reduced ? 0.88 : 0.92;
    var hoverOpacity = trackViewport ? stickerOpacity : 1;
    var target = { x: 0, y: 0 };
    var current = { x: 0, y: 0 };
    var tiltRaf = 0;
    var idleRaf = 0;
    var idlePhase = Math.random() * Math.PI * 2;
    var hovering = trackViewport;

    function applyPointer(px, py, opacity) {
      var centerX = px - 50;
      var centerY = py - 50;
      var fromCenter = holoClamp(Math.sqrt(centerY * centerY + centerX * centerX) / 50, 0, 1);

      wordmark.style.setProperty("--pointer-x", px + "%");
      wordmark.style.setProperty("--pointer-y", py + "%");
      wordmark.style.setProperty("--pointer-from-center", fromCenter.toFixed(3));
      wordmark.style.setProperty("--pointer-from-top", (py / 100).toFixed(3));
      wordmark.style.setProperty("--pointer-from-left", (px / 100).toFixed(3));
      wordmark.style.setProperty("--background-x", holoAdjust(px, 0, 100, 37, 63).toFixed(1) + "%");
      wordmark.style.setProperty("--background-y", holoAdjust(py, 0, 100, 33, 67).toFixed(1) + "%");
      wordmark.style.setProperty("--card-opacity", String(opacity));
    }

    function paintTilt() {
      current.x += (target.x - current.x) * 0.22;
      current.y += (target.y - current.y) * 0.22;
      sticker.style.setProperty("--wm-tilt-x", current.x.toFixed(3));
      sticker.style.setProperty("--wm-tilt-y", current.y.toFixed(3));
      if (
        hovering ||
        Math.abs(target.x - current.x) > 0.001 ||
        Math.abs(target.y - current.y) > 0.001
      ) {
        tiltRaf = requestAnimationFrame(paintTilt);
      } else {
        tiltRaf = 0;
      }
    }

    function queueTiltPaint() {
      if (!tiltRaf) tiltRaf = requestAnimationFrame(paintTilt);
    }

    function paintIdle() {
      if (hovering || reduced) {
        idleRaf = 0;
        return;
      }
      idlePhase += 0.011;
      var px = 50 + Math.sin(idlePhase) * 22;
      var py = 48 + Math.cos(idlePhase * 0.88) * 17;
      applyPointer(px, py, stickerOpacity);
      idleRaf = requestAnimationFrame(paintIdle);
    }

    function startIdle() {
      if (reduced || hovering || idleRaf) return;
      idleRaf = requestAnimationFrame(paintIdle);
    }

    function stopIdle() {
      if (idleRaf) {
        cancelAnimationFrame(idleRaf);
        idleRaf = 0;
      }
    }

    function pointerRect() {
      return (wordmark || interactive).getBoundingClientRect();
    }

    function updatePointer(clientX, clientY, opacity) {
      var rect = pointerRect();
      if (!rect.width || !rect.height) return;
      var px = holoClamp(holoRound((100 / rect.width) * (clientX - rect.left)), 0, 100);
      var py = holoClamp(holoRound((100 / rect.height) * (clientY - rect.top)), 0, 100);
      applyPointer(px, py, opacity);
    }

    function updateViewportTilt(clientX, clientY, opacity) {
      var w = window.innerWidth || 1;
      var h = window.innerHeight || 1;
      target.x = Math.max(-1, Math.min(1, (clientX / w - 0.5) * 2));
      target.y = Math.max(-1, Math.min(1, (clientY / h - 0.5) * 2));
      updatePointer(clientX, clientY, opacity);
      queueTiltPaint();
    }

    function resetTilt() {
      target.x = 0;
      target.y = 0;
      queueTiltPaint();
    }

    function onEnter(event) {
      hovering = true;
      stopIdle();
      wordmark.classList.add("is-interacting");
      sticker.classList.add("is-tilting");
      updatePointer(event.clientX, event.clientY, hoverOpacity);
      queueTiltPaint();
    }

    function onLeave() {
      hovering = false;
      wordmark.classList.remove("is-interacting");
      sticker.classList.remove("is-tilting");
      resetTilt();
      applyPointer(50, 48, stickerOpacity);
      startIdle();
    }

    function onMove(event) {
      var rect = interactive.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      target.x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
      target.y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));
      updatePointer(event.clientX, event.clientY, hoverOpacity);
      queueTiltPaint();
    }

    function onViewportMove(event) {
      updateViewportTilt(event.clientX, event.clientY, hoverOpacity);
    }

    function onViewportLeave() {
      target.x = 0;
      target.y = 0;
      applyPointer(50, 48, hoverOpacity);
      queueTiltPaint();
    }

    applyPointer(45, 42, stickerOpacity);

    if (!reduced && window.matchMedia("(pointer: fine)").matches) {
      if (trackViewport) {
        wordmark.classList.add("is-interacting");
        queueTiltPaint();
        window.addEventListener("pointermove", onViewportMove, { passive: true });
        document.documentElement.addEventListener("pointerleave", onViewportLeave);
      } else {
        startIdle();
        interactive.addEventListener("pointerenter", onEnter);
        interactive.addEventListener("pointerleave", onLeave);
        interactive.addEventListener("pointermove", onMove, { passive: true });
      }
    } else {
      wordmark.classList.add("is-interacting");
    }

    var cleanup = function () {
      stopIdle();
      if (tiltRaf) cancelAnimationFrame(tiltRaf);
      if (!reduced && window.matchMedia("(pointer: fine)").matches) {
        if (trackViewport) {
          window.removeEventListener("pointermove", onViewportMove);
          document.documentElement.removeEventListener("pointerleave", onViewportLeave);
        } else {
          interactive.removeEventListener("pointerenter", onEnter);
          interactive.removeEventListener("pointerleave", onLeave);
          interactive.removeEventListener("pointermove", onMove);
        }
      }
      sticker.style.removeProperty("--wm-tilt-x");
      sticker.style.removeProperty("--wm-tilt-y");
      wordmark.classList.remove("is-interacting");
      sticker.classList.remove("is-tilting");
      applyPointer(50, 48, stickerOpacity);
      if (instances[instanceId] === cleanup) {
        instances[instanceId] = null;
      }
    };

    instances[instanceId] = cleanup;
    return cleanup;
  }

  function teardown(instanceId) {
    if (instanceId) {
      if (instances[instanceId]) {
        instances[instanceId]();
      }
      return;
    }
    Object.keys(instances).forEach(function (id) {
      if (instances[id]) instances[id]();
    });
  }

  window.AimyWordmarkHolo = {
    boot: boot,
    teardown: teardown,
  };
})();
