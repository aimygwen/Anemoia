/**
 * Start — work scroller (drag + wheel → horizontal).
 */
(function () {
  "use strict";

  var root = document.querySelector("[data-start-work]");
  var scroller = document.querySelector("[data-start-work-scroller]");
  if (!root || !scroller) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var dragging = false;
  var startX = 0;
  var startScroll = 0;
  var moved = false;

  function drawMosaic(canvas, image, src, rect, pixelSize) {
    var context = canvas.getContext("2d");
    var width = Math.max(6, Math.round(rect.width / pixelSize));
    var height = Math.max(6, Math.round(rect.height / pixelSize));
    var scale = Math.max(width / src.w, height / src.h);
    var sourceWidth = width / scale;
    var sourceHeight = height / scale;
    var sourceX = (src.w - sourceWidth) / 2;
    var sourceY = (src.h - sourceHeight) / 2;

    canvas.width = width;
    canvas.height = height;
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, width, height);

    /*
     * Rasterize SVG (or photo) into a known-size buffer first so
     * percentage-sized SVGs still produce a real pixel mosaic.
     */
    var buffer = document.createElement("canvas");
    buffer.width = src.w;
    buffer.height = src.h;
    var bufferCtx = buffer.getContext("2d");
    bufferCtx.imageSmoothingEnabled = true;
    try {
      bufferCtx.drawImage(image, 0, 0, src.w, src.h);
    } catch (err) {
      return false;
    }

    context.drawImage(
      buffer,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      width,
      height
    );
    return true;
  }

  Array.prototype.forEach.call(
    scroller.querySelectorAll(".start-work__preview"),
    function (preview) {
      var image = preview.querySelector("img");
      if (!image) return;

      var col = preview.closest(".start-work__col");
      var isSketch = preview.classList.contains("start-work__preview--sketch");
      var canvas = document.createElement("canvas");
      canvas.className = "start-work__pixel-preview";
      canvas.setAttribute("aria-hidden", "true");
      preview.appendChild(canvas);

      var hovering = false;

      function sourceSize() {
        var w = image.naturalWidth;
        var h = image.naturalHeight;
        /* SVGs with % width/height often report 0 — use viewBox fallback */
        if ((!w || !h) && isSketch) {
          w = 1898;
          h = 1898;
        }
        return w && h ? { w: w, h: h } : null;
      }

      function pixelSizeForState() {
        if (!isSketch) return 88;
        /* One mosaic: mild at rest, very chunky on hover */
        return hovering ? 64 : 9;
      }

      function drawPixelPreview() {
        var src = sourceSize();
        if (!src) return;
        var rect = preview.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        drawMosaic(canvas, image, src, rect, pixelSizeForState());
      }

      function tryDraw() {
        drawPixelPreview();
        /* Retry once after layout if the first pass had no box yet */
        if (!canvas.width) {
          requestAnimationFrame(drawPixelPreview);
        }
      }

      if (image.complete) tryDraw();
      else image.addEventListener("load", tryDraw, { once: true });

      if ("ResizeObserver" in window) {
        new ResizeObserver(drawPixelPreview).observe(preview);
      }

      if (isSketch && col) {
        col.addEventListener("pointerenter", function () {
          hovering = true;
          drawPixelPreview();
        });
        col.addEventListener("pointerleave", function () {
          hovering = false;
          drawPixelPreview();
        });
        col.addEventListener("focusin", function () {
          hovering = true;
          drawPixelPreview();
        });
        col.addEventListener("focusout", function () {
          if (col.contains(document.activeElement)) return;
          hovering = false;
          drawPixelPreview();
        });
      }
    }
  );

  /* Vertical wheel → horizontal browse */
  scroller.addEventListener(
    "wheel",
    function (event) {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      if (scroller.scrollWidth <= scroller.clientWidth + 2) return;
      event.preventDefault();
      scroller.scrollLeft += event.deltaY;
    },
    { passive: false }
  );

  if (reduced) return;

  scroller.addEventListener("pointerdown", function (event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragging = true;
    moved = false;
    startX = event.clientX;
    startScroll = scroller.scrollLeft;
    scroller.setPointerCapture(event.pointerId);
    scroller.classList.add("is-dragging");
  });

  scroller.addEventListener("pointermove", function (event) {
    if (!dragging) return;
    var dx = event.clientX - startX;
    if (Math.abs(dx) > 4) moved = true;
    scroller.scrollLeft = startScroll - dx;
  });

  function endDrag(event) {
    if (!dragging) return;
    dragging = false;
    scroller.classList.remove("is-dragging");
    try {
      scroller.releasePointerCapture(event.pointerId);
    } catch (e) {}
  }

  scroller.addEventListener("pointerup", endDrag);
  scroller.addEventListener("pointercancel", endDrag);

  /* Avoid accidental navigation after a drag */
  scroller.addEventListener("click", function (event) {
    if (!moved) return;
    event.preventDefault();
    event.stopPropagation();
    moved = false;
  }, true);
})();
