/**
 * menu-coin-rings.js — Chiara-style burger canvas (dual rings + lines → X).
 * Renderer only — open/close driven by polykroma.js (playOpen / playClose).
 */
(function (global) {
  "use strict";

  var DURATION = 1.2;
  var EASE = "power4.inOut";

  var api = {
    boot: boot,
    playOpen: playOpen,
    playClose: playClose,
  };

  var hitIn = null;
  var hitOut = null;
  var coinButton = null;
  var reduced = false;
  var dpi = 1;
  var noise = null;
  var ctx = null;
  var canvas = null;
  var cw = 0;
  var ch = 0;
  var ringsOpen = false;
  var prevDist = 2000;

  var burgerBP = [];
  var state = {};
  var baseState = {};
  var inkMix = { value: 0 };
  var noiseAmpMul = { value: 1 };
  var inkProbeLight = null;
  var inkProbeDark = null;
  var closedSurface = "light";
  var lineW = 0;
  var lineH = 0;
  var lineA = [];
  var lineB = [];
  var lineA0 = [];
  var lineB0 = [];

  function applyBP() {
    var picked = false;
    burgerBP.forEach(function (bp) {
      if (!picked && window.innerWidth > bp.sWidth) {
        state.burgerRad = bp.burgerRad;
        state.burgerMargin = bp.burgerMargin;
        state.burgerBigRad = bp.burgerBigRad;
        state.burgerBigMargin = bp.burgerBigMargin;
        picked = true;
      }
    });
    if (!ringsOpen) {
      state.burgerMargin = baseState.burgerMargin || state.burgerMargin;
      state.burgerRad = baseState.burgerRad || state.burgerRad;
    }
    state.burgerPosition.x = cw - state.burgerMargin;
    state.burgerPosition.y = state.burgerMargin;
  }

  function resetLines() {
    lineW = 20 * dpi;
    lineH = 5 * dpi;
    lineA = [
      { value: 10 - lineW / 2 },
      { value: -lineH / 2 },
      { value: lineW / 2 },
      { value: -lineH / 2 },
    ];
    lineB = [
      { value: -lineW / 2 },
      { value: lineH / 2 },
      { value: lineW / 2 },
      { value: lineH / 2 },
    ];
    lineA0 = lineA.map(function (p) {
      return { value: p.value };
    });
    lineB0 = lineB.map(function (p) {
      return { value: p.value };
    });
  }

  function setHitStyles() {
    if (!hitIn || !hitOut) return;
    var size = (2 * state.burgerRad) / dpi;
    var inset = state.burgerMargin / (3 * dpi);
    var css =
      "position:fixed;left:auto;bottom:auto;z-index:calc(var(--pk-z, 2147483600) + 6);" +
      "width:" +
      size +
      "px;height:" +
      size +
      "px;top:" +
      inset +
      "px;right:" +
      inset +
      "px;margin:0;padding:0;";
    hitIn.style.cssText = css;
    hitOut.style.cssText = css;
    if (coinButton) {
      coinButton.style.cssText =
        "position:fixed;left:auto;bottom:auto;pointer-events:none;" +
        "width:" +
        size +
        "px;height:" +
        size +
        "px;top:" +
        inset +
        "px;right:" +
        inset +
        "px;z-index:calc(var(--pk-z, 2147483600) + 5);";
    }
  }

  function parseComputedRgb(cssColor) {
    var m = cssColor.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    if (!m) return { r: 0, g: 0, b: 0 };
    return { r: +m[1], g: +m[2], b: +m[3] };
  }

  function readChromeInks() {
    if (!inkProbeLight || !inkProbeDark) {
      return {
        onLight: { r: 0, g: 0, b: 0 },
        onDark: { r: 242, g: 240, b: 248 },
      };
    }
    return {
      onLight: parseComputedRgb(getComputedStyle(inkProbeLight).color),
      onDark: parseComputedRgb(getComputedStyle(inkProbeDark).color),
    };
  }

  function inkForSurface(surface) {
    var inks = readChromeInks();
    return surface === "dark" ? inks.onDark : inks.onLight;
  }

  function measureMenuSurface() {
    var x = state.burgerPosition.x / dpi;
    var y = state.burgerPosition.y / dpi;
    if (
      global.Polykroma &&
      typeof global.Polykroma.chromeSurfaceAtPoint === "function"
    ) {
      return global.Polykroma.chromeSurfaceAtPoint(x, y, {
        skipHeader: true,
        skipMenuUi: !ringsOpen,
      });
    }
    return "light";
  }

  function strokeColorNow() {
    var closed = inkForSurface(closedSurface);
    var open = inkForSurface("light");
    var m = inkMix.value;
    return {
      r: Math.round(closed.r * (1 - m) + open.r * m),
      g: Math.round(closed.g * (1 - m) + open.g * m),
      b: Math.round(closed.b * (1 - m) + open.b * m),
    };
  }

  function resizeCanvas() {
    if (!canvas) return;
    cw = canvas.width = Math.max(1, Math.round(window.innerWidth * dpi));
    ch = canvas.height = Math.max(1, Math.round(window.innerHeight * dpi));
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    applyBP();
    resetLines();
    if (!ringsOpen) {
      baseState = {
        burgerRad: state.burgerRad,
        burgerMargin: state.burgerMargin,
        burgerBigRad: state.burgerBigRad,
        burgerBigMargin: state.burgerBigMargin,
      };
    }
  }

  function draw() {
    if (!ctx) return;
    if (!ringsOpen) {
      closedSurface = measureMenuSurface();
    }
    var stroke = strokeColorNow();

    ctx.clearRect(0, 0, cw, ch);
    ctx.lineWidth = dpi;
    ctx.lineCap = "round";

    for (var t = 0; t < state.circleNumber; t += 1) {
      ctx.beginPath();
      for (var a = 0; a < Math.PI * 2; a += (Math.PI * 2) / 50) {
        var nx = Math.cos(a);
        var ny = Math.sin(a);
        var n = noise.noise3D(
          nx * state.noiseDetail,
          ny * state.noiseDetail,
          Date.now() * state.noiseSpeed + t
        );
        var rad =
          state.burgerRad + n * state.noiseAmplitude * noiseAmpMul.value;
        var px = nx * rad + state.burgerPosition.x;
        var py = ny * rad + state.burgerPosition.y;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      var alpha = t === 0 ? 0.6 : 1;
      ctx.strokeStyle =
        "rgba(" +
        stroke.r +
        "," +
        stroke.g +
        "," +
        stroke.b +
        "," +
        alpha +
        ")";
      ctx.stroke();
    }

    ctx.strokeStyle = "rgb(" + stroke.r + "," + stroke.g + "," + stroke.b + ")";

    ctx.beginPath();
    ctx.moveTo(
      lineA[0].value + state.burgerPosition.x,
      lineA[1].value + state.burgerPosition.y
    );
    ctx.lineTo(
      lineA[2].value + state.burgerPosition.x,
      lineA[3].value + state.burgerPosition.y
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(
      lineB[0].value + state.burgerPosition.x,
      lineB[1].value + state.burgerPosition.y
    );
    ctx.lineTo(
      lineB[2].value + state.burgerPosition.x,
      lineB[3].value + state.burgerPosition.y
    );
    ctx.stroke();

    setHitStyles();
    if (!reduced) requestAnimationFrame(draw);
  }

  function morphLinesOpen() {
    if (typeof gsap === "undefined" || reduced) {
      lineA[0].value = -lineW / 2;
      lineA[1].value = lineW / 2;
      lineA[2].value = lineW / 2;
      lineA[3].value = -lineW / 2;
      lineB[0].value = -lineW / 2;
      lineB[1].value = -lineW / 2;
      lineB[2].value = lineW / 2;
      lineB[3].value = lineW / 2;
      return;
    }
    gsap.to(lineA[0], { value: -lineW / 2, duration: DURATION, ease: EASE });
    gsap.to(lineA[1], { value: lineW / 2, duration: DURATION, ease: EASE });
    gsap.to(lineA[2], { value: lineW / 2, duration: DURATION, ease: EASE });
    gsap.to(lineA[3], { value: -lineW / 2, duration: DURATION, ease: EASE });
    gsap.to(lineB[0], { value: -lineW / 2, duration: DURATION, ease: EASE });
    gsap.to(lineB[1], { value: -lineW / 2, duration: DURATION, ease: EASE });
    gsap.to(lineB[2], { value: lineW / 2, duration: DURATION, ease: EASE });
    gsap.to(lineB[3], { value: lineW / 2, duration: DURATION, ease: EASE });
  }

  function morphLinesClose() {
    if (typeof gsap === "undefined" || reduced) {
      lineA.forEach(function (p, i) {
        p.value = lineA0[i].value;
      });
      lineB.forEach(function (p, i) {
        p.value = lineB0[i].value;
      });
      return;
    }
    lineA.forEach(function (p, i) {
      gsap.to(p, { value: lineA0[i].value, duration: DURATION, ease: EASE });
    });
    lineB.forEach(function (p, i) {
      gsap.to(p, { value: lineB0[i].value, duration: DURATION, ease: EASE });
    });
  }

  function playOpen() {
    if (ringsOpen) return;
    ringsOpen = true;
    state.burgerMargin = state.burgerBigMargin;

    if (typeof gsap === "undefined" || reduced) {
      inkMix.value = 1;
      state.burgerRad = state.burgerBigRad;
      state.burgerPosition.x = cw - state.burgerMargin;
      state.burgerPosition.y = state.burgerMargin;
      morphLinesOpen();
      draw();
      return;
    }

    gsap.to(state.burgerPosition, {
      x: cw - state.burgerMargin,
      y: state.burgerMargin,
      duration: DURATION,
      ease: EASE,
    });
    gsap.to(inkMix, { value: 1, duration: DURATION, ease: EASE });
    gsap.to(state, {
      burgerRad: state.burgerBigRad,
      duration: DURATION,
      ease: EASE,
    });
    morphLinesOpen();
  }

  function playClose() {
    if (!ringsOpen) return;
    ringsOpen = false;

    window.setTimeout(function () {
      state.burgerMargin = baseState.burgerMargin;

      if (typeof gsap === "undefined" || reduced) {
        inkMix.value = 0;
        state.burgerRad = baseState.burgerRad;
        state.burgerPosition.x = cw - state.burgerMargin;
        state.burgerPosition.y = state.burgerMargin;
        morphLinesClose();
        draw();
        return;
      }

      gsap.to(state.burgerPosition, {
        x: cw - state.burgerMargin,
        y: state.burgerMargin,
        duration: DURATION,
        ease: EASE,
      });
      gsap.to(inkMix, { value: 0, duration: DURATION, ease: EASE });
      gsap.to(state, {
        burgerRad: baseState.burgerRad,
        duration: DURATION,
        ease: EASE,
      });
      morphLinesClose();
    }, 500);
  }

  function boot(opts) {
    if (!opts || !opts.menuRoot) return;

    hitIn = opts.hitIn;
    hitOut = opts.hitOut;
    coinButton = opts.coinButton;
    reduced = !!opts.reducedMotion;

    if (typeof SimplexNoise === "undefined") {
      console.warn("[menu-coin-rings] SimplexNoise required");
      return;
    }

    dpi = Math.min(window.devicePixelRatio || 1, 2);
    noise = new SimplexNoise();

    burgerBP = [
      {
        sWidth: 1920,
        burgerRad: 60 * dpi,
        burgerMargin: 100 * dpi,
        burgerBigRad: 90 * dpi,
        burgerBigMargin: 140 * dpi,
      },
      {
        sWidth: 991,
        burgerRad: 48 * dpi,
        burgerMargin: 90 * dpi,
        burgerBigRad: 80 * dpi,
        burgerBigMargin: 120 * dpi,
      },
      {
        sWidth: 479,
        burgerRad: 30 * dpi,
        burgerMargin: 50 * dpi,
        burgerBigRad: 60 * dpi,
        burgerBigMargin: 100 * dpi,
      },
      {
        sWidth: 0,
        burgerRad: 30 * dpi,
        burgerMargin: 50 * dpi,
        burgerBigRad: 60 * dpi,
        burgerBigMargin: 100 * dpi,
      },
    ];

    state = {
      burgerRad: 40,
      burgerMargin: 60,
      burgerBigRad: 80,
      burgerBigMargin: 120,
      burgerPosition: { x: 0, y: 0 },
      circleNumber: 2,
      noiseAmplitude: 5,
      noiseDetail: 0.5,
      noiseSpeed: 0.001,
    };

    var stage = opts.menuRoot.querySelector(".pk-coin-rings-stage");
    canvas = stage && stage.querySelector(".pk-coin-rings__canvas");
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    if (!ctx) return;

    var inkProbe = document.createElement("div");
    inkProbe.setAttribute("aria-hidden", "true");
    inkProbe.style.cssText =
      "position:fixed;left:-9999px;top:0;visibility:hidden;pointer-events:none;";
    inkProbeLight = document.createElement("span");
    inkProbeLight.style.color = "var(--aimy-chrome-ink-on-light)";
    inkProbeDark = document.createElement("span");
    inkProbeDark.style.color = "var(--aimy-chrome-ink-on-dark)";
    inkProbe.appendChild(inkProbeLight);
    inkProbe.appendChild(inkProbeDark);
    document.body.appendChild(inkProbe);

    document.body.classList.add("pk-menu-rings-chiara");
    resizeCanvas();
    setHitStyles();

    if (!window.matchMedia("(pointer: coarse)").matches) {
      window.addEventListener(
        "mousemove",
        function (e) {
          if (ringsOpen) return;
          var mx = e.clientX * dpi;
          var my = e.clientY * dpi;
          var dist = Math.hypot(
            state.burgerPosition.x - mx,
            state.burgerPosition.y - my
          );
          if (dist <= state.burgerRad && prevDist > state.burgerRad) {
            if (typeof gsap !== "undefined") {
              gsap.to(noiseAmpMul, { value: 0, duration: 0.2, overwrite: true });
            } else {
              noiseAmpMul.value = 0;
            }
          }
          if (dist >= state.burgerRad && prevDist < state.burgerRad) {
            if (typeof gsap !== "undefined") {
              gsap.to(noiseAmpMul, { value: 1, duration: 0.2, overwrite: true });
            } else {
              noiseAmpMul.value = 1;
            }
          }
          prevDist = dist;
        },
        { passive: true }
      );
    }

    window.addEventListener(
      "resize",
      function () {
        resizeCanvas();
        if (!ringsOpen) {
          inkMix.value = 0;
          morphLinesClose();
        }
      },
      { passive: true }
    );

    if (reduced) draw();
    else requestAnimationFrame(draw);
  }

  global.AimyMenuCoinRings = api;
})(window);
