/**
 * Start hero CTA — pre-coin noise rings, text-centered.
 * Also balances the welcome title stack.
 */
(function () {
  "use strict";

  var welcomeWrap = document.querySelector(".c-welcome .-w");
  var line1 = document.querySelector(".c-welcome .-w span.title.line-1");
  var line2 = document.querySelector(".c-welcome .-w span.title.line-2");
  var line3 = document.querySelector(".c-welcome .-w span.title.line-3");
  if (line1) {
    line1.textContent = "Visions of";
    line1.classList.add("is-visions-of", "is-title-fill");
  }
  if (line2) {
    line2.hidden = true;
    line2.setAttribute("aria-hidden", "true");
    line2.classList.add("is-title-spacer");
  }
  if (line3) {
    line3.textContent = "Aimy Gwen";
    line3.classList.add("is-brand-title", "is-title-fill");
  }

  /* Outline clones sit above the hero art; fills stay behind it.
     Outline is masked to the character alpha so hollow type only
     appears where the art covers the filled title. */
  if (welcomeWrap) {
    var stone = welcomeWrap.querySelector(".stone");
    var stoneImg = stone && stone.querySelector("img");

    [line1, line3].forEach(function (line) {
      if (!line) return;
      var kind = line.classList.contains("line-1") ? "line-1" : "line-3";
      if (welcomeWrap.querySelector(".is-title-outline." + kind)) return;
      var outline = line.cloneNode(true);
      outline.classList.remove("is-title-fill");
      outline.classList.add("is-title-outline");
      outline.setAttribute("aria-hidden", "true");
      outline.removeAttribute("string");
      outline.removeAttribute("string-split");
      outline.removeAttribute("string-copy-from");
      if (stone && stone.parentNode === welcomeWrap) {
        welcomeWrap.insertBefore(outline, stone.nextSibling);
      } else {
        welcomeWrap.appendChild(outline);
      }
    });

    function syncOutlineMasks() {
      var img = welcomeWrap.querySelector(".stone img");
      var nodes = welcomeWrap.querySelectorAll(".is-title-outline");
      if (!img || !nodes.length) return;
      var src = img.currentSrc || img.src;
      if (!src) return;
      var stoneRect = img.getBoundingClientRect();
      if (stoneRect.width < 2 || stoneRect.height < 2) return;
      nodes.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var pos =
          stoneRect.left - r.left + "px " + (stoneRect.top - r.top) + "px";
        var size = stoneRect.width + "px " + stoneRect.height + "px";
        var mask = 'url("' + src + '")';
        el.style.maskImage = mask;
        el.style.webkitMaskImage = mask;
        el.style.maskRepeat = "no-repeat";
        el.style.webkitMaskRepeat = "no-repeat";
        el.style.maskSize = size;
        el.style.webkitMaskSize = size;
        el.style.maskPosition = pos;
        el.style.webkitMaskPosition = pos;
      });
    }

    if (stoneImg || stone) {
      var maskRaf = 0;
      function queueMaskSync() {
        if (maskRaf) return;
        maskRaf = requestAnimationFrame(function () {
          maskRaf = 0;
          syncOutlineMasks();
        });
      }

      if (stoneImg) {
        if (stoneImg.complete) queueMaskSync();
        else stoneImg.addEventListener("load", queueMaskSync, { once: true });
      }
      window.addEventListener("resize", queueMaskSync, { passive: true });
      queueMaskSync();
      setTimeout(queueMaskSync, 100);
    }
  }

  var button = document.querySelector(".c-welcome .cta .button");
  if (!button) return;

  var label = button.querySelector(":scope > span");
  if (label) label.textContent = "Me";

  var frost = document.createElement("i");
  frost.className = "aimy-cta-frost";
  frost.setAttribute("aria-hidden", "true");
  button.insertBefore(frost, button.firstChild);

  var canvas = document.createElement("canvas");
  canvas.className = "aimy-cta-noise-rings";
  canvas.setAttribute("aria-hidden", "true");
  button.appendChild(canvas);

  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(pointer: coarse)").matches;
  var dpi = Math.min(window.devicePixelRatio || 1, 2);
  var noise = typeof SimplexNoise !== "undefined" ? new SimplexNoise() : null;
  var width = 0;
  var height = 0;
  var radius = 0;
  var visible = true;
  var frame = 0;
  var noiseAmpMul = { value: 1 };
  var rainbow = false;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    var buttonRect = button.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width * dpi));
    height = Math.max(1, Math.round(rect.height * dpi));
    radius = Math.min(buttonRect.width, buttonRect.height) * dpi * 0.5;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
  }

  function ringNoise(nx, ny, z) {
    if (noise) return noise.noise3D(nx * 0.5, ny * 0.5, z);
    return Math.sin(nx * 2.7 + ny * 3.1 + z) * 0.55;
  }

  function parseColor(raw, fallback) {
    raw = (raw || "").trim();
    var hex = raw.match(/^#([\da-f]{6})$/i);
    if (hex) {
      return {
        r: parseInt(hex[1].slice(0, 2), 16),
        g: parseInt(hex[1].slice(2, 4), 16),
        b: parseInt(hex[1].slice(4, 6), 16),
      };
    }
    var rgb = raw.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgb) {
      return {
        r: parseInt(rgb[1], 10),
        g: parseInt(rgb[2], 10),
        b: parseInt(rgb[3], 10),
      };
    }
    return fallback;
  }

  function rainbowStroke(time) {
    var colors = [
      { r: 255, g: 79, b: 163 },
      { r: 255, g: 216, b: 74 },
      { r: 93, g: 255, b: 176 },
      { r: 94, g: 200, b: 255 },
      { r: 216, g: 137, b: 255 },
    ];
    var phase = ((time % 2200) / 2200) * colors.length;
    var index = Math.floor(phase) % colors.length;
    var next = (index + 1) % colors.length;
    var mix = phase - Math.floor(phase);
    function lift(channel) {
      return Math.min(255, Math.round(channel + (255 - channel) * 0.22));
    }
    var r = colors[index].r + (colors[next].r - colors[index].r) * mix;
    var g = colors[index].g + (colors[next].g - colors[index].g) * mix;
    var b = colors[index].b + (colors[next].b - colors[index].b) * mix;
    return { r: lift(r), g: lift(g), b: lift(b) };
  }

  function drawRing(index, time, stroke) {
    ctx.beginPath();
    for (var i = 0; i < 50; i += 1) {
      var angle = (i / 50) * Math.PI * 2;
      var nx = Math.cos(angle);
      var ny = Math.sin(angle);
      var wobble =
        ringNoise(nx, ny, time * 0.001 + index) * 5 * noiseAmpMul.value;
      var r = radius + wobble;
      var x = width * 0.5 + nx * r;
      var y = height * 0.5 + ny * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    var alpha = rainbow ? (index === 0 ? 0.85 : 1) : index === 0 ? 0.6 : 1;
    ctx.strokeStyle =
      "rgba(" + stroke.r + "," + stroke.g + "," + stroke.b + "," + alpha + ")";
    if (rainbow) {
      ctx.shadowColor =
        "rgba(" + stroke.r + "," + stroke.g + "," + stroke.b + ",0.65)";
      ctx.shadowBlur = 10 * dpi;
    } else {
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    }
    ctx.stroke();
  }

  function paint(time) {
    frame = 0;
    resize();
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = (rainbow ? 2.25 : 1.5) * dpi;

    var stroke = rainbow
      ? rainbowStroke(Date.now())
      : { r: 255, g: 255, b: 255 };
    var clock = reduced ? 0 : Date.now();

    drawRing(0, clock, stroke);
    drawRing(1, clock, stroke);

    if (visible && !reduced) frame = requestAnimationFrame(paint);
  }

  function start() {
    if (!frame) frame = requestAnimationFrame(paint);
  }

  if (!coarse) {
    button.addEventListener("pointerenter", function () {
      rainbow = true;
      if (typeof gsap !== "undefined") {
        gsap.to(noiseAmpMul, { value: 0, duration: 0.2, overwrite: true });
      } else {
        noiseAmpMul.value = 0;
      }
    });
    button.addEventListener("pointerleave", function () {
      rainbow = false;
      if (typeof gsap !== "undefined") {
        gsap.to(noiseAmpMul, { value: 1, duration: 0.2, overwrite: true });
      } else {
        noiseAmpMul.value = 1;
      }
    });
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0] ? entries[0].isIntersecting : true;
      if (visible) start();
      else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    }).observe(button);
  }

  window.addEventListener("resize", function () {
    resize();
    start();
  }, { passive: true });

  resize();
  start();
})();
