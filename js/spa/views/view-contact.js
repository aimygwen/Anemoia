/**
 * view-contact.js — Contact view lifecycle + rotating tagline + headline fit.
 */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mountToken = 0;
  var rotateTimer = null;
  var rotateIndex = 0;
  var fitTimer = null;
  var fitHandler = null;

  var ROTATE_ITEMS = [
    { label: "Voxels.", href: "./work/hytale", aria: "View Voxels work" },
    { label: "Meshes.", href: "./work/lowpoly", aria: "View Meshes work" },
    { label: "Stills.", href: "./work/stills", aria: "View Stills work" },
    { label: "Films.", href: "./work/motion", aria: "View Films work" },
  ];

  function contactRoot() {
    return document.querySelector('[data-spa-view="contact"] [data-contact-root]');
  }

  function stopRotate() {
    if (rotateTimer) {
      window.clearInterval(rotateTimer);
      rotateTimer = null;
    }
  }

  function unbindFit() {
    if (fitHandler) {
      window.removeEventListener("resize", fitHandler);
      fitHandler = null;
    }
    if (fitTimer) {
      window.clearTimeout(fitTimer);
      fitTimer = null;
    }
  }

  function applyHeroFit(root, textEl, taglineRow, sizePx) {
    var size = sizePx + "px";
    textEl.style.fontSize = size;
    root.style.setProperty("--contact-hero-fit", size);
    root.style.setProperty("--contact-hero-base", size);
    if (taglineRow) taglineRow.style.fontSize = size;
  }

  function fitsContactHero(root, textEl, reachRow, taglineRow, width, sizePx) {
    applyHeroFit(root, textEl, taglineRow, sizePx);
    if (textEl.scrollWidth > width - 1) return false;
    if (reachRow && reachRow.scrollWidth > width) return false;
    if (taglineRow && taglineRow.scrollWidth > width) return false;
    return true;
  }

  function fitContactHero(root) {
    var line = root.querySelector(".contact-hero__line");
    var textEl = root.querySelector("[data-contact-fit-text]");
    var reachRow = root.querySelector(".contact-hero__row--reach");
    var taglineRow = root.querySelector(".contact-hero__row--tagline");
    if (!line || !textEl) return;

    textEl.style.fontSize = "";
    if (taglineRow) taglineRow.style.fontSize = "";
    root.style.removeProperty("--contact-hero-fit");
    root.style.removeProperty("--contact-hero-base");

    var width = line.clientWidth;
    if (!width) return;

    var min = 12;
    var max = 240;
    var best = min;

    while (min <= max) {
      var mid = Math.floor((min + max) / 2);
      if (fitsContactHero(root, textEl, reachRow, taglineRow, width, mid)) {
        best = mid;
        min = mid + 1;
      } else {
        max = mid - 1;
      }
    }

    while (best > 12 && !fitsContactHero(root, textEl, reachRow, taglineRow, width, best)) {
      best -= 1;
    }

    applyHeroFit(root, textEl, taglineRow, best);
    fitRotateSlot(root);
  }

  function fitRotateSlot(root) {
    var sizer = root.querySelector("[data-contact-rotate-sizer]");
    if (!sizer) return;

    var widest = ROTATE_ITEMS[0].label;
    var maxWidth = 0;
    var i;

    for (i = 0; i < ROTATE_ITEMS.length; i++) {
      sizer.textContent = ROTATE_ITEMS[i].label;
      if (sizer.offsetWidth > maxWidth) {
        maxWidth = sizer.offsetWidth;
        widest = ROTATE_ITEMS[i].label;
      }
    }

    sizer.textContent = widest;
  }

  function scheduleFit(root) {
    unbindFit();
    fitHandler = function () {
      window.clearTimeout(fitTimer);
      fitTimer = window.setTimeout(function () {
        fitContactHero(root);
      }, 120);
    };
    window.addEventListener("resize", fitHandler, { passive: true });

    function run() {
      fitContactHero(root);
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(run).catch(run);
    } else {
      run();
    }

    requestAnimationFrame(function () {
      requestAnimationFrame(run);
    });
  }

  function setRotateWord(wordEl, item) {
    if (!wordEl || !item) return;
    wordEl.textContent = item.label;
    wordEl.href = item.href;
    wordEl.setAttribute("aria-label", item.aria);
    wordEl.classList.remove("is-out");
    wordEl.classList.add("is-in");
  }

  function bootRotate(root) {
    stopRotate();
    if (reduced) return;

    var wordEl = root.querySelector("[data-contact-rotate-word]");
    if (!wordEl) return;

    rotateIndex = 0;
    setRotateWord(wordEl, ROTATE_ITEMS[0]);

    rotateTimer = window.setInterval(function () {
      wordEl.classList.remove("is-in");
      wordEl.classList.add("is-out");

      window.setTimeout(function () {
        rotateIndex = (rotateIndex + 1) % ROTATE_ITEMS.length;
        setRotateWord(wordEl, ROTATE_ITEMS[rotateIndex]);
      }, 280);
    }, 3200);
  }

  function bootContact(root) {
    scheduleFit(root);
    bootRotate(root);
    root.classList.add("is-ready");
  }

  window.SpaPages = window.SpaPages || {};

  window.SpaPages.contact = {
    mount: function () {
      mountToken++;
      var token = mountToken;
      var root = contactRoot();
      if (!root) return;

      root.classList.remove("is-ready");
      stopRotate();
      unbindFit();

      var wordEl = root.querySelector("[data-contact-rotate-word]");
      setRotateWord(wordEl, ROTATE_ITEMS[0]);

      if (reduced) {
        fitContactHero(root);
        root.classList.add("is-ready");
        return;
      }

      requestAnimationFrame(function () {
        if (token !== mountToken) return;
        requestAnimationFrame(function () {
          if (token !== mountToken) return;
          bootContact(root);
        });
      });

      window.setTimeout(function () {
        if (token !== mountToken) return;
        if (!root.classList.contains("is-ready")) bootContact(root);
      }, 48);
    },
    unmount: function () {
      mountToken++;
      stopRotate();
      unbindFit();
      var root = contactRoot();
      if (!root) return;
      root.classList.remove("is-ready");
      root.style.removeProperty("--contact-hero-fit");
      root.style.removeProperty("--contact-hero-base");
      var line = root.querySelector(".contact-hero__line-text");
      if (line) line.style.fontSize = "";
      var taglineRow = root.querySelector(".contact-hero__row--tagline");
      if (taglineRow) taglineRow.style.fontSize = "";
    },
  };
})();
