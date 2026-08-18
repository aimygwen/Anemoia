/**
 * About — weighted Lenis scroll + heavy middle-drag curtain bend
 * + bouncy polaroid exit with velocity stretch/bend.
 */
(function () {
  "use strict";

  var root = document.querySelector(".about");
  if (!root) return;

  var curtain = document.querySelector(".scroll-curtain");
  var curtainPath = document.querySelector(".scroll-curtain__shape");
  var underlay = document.querySelector(".about-underlay");
  var polaroid = underlay && underlay.querySelector("img");
  var hero = document.querySelector(".about-hero");
  var hudStack = document.querySelector("[data-about-hud-stack]");
  var hudIntro = document.querySelector(".ins-intro");
  var hudCanvas = document.querySelector("[data-about-hud-canvas]");
  var hudPixelWrap = document.querySelector("[data-about-hud-pixel]");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;

  var lenis = null;
  var rafId = 0;
  var lastReveal = "";
  var lastHudPin = "";
  var lastCurtain = "";
  var lastSceneY = "";
  var lastHeroMarkY = "";
  var lastMx = "";
  var lastMy = "";
  var lastPolaroidY = "";
  var lastPolaroidX = "";
  var lastPolaroidRot = "";
  var lastPolaroidSkew = "";
  var lastPolaroidStretch = "";
  var lastPolaroidSquash = "";
  var lastScroll = window.scrollY || 0;
  var scrollImpulse = 0;
  var polaroidImpulse = 0;
  var curtainVelocity = 0;
  var bend = 0;
  var edgeVisible = true;
  var bendRunning = false;
  var polaroidRunning = true;
  var idleFrames = 0;
  var lastPathPaint = 0;
  var lastPointerPaint = 0;
  var lastPolaroidPaint = 0;
  var lastPath = "";
  var BASE_Y = 8;
  var MAX_BEND = 16;
  var pointer = { x: 0, y: 0 };
  var rendered = { x: 0, y: 0 };

  /* Polaroid motion state */
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
  var polProgress = 0;
  var hudPixelVisible = false;
  var hudPixelAnimId = 0;
  var hudPixelWaitId = 0;
  var HUD_REVEAL_ON = 0.08;
  var HUD_REVEAL_OFF = 0.04;
  var hudOffscreen = null;
  var HUD_W = 933;
  var HUD_H = 238;
  var HUD_PIXEL_SIZES = [40, 32, 26, 20, 16, 13, 10, 8, 6, 5, 4, 3, 2, 1];
  var hudImages = { hud: null, hp: null, ready: 0, loaded: false };

  function bindHudImage(img, key) {
    if (!img) return;
    function assign() {
      hudImages[key] = img;
      hudImages.ready += 1;
      if (hudImages.ready >= 2) hudImages.loaded = true;
    }
    if (img.complete && img.naturalWidth) assign();
    else img.addEventListener("load", assign, { once: true });
  }

  function resizeHudCanvas() {
    if (!hudCanvas || !hudPixelWrap) return null;
    var width = Math.max(1, Math.round(hudPixelWrap.clientWidth));
    var height = Math.max(1, Math.round(width * (HUD_H / HUD_W)));
    if (hudCanvas.width !== width || hudCanvas.height !== height) {
      hudCanvas.width = width;
      hudCanvas.height = height;
    }
    return { width: width, height: height };
  }

  function drawHudPixelFrame(blockSize) {
    if (!hudCanvas || !hudImages.hud || !hudImages.hp) return;
    var size = resizeHudCanvas();
    if (!size) return;

    var ctx = hudCanvas.getContext("2d");
    if (!ctx) return;

    var cols = Math.max(1, Math.ceil(size.width / blockSize));
    var rows = Math.max(1, Math.ceil(size.height / blockSize));

    if (!hudOffscreen) hudOffscreen = document.createElement("canvas");
    if (hudOffscreen.width !== cols || hudOffscreen.height !== rows) {
      hudOffscreen.width = cols;
      hudOffscreen.height = rows;
    }

    var octx = hudOffscreen.getContext("2d");
    if (!octx) return;

    octx.imageSmoothingEnabled = false;
    octx.clearRect(0, 0, cols, rows);
    octx.drawImage(hudImages.hud, 0, 0, cols, rows);
    octx.drawImage(hudImages.hp, 0, 0, cols, rows);

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size.width, size.height);
    ctx.drawImage(hudOffscreen, 0, 0, cols, rows, 0, 0, size.width, size.height);
  }

  function resetHudPixel() {
    if (!hudStack) return;
    if (hudPixelAnimId) {
      cancelAnimationFrame(hudPixelAnimId);
      hudPixelAnimId = 0;
    }
    if (hudPixelWaitId) {
      window.clearInterval(hudPixelWaitId);
      hudPixelWaitId = 0;
    }
    hudStack.classList.remove("is-pixel-reveal", "is-pixel-done");
  }

  function finishHudPixelReveal() {
    if (!hudStack) return;
    drawHudPixelFrame(1);
    hudStack.classList.add("is-pixel-done");
    hudStack.classList.remove("is-pixel-reveal");
    hudPixelAnimId = 0;
  }

  function runHudDepixelate() {
    if (!hudStack || !hudCanvas || !hudImages.loaded) return;

    if (hudPixelAnimId) cancelAnimationFrame(hudPixelAnimId);

    var sizes = HUD_PIXEL_SIZES;
    var duration = 1200;
    var stepMs = duration / sizes.length;
    var start = 0;
    var step = -1;

    hudStack.classList.remove("is-pixel-done");
    hudStack.classList.add("is-pixel-reveal");
    drawHudPixelFrame(sizes[0]);

    function tick(now) {
      if (!hudPixelVisible) return;

      if (!start) start = now;
      var elapsed = now - start;
      var idx = Math.min(sizes.length - 1, Math.floor(elapsed / stepMs));

      if (idx !== step) {
        step = idx;
        drawHudPixelFrame(sizes[idx]);
      }

      if (elapsed < duration) hudPixelAnimId = requestAnimationFrame(tick);
      else finishHudPixelReveal();
    }

    hudPixelAnimId = requestAnimationFrame(tick);
  }

  function syncHudPixel(reveal) {
    if (!hudStack) return;

    if (reduced) {
      if (reveal >= HUD_REVEAL_ON) hudStack.classList.add("is-pixel-done");
      else hudStack.classList.remove("is-pixel-done");
      return;
    }

    if (reveal >= HUD_REVEAL_ON) {
      if (hudPixelVisible) return;
      hudPixelVisible = true;

      if (hudImages.loaded) runHudDepixelate();
      else if (!hudPixelWaitId) {
        hudPixelWaitId = window.setInterval(function () {
          if (!hudImages.loaded) return;
          window.clearInterval(hudPixelWaitId);
          hudPixelWaitId = 0;
          if (hudPixelVisible) runHudDepixelate();
        }, 40);
      }
      return;
    }

    if (reveal < HUD_REVEAL_OFF && hudPixelVisible) {
      hudPixelVisible = false;
      resetHudPixel();
    }
  }

  bindHudImage(document.querySelector(".about-lifebar__hud"), "hud");
  bindHudImage(document.querySelector(".about-lifebar__hp-base"), "hp");

  function syncAboutReveals(reveal) {
    var sheet = document.querySelector("[data-about-sheet]");
    if (!sheet || reveal < 0.04) return;

    var nodes = sheet.querySelectorAll("[data-ins-reveal]:not(.is-in)");
    if (!nodes.length) return;

    var vh = window.innerHeight || 1;
    var i;
    for (i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var rect = el.getBoundingClientRect();
      if (rect.top < vh * 0.92 && rect.bottom > vh * 0.06) {
        el.classList.add("is-in");
      }
    }
  }

  function bootAboutReveals() {
    var sheet = document.querySelector("[data-about-sheet]");
    if (!sheet) return;

    var nodes = sheet.querySelectorAll("[data-ins-reveal]");
    if (!nodes.length) return;

    if (reduced) {
      nodes.forEach(function (el) {
        el.classList.add("is-in");
      });
    }
  }

  function bootAboutSlider() {
    var sheet = document.querySelector("[data-about-sheet]");
    var sliderRoot = sheet && sheet.querySelector("[data-ins-slider]");
    if (!sliderRoot) return;

    var slides = Array.prototype.slice.call(sliderRoot.querySelectorAll(".ins-slide"));
    if (!slides.length) return;

    var countEl = sheet.querySelector("[data-ins-count]");
    var prevBtn = sheet.querySelector("[data-ins-prev]");
    var nextBtn = sheet.querySelector("[data-ins-next]");
    var index = 0;
    var total = slides.length;

    function pad(n) {
      return (n < 10 ? "0" : "") + n;
    }

    function setIndex(next) {
      index = ((next % total) + total) % total;
      slides.forEach(function (slide, i) {
        slide.classList.toggle("is-active", i === index);
      });
      if (countEl) countEl.textContent = pad(index + 1) + " / " + pad(total);
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        setIndex(index - 1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        setIndex(index + 1);
      });
    }

    setIndex(0);
  }

  function flatPath() {
    return (
      "M0 " + BASE_Y +
      " C33 " + BASE_Y + " 67 " + BASE_Y + " 100 " + BASE_Y +
      " L100 140 L0 140 Z"
    );
  }

  function bentPath(amount) {
    var mid = BASE_Y + amount;
    var shoulder = BASE_Y + amount * 0.22;
    return (
      "M0 " + shoulder.toFixed(2) +
      " C28 " + mid.toFixed(2) + " 72 " + mid.toFixed(2) + " 100 " + shoulder.toFixed(2) +
      " L100 140 L0 140 Z"
    );
  }

  function setPath(d) {
    if (!curtainPath || d === lastPath) return;
    curtainPath.setAttribute("d", d);
    lastPath = d;
  }

  function getScrollY() {
    var activeLenis = lenis || window.__lenis;
    if (activeLenis && typeof activeLenis.scroll === "number") {
      return activeLenis.scroll;
    }
    return window.scrollY || 0;
  }

  /* Soft overshoot — closer to the first bounce feel */
  function easeOutBack(t) {
    var c1 = 1.4;
    var c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function exitEase(t) {
    t = Math.max(0, Math.min(1, t));
    return easeOutBack(t);
  }

  function syncScroll() {
    var scrollY = getScrollY();
    var vh = window.innerHeight || 1;
    var transitionLength = Math.max(1, vh * 0.9);
    var progress = Math.max(0, Math.min(1, scrollY / transitionLength));
    var eased = progress * progress * (3 - 2 * progress);
    var reveal = Math.max(0, Math.min(1, (progress - 0.12) / 0.55));
    reveal = reveal * reveal * (3 - 2 * reveal);

    var curtainY = Math.round(vh * (0.92 - eased * 1.08));
    var curtainWaveY = curtainY + (BASE_Y / 140) * vh * 1.4;
    var markAnchorY = vh * 0.5;
    var markShift = Math.max(0, curtainWaveY - markAnchorY + vh * 0.1);
    markShift = Math.round(Math.min(vh * 0.42, markShift * eased));
    var sceneY = Math.max(-80, Math.round(-Math.max(0, scrollY - transitionLength) * 0.06));
    var revealStr = reveal.toFixed(3);
    var introTop = hudIntro ? hudIntro.getBoundingClientRect().top : vh * 2;
    var dockStart = vh * 0.66;
    var dockEnd = vh * 0.17;
    var hudPin = Math.max(0, Math.min(1, (dockStart - introTop) / Math.max(1, dockStart - dockEnd)));
    hudPin = hudPin * hudPin * (3 - 2 * hudPin);
    var hudPinStr = hudPin.toFixed(3);
    var curtainStr = "translate3d(0," + curtainY + "px,0)";
    var sceneStr = sceneY + "px";
    var markShiftStr = markShift + "px";

    var delta = scrollY - lastScroll;
    scrollImpulse = delta;
    polaroidImpulse += Math.max(-40, Math.min(40, delta));
    lastScroll = scrollY;
    edgeVisible = curtainY > vh * -0.1;

    /* Polaroid exit — soft lift off the top */
    polProgress = progress;
    var exitT = Math.max(0, Math.min(1, progress * 1.05));
    var lift = exitEase(exitT);
    polTargetY = -vh * lift * 1.15;

    if (curtain && curtainStr !== lastCurtain) {
      curtain.style.transform = curtainStr;
      lastCurtain = curtainStr;
    }
    if (hero && sceneStr !== lastSceneY) {
      hero.style.setProperty("--scene-y", sceneStr);
      lastSceneY = sceneStr;
    }
    if (markShiftStr !== lastHeroMarkY) {
      root.style.setProperty("--hero-mark-y", markShiftStr);
      lastHeroMarkY = markShiftStr;
    }
    if (revealStr !== lastReveal) {
      root.style.setProperty("--menu-reveal", revealStr);
      root.style.setProperty("--hero-identity", revealStr);
      syncHudPixel(parseFloat(revealStr));
      lastReveal = revealStr;
    }
    if (hudPinStr !== lastHudPin) {
      root.style.setProperty("--hud-pin", hudPinStr);
      lastHudPin = hudPinStr;
    }

    syncAboutReveals(parseFloat(revealStr || "0"));

    if (underlay) {
      var underlayOpacity = Math.max(0, 1 - parseFloat(revealStr || "0") * 1.35);
      var underlayOpacityStr = underlayOpacity.toFixed(3);
      if (underlay.style.opacity !== underlayOpacityStr) {
        underlay.style.opacity = underlayOpacityStr;
      }
    }

    if (!reduced) {
      if (edgeVisible) bendRunning = true;
      polaroidRunning = true;
    }
  }

  function paintPointer(time) {
    if (reduced || !finePointer) return;
    if (time - lastPointerPaint < 16) return;
    lastPointerPaint = time;

    rendered.x += (pointer.x - rendered.x) * 0.14;
    rendered.y += (pointer.y - rendered.y) * 0.14;
    var mx = rendered.x.toFixed(4);
    var my = rendered.y.toFixed(4);

    if (mx !== lastMx) {
      root.style.setProperty("--mx", mx);
      lastMx = mx;
    }
    if (my !== lastMy) {
      root.style.setProperty("--my", my);
      lastMy = my;
    }
  }

  function paintPolaroid(time) {
    if (reduced || !polaroid || !polaroidRunning) return;
    if (time - lastPolaroidPaint < 16) return;
    lastPolaroidPaint = time;

    var vh = window.innerHeight || 1;
    var speed = polaroidImpulse;
    polaroidImpulse *= 0.55;

    /* Soft spring — original bounce feel */
    var stiffness = 0.08;
    var damping = 0.8;
    var force = (polTargetY - polY) * stiffness;
    polVY = (polVY + force) * damping;
    polY += polVY;

    if (polY > 20) polY = 20;
    if (polY < -vh * 1.4) polY = -vh * 1.4;

    var driftTarget = polProgress * (polProgress > 0.4 ? -28 : 12) + speed * 0.2;
    polVX += (driftTarget - polX) * 0.05;
    polVX *= 0.88;
    polX += polVX;

    var rotTarget = polProgress * -10 + speed * 0.08;
    polVRot += (rotTarget - polRot) * 0.06;
    polVRot *= 0.86;
    polRot += polVRot;

    /* Mild stretch / bend from scroll speed */
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

    var yStr = polY.toFixed(2) + "px";
    var xStr = polX.toFixed(2) + "px";
    var rotStr = polRot.toFixed(2) + "deg";
    var skewStr = polSkew.toFixed(2) + "deg";
    var stretchStr = polStretch.toFixed(3);
    var squashStr = polSquash.toFixed(3);

    if (yStr !== lastPolaroidY) {
      root.style.setProperty("--polaroid-y", yStr);
      lastPolaroidY = yStr;
    }
    if (xStr !== lastPolaroidX) {
      root.style.setProperty("--polaroid-x", xStr);
      lastPolaroidX = xStr;
    }
    if (rotStr !== lastPolaroidRot) {
      root.style.setProperty("--polaroid-rot", rotStr);
      lastPolaroidRot = rotStr;
    }
    if (skewStr !== lastPolaroidSkew) {
      root.style.setProperty("--polaroid-skew", skewStr);
      lastPolaroidSkew = skewStr;
    }
    if (stretchStr !== lastPolaroidStretch) {
      root.style.setProperty("--polaroid-stretch", stretchStr);
      lastPolaroidStretch = stretchStr;
    }
    if (squashStr !== lastPolaroidSquash) {
      root.style.setProperty("--polaroid-squash", squashStr);
      lastPolaroidSquash = squashStr;
    }

    var settled =
      Math.abs(polTargetY - polY) < 0.4 &&
      Math.abs(polVY) < 0.2 &&
      Math.abs(polStretch - 1) < 0.01 &&
      Math.abs(polSkew) < 0.05 &&
      Math.abs(speed) < 0.2;

    if (settled && polProgress >= 1) polaroidRunning = false;
    if (polProgress < 1 || Math.abs(speed) > 0.2 || Math.abs(polVY) > 0.2) {
      polaroidRunning = true;
    }

    polaroid.style.visibility = polY < -vh * 1.15 ? "hidden" : "visible";
  }

  function paintBend(time) {
    if (!curtainPath || !edgeVisible || !bendRunning) return;

    curtainVelocity += (scrollImpulse - curtainVelocity) * 0.22;
    scrollImpulse *= 0.48;

    var target = Math.max(-MAX_BEND, Math.min(MAX_BEND, -curtainVelocity * 0.26));
    bend += (target - bend) * 0.2;

    if (Math.abs(bend) < 0.1 && Math.abs(curtainVelocity) < 0.1 && idleFrames > 6) {
      bend = 0;
      setPath(flatPath());
      bendRunning = false;
      return;
    }

    if (time - lastPathPaint < 20) return;
    lastPathPaint = time;
    setPath(bentPath(bend));
  }

  if (!reduced && window.Polyglide) {
    lenis = window.Polyglide.boot();
    if (lenis) lenis.on("scroll", syncScroll);
  } else {
    window.addEventListener("scroll", syncScroll, { passive: true });
  }

  function raf(time) {
    paintPointer(time);
    paintPolaroid(time);

    if (bendRunning && !reduced) {
      paintBend(time);

      var active =
        Math.abs(scrollImpulse) > 0.04 ||
        Math.abs(curtainVelocity) > 0.06 ||
        Math.abs(bend) > 0.1;

      if (active) idleFrames = 0;
      else idleFrames += 1;

      if (idleFrames > 40) {
        bendRunning = false;
        bend = 0;
        setPath(flatPath());
      }
    }

    rafId = requestAnimationFrame(raf);
  }

  if (!reduced && finePointer) {
    window.addEventListener(
      "pointermove",
      function (event) {
        var w = window.innerWidth || 1;
        var h = window.innerHeight || 1;
        pointer.x = (event.clientX / w - 0.5) * 2;
        pointer.y = (event.clientY / h - 0.5) * 2;
      },
      { passive: true }
    );
    document.documentElement.addEventListener("pointerleave", function () {
      pointer.x = 0;
      pointer.y = 0;
    });
  }

  window.addEventListener("resize", syncScroll, { passive: true });
  root.style.setProperty("--menu-reveal", "0");
  root.style.setProperty("--hero-identity", "0");
  root.style.setProperty("--hud-pin", "0");
  root.style.setProperty("--hero-mark-y", "0px");
  root.style.setProperty("--mx", "0");
  root.style.setProperty("--my", "0");
  root.style.setProperty("--polaroid-y", "0px");
  root.style.setProperty("--polaroid-x", "0px");
  root.style.setProperty("--polaroid-rot", "0deg");
  root.style.setProperty("--polaroid-skew", "0deg");
  root.style.setProperty("--polaroid-stretch", "1");
  root.style.setProperty("--polaroid-squash", "1");
  setPath(flatPath());
  bootAboutReveals();
  bootAboutSlider();
  syncScroll();
  if (!reduced) rafId = requestAnimationFrame(raf);

  window.addEventListener("pagehide", function () {
    if (rafId) cancelAnimationFrame(rafId);
    if (hudPixelAnimId) cancelAnimationFrame(hudPixelAnimId);
    if (hudPixelWaitId) window.clearInterval(hudPixelWaitId);
    if (window.Polyglide) {
      window.Polyglide.destroy();
      lenis = null;
    }
  }, { once: true });
})();
