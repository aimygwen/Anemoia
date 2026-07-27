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
  var cards = Array.prototype.slice.call(document.querySelectorAll(".about-card"));
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;

  var lenis = null;
  var rafId = 0;
  var lastReveal = "";
  var lastCurtain = "";
  var lastSceneY = "";
  var lastHeroLayer = "";
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
  var noteImpulse = 0;
  var curtainVelocity = 0;
  var bend = 0;
  var edgeVisible = true;
  var bendRunning = false;
  var polaroidRunning = true;
  var notesRunning = true;
  var idleFrames = 0;
  var lastPathPaint = 0;
  var lastPointerPaint = 0;
  var lastPolaroidPaint = 0;
  var lastNotesPaint = 0;
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

  /* One paper note — slow scroll bob + cursor tilt for depth */
  var notes = cards.map(function (el) {
    return {
      el: el,
      lag: 0.05,
      y: 0,
      vy: 0,
      rot: 0,
      vrot: 0,
      tx: 0,
      ty: 0,
      impulse: 0,
    };
  });

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
    return lenis && typeof lenis.scroll === "number" ? lenis.scroll : window.scrollY || 0;
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
    var sceneY = Math.max(-80, Math.round(-Math.max(0, scrollY - transitionLength) * 0.06));
    var revealStr = reveal.toFixed(3);
    var curtainStr = "translate3d(0," + curtainY + "px,0)";
    var sceneStr = sceneY + "px";

    var delta = scrollY - lastScroll;
    scrollImpulse = delta;
    polaroidImpulse += Math.max(-40, Math.min(40, delta));
    noteImpulse += Math.max(-28, Math.min(28, delta));
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
    if (revealStr !== lastReveal) {
      root.style.setProperty("--menu-reveal", revealStr);
      lastReveal = revealStr;
    }
    if (underlay) underlay.style.opacity = "1";

    var heroLayer = eased > 0.08 ? "front" : "back";
    if (hero && heroLayer !== lastHeroLayer) {
      hero.classList.toggle("is-above-curtain", heroLayer === "front");
      lastHeroLayer = heroLayer;
    }

    if (!reduced) {
      if (edgeVisible) bendRunning = true;
      polaroidRunning = true;
      notesRunning = true;
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

  function paintNotes(time) {
    if (reduced || !notes.length) return;
    if (!notesRunning && !finePointer) return;
    if (time - lastNotesPaint < 20) return;
    lastNotesPaint = time;

    var speed = noteImpulse;
    noteImpulse *= 0.9;

    var anyActive = Math.abs(speed) > 0.12 || finePointer;
    var i;
    for (i = 0; i < notes.length; i++) {
      var n = notes[i];

      /* Slow scroll bob — translate/rotate only */
      n.impulse += (speed - n.impulse) * 0.05;
      n.impulse *= 0.94;

      var targetY = n.impulse * -0.12;
      n.vy = (n.vy + (targetY - n.y) * n.lag) * 0.92;
      n.y += n.vy;
      n.y = Math.max(-14, Math.min(12, n.y));

      var targetRot = n.impulse * 0.014;
      n.vrot = (n.vrot + (targetRot - n.rot) * n.lag) * 0.92;
      n.rot += n.vrot;
      n.rot = Math.max(-1.6, Math.min(1.6, n.rot));

      /* Cursor tilt — soft paper depth */
      if (finePointer) {
        n.tx += (rendered.x - n.tx) * n.lag * 0.5;
        n.ty += (rendered.y - n.ty) * n.lag * 0.5;
      } else {
        n.tx *= 0.9;
        n.ty *= 0.9;
      }

      if (Math.abs(n.impulse) < 0.15) {
        n.y += (0 - n.y) * 0.03;
        n.rot += (0 - n.rot) * 0.03;
      }

      var rx = n.ty * -4.5;
      var ry = n.tx * 5.5;

      n.el.style.setProperty("--note-y", n.y.toFixed(2) + "px");
      n.el.style.setProperty("--note-x", "0px");
      n.el.style.setProperty("--note-rot", n.rot.toFixed(2) + "deg");
      n.el.style.setProperty("--note-rx", rx.toFixed(2) + "deg");
      n.el.style.setProperty("--note-ry", ry.toFixed(2) + "deg");

      if (Math.abs(n.y) > 0.12 || Math.abs(n.vy) > 0.06 || Math.abs(n.tx) > 0.02 || Math.abs(n.ty) > 0.02) {
        anyActive = true;
      }
    }

    notesRunning = anyActive || Math.abs(noteImpulse) > 0.08 || finePointer;
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
    paintNotes(time);

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
  root.style.setProperty("--mx", "0");
  root.style.setProperty("--my", "0");
  root.style.setProperty("--polaroid-y", "0px");
  root.style.setProperty("--polaroid-x", "0px");
  root.style.setProperty("--polaroid-rot", "0deg");
  root.style.setProperty("--polaroid-skew", "0deg");
  root.style.setProperty("--polaroid-stretch", "1");
  root.style.setProperty("--polaroid-squash", "1");
  setPath(flatPath());
  syncScroll();
  if (!reduced) rafId = requestAnimationFrame(raf);

  window.addEventListener("pagehide", function () {
    if (rafId) cancelAnimationFrame(rafId);
    if (window.Polyglide) {
      window.Polyglide.destroy();
      lenis = null;
    }
  }, { once: true });
})();
