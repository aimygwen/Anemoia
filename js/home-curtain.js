/**
 * Shared ripple divider — weighted section boundary bend.
 */
(function () {
  "use strict";

  var divider = document.querySelector("[data-section-divider]");
  if (!divider) return;

  var section =
    divider.closest("[data-ripple-section]") ||
    divider.closest("[data-start-work]") ||
    divider.parentElement;
  var path = divider.querySelector(
    "[data-ripple-shape], .start-work__divider-shape"
  );
  var swapTitle = section
    ? section.querySelector("[data-ripple-swap-title]")
    : null;
  var workFrame = section
    ? section.querySelector(".start-work__frame")
    : null;
  /* Keep Creations in-flow above the cards (not fixed over them). */
  if (swapTitle && workFrame) {
    workFrame.insertBefore(swapTitle, workFrame.firstChild);
  }
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!path) return;

  var lenis = null;
  var rafId = 0;
  var lastScroll = 0;
  var sectionTop = 0;
  var lastCurtain = "";
  var lastVisibility = "";
  var scrollImpulse = 0;
  var curtainVelocity = 0;
  var bend = 0;
  var edgeVisible = true;
  var bendRunning = false;
  var idleFrames = 0;
  var lastPathPaint = 0;
  var lastPath = "";
  var lastTitleState = "";
  var BASE_Y = 8;
  var MAX_BEND = 0;
  var BEND_ENABLED = false;

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
    if (d === lastPath) return;
    path.setAttribute("d", d);
    lastPath = d;
  }

  function getScrollY() {
    return lenis && typeof lenis.scroll === "number" ? lenis.scroll : window.scrollY || 0;
  }

  function measureSection() {
    if (!section) return;
    sectionTop = section.getBoundingClientRect().top + getScrollY();
  }

  function syncScroll(time) {
    var scrollY = getScrollY();
    var vh = window.innerHeight || 1;
    var boundaryY = section ? sectionTop - scrollY : vh - scrollY;

    scrollImpulse = scrollY - lastScroll;
    lastScroll = scrollY;
    edgeVisible = boundaryY > vh * -0.2 && boundaryY < vh * 1.1;

    var visibility = boundaryY <= vh * -0.2 ? "hidden" : "visible";
    if (visibility !== lastVisibility) {
      divider.style.visibility = visibility;
      lastVisibility = visibility;
    }
    if (visibility === "hidden") return;

    var curtainY = Math.round(boundaryY - vh * (BASE_Y / 100));
    var curtainStr = "translate3d(0," + curtainY + "px,0)";

    if (curtainStr !== lastCurtain) {
      divider.style.transform = curtainStr;
      lastCurtain = curtainStr;
    }

    if (swapTitle) {
      var swapProgress = sectionTop > 0
        ? Math.max(0, Math.min(1, scrollY / sectionTop))
        : 1;
      var reveal = Math.max(0, Math.min(1, (swapProgress - 0.46) / 0.14));
      reveal = reveal * reveal * (3 - 2 * reveal);
      var titleState = swapProgress.toFixed(2) + ":" + reveal.toFixed(2);
      if (titleState !== lastTitleState) {
        swapTitle.style.setProperty("--swap-progress", swapProgress.toFixed(4));
        swapTitle.style.opacity = reveal.toFixed(4);
        lastTitleState = titleState;
      }
    }

    if (!reduced && edgeVisible && BEND_ENABLED) bendRunning = true;
  }

  function paintBend(time) {
    if (!edgeVisible || !bendRunning) return;

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

  function bendRaf(time) {
    if (!bendRunning) {
      rafId = 0;
      return;
    }

    paintBend(time);

    var active =
      Math.abs(scrollImpulse) > 0.04 ||
      Math.abs(curtainVelocity) > 0.06 ||
      Math.abs(bend) > 0.1;

    if (active) idleFrames = 0;
    else idleFrames += 1;

    if (idleFrames > 36 || !edgeVisible) {
      bendRunning = false;
      bend = 0;
      setPath(flatPath());
      rafId = 0;
      return;
    }

    rafId = requestAnimationFrame(bendRaf);
  }

  function onScroll() {
    syncScroll(performance.now());
    if (reduced || !edgeVisible || !BEND_ENABLED) return;
    idleFrames = 0;
    bendRunning = true;
    if (!rafId) rafId = requestAnimationFrame(bendRaf);
  }

  function attach(scroller) {
    lenis = scroller || null;
    lastScroll = getScrollY();
    measureSection();
    setPath(flatPath());
    syncScroll(0);

    if (lenis && typeof lenis.on === "function") {
      lenis.on("scroll", onScroll);
    } else {
      window.addEventListener("scroll", onScroll, { passive: true });
    }
  }

  function boot() {
    if (window.__lenis) {
      attach(window.__lenis);
      return;
    }
    var tries = 0;
    (function wait() {
      if (window.__lenis) {
        attach(window.__lenis);
        return;
      }
      if (++tries > 60) {
        attach(null);
        return;
      }
      requestAnimationFrame(wait);
    })();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  window.addEventListener("resize", function () {
    measureSection();
    syncScroll(0);
  }, { passive: true });

  window.addEventListener("load", function () {
    measureSection();
    syncScroll(0);
  }, { once: true });

  window.addEventListener("pagehide", function () {
    if (rafId) cancelAnimationFrame(rafId);
  }, { once: true });
})();
