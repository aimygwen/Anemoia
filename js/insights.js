/**
 * insights.js — Behind the Madness case study runtime (SPA + standalone).
 */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lenis = null;
  var revealObserver = null;
  var logoFocusCleanup = null;
  var signatureTween = null;
  var deckHoloCleanup = null;
  var nextHoloCleanup = null;
  var wordmarkHoloCleanup = null;
  var activeRoot = null;
  var SIGNATURE_SVG = "./assets/polykroma/branding/signature.svg?v=branding-10";
  var SIGNATURE_STROKES = ["G", "w", "en", "stroke", "Dot", "Bun"];

  function insightsRoot(root) {
    if (root) return root;
    return document.querySelector('[data-spa-view="insights"] #insights-page-content') ||
      document.getElementById("insights-page-content");
  }

  function bootLenis() {
    if (!window.Polyglide) return null;
    lenis = window.Polyglide.boot();
    if (lenis && typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
      lenis.on("scroll", ScrollTrigger.update);
    }
    return lenis;
  }

  function bootReveals(scope) {
    if (!scope) return;
    var nodes = scope.querySelectorAll("[data-ins-reveal]");
    if (!nodes.length) return;

    if (reduced || !("IntersectionObserver" in window)) {
      nodes.forEach(function (el) {
        el.classList.add("is-in");
      });
      return;
    }

    if (revealObserver) {
      revealObserver.disconnect();
    }

    revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          revealObserver.unobserve(entry.target);
        });
      },
      { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );

    nodes.forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  function bootSlider(root) {
    var track = root.querySelector("[data-ins-slider]");
    if (!track) return;

    var slides = Array.prototype.slice.call(track.querySelectorAll(".ins-slide"));
    if (!slides.length) return;

    var countEl = root.querySelector("[data-ins-count]");
    var prevBtn = root.querySelector("[data-ins-prev]");
    var nextBtn = root.querySelector("[data-ins-next]");
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

  function bootScrollLink(root) {
    var link = root.querySelector(".ins-scroll");
    if (!link) return;
    link.addEventListener("click", function (e) {
      var href = link.getAttribute("href") || "";
      if (href.charAt(0) !== "#") return;
      var target = root.querySelector(href) || document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      if (lenis && typeof lenis.scrollTo === "function") {
        lenis.scrollTo(target, { offset: 0 });
      } else {
        target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
      }
    });
  }

  function signaturePaths(svg) {
    return SIGNATURE_STROKES.map(function (id) {
      if (id === "Bun") {
        var bun = svg.querySelector("#Bun path");
        return bun || null;
      }
      return svg.querySelector("#" + id);
    }).filter(Boolean);
  }

  function prepSignaturePath(path) {
    var len = path.getTotalLength();
    path.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = String(len);
    return len;
  }

  function revealSignaturePaths(paths) {
    paths.forEach(function (path) {
      path.style.strokeDashoffset = "0";
    });
  }

  function animateSignatureDraw(section, paths) {
    if (!paths.length) return;

    if (reduced) {
      revealSignaturePaths(paths);
      section.classList.add("is-drawn");
      return;
    }

    var lengths = paths.map(prepSignaturePath);
    section.classList.remove("is-drawn");

    if (typeof gsap === "undefined") {
      revealSignaturePaths(paths);
      section.classList.add("is-drawn");
      return;
    }

    if (signatureTween && signatureTween.kill) signatureTween.kill();

    signatureTween = gsap.timeline({
      delay: 0.2,
      onComplete: function () {
        section.classList.add("is-drawn");
      },
    });

    paths.forEach(function (path, index) {
      var len = lengths[index] || path.getTotalLength();
      var duration = Math.min(1.15, Math.max(0.1, len / 360));
      signatureTween.to(
        path,
        {
          strokeDashoffset: 0,
          duration: duration,
          ease: "none",
        },
        index === 0 ? 0 : "+=0.05"
      );
    });
  }

  function bootSignatureDraw(root) {
    var section = root.querySelector(".ins-signature");
    var host = root.querySelector("[data-ins-signature]");
    if (!section || !host || host.dataset.sigLoaded === "1") return;

    fetch(SIGNATURE_SVG)
      .then(function (res) {
        if (!res.ok) throw new Error("signature fetch failed");
        return res.text();
      })
      .then(function (markup) {
        if (activeRoot !== root) return;
        host.innerHTML = markup;
        host.dataset.sigLoaded = "1";

        var svg = host.querySelector("svg");
        if (!svg) return;
        svg.classList.add("ins-signature__svg");
        svg.setAttribute("role", "presentation");
        svg.setAttribute("focusable", "false");

        animateSignatureDraw(section, signaturePaths(svg));
      })
      .catch(function () {
        /* Fail quietly — hero still reads fine without the draw. */
      });
  }

  function resetSignatureDraw(root) {
    if (signatureTween && signatureTween.kill) {
      signatureTween.kill();
      signatureTween = null;
    }
    if (!root) return;
    var section = root.querySelector(".ins-signature");
    var host = root.querySelector("[data-ins-signature]");
    if (section) section.classList.remove("is-drawn");
    if (host) {
      host.innerHTML = "";
      host.removeAttribute("data-sig-loaded");
    }
  }

  function bootLogoFocus(root) {
    var section = root.querySelector("[data-ins-logo-focus]");
    var pinHost = section && section.querySelector("[data-ins-logo-pin] .ins-logo-pin-inner");
    if (!pinHost) {
      pinHost = section && section.querySelector("[data-ins-logo-pin]");
    }
    var headerBrand = document.querySelector(".site-header[data-aimy-chrome] .brand");
    var headerMark = headerBrand && headerBrand.querySelector(".brand-mark");
    if (!section || !pinHost || !headerMark) return;

    var clone = headerMark.cloneNode(true);
    clone.classList.add("ins-logo-pin-mark");
    clone.removeAttribute("width");
    clone.removeAttribute("height");
    clone.removeAttribute("data-charm-stack-ready");
    pinHost.innerHTML = "";
    pinHost.appendChild(clone);

    if (window.AimyCharmGlass) {
      if (typeof window.AimyCharmGlass.prepareMarkStack === "function") {
        window.AimyCharmGlass.prepareMarkStack(clone);
      }
      if (typeof window.AimyCharmGlass.glassifyHost === "function") {
        window.AimyCharmGlass.glassifyHost(pinHost);
      }
    }

    if (window.AimyBrandEyes) {
      window.AimyBrandEyes.register(clone);
      window.AimyBrandEyes.remeasure();
    }

    if (reduced) {
      section.classList.add("is-logo-in");
      return;
    }

    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      section.classList.add("is-logo-in");
      headerBrand.classList.add("is-logo-blurred");
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    function setInView(on) {
      section.classList.toggle("is-logo-in", on);
      headerBrand.classList.toggle("is-logo-blurred", on);
      if (on && window.AimyBrandEyes) {
        window.AimyBrandEyes.remeasure();
        window.AimyBrandEyes.nudge();
      }
    }

    var st = ScrollTrigger.create({
      trigger: section,
      start: "top 55%",
      end: "bottom top",
      onEnter: function () {
        setInView(true);
      },
      onEnterBack: function () {
        setInView(true);
      },
      onLeave: function () {
        setInView(false);
      },
      onLeaveBack: function () {
        setInView(false);
      },
    });

    var eyeSt = ScrollTrigger.create({
      trigger: section.querySelector(".ins-logo-track") || section,
      start: "top bottom",
      end: "bottom top",
      onUpdate: function () {
        if (section.classList.contains("is-logo-in") && window.AimyBrandEyes) {
          window.AimyBrandEyes.remeasure();
        }
      },
    });

    logoFocusCleanup = function () {
      st.kill();
      eyeSt.kill();
      setInView(false);
      pinHost.innerHTML = "";
    };
  }

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
    var enableTilt = options.tilt !== false;
    var target = { x: 0, y: 0 };
    var current = { x: 0, y: 0 };
    var rafId = 0;
    var hovering = false;

    function applyPointer(px, py, opacity) {
      var centerX = px - 50;
      var centerY = py - 50;
      var fromCenter = holoClamp(Math.sqrt(centerY * centerY + centerX * centerX) / 50, 0, 1);

      surface.style.setProperty("--pointer-x", px + "%");
      surface.style.setProperty("--pointer-y", py + "%");
      surface.style.setProperty("--pointer-from-center", fromCenter.toFixed(3));
      surface.style.setProperty("--pointer-from-top", (py / 100).toFixed(3));
      surface.style.setProperty("--pointer-from-left", (px / 100).toFixed(3));
      surface.style.setProperty("--background-x", holoAdjust(px, 0, 100, 37, 63).toFixed(1) + "%");
      surface.style.setProperty("--background-y", holoAdjust(py, 0, 100, 33, 67).toFixed(1) + "%");
      surface.style.setProperty("--card-opacity", String(opacity));
    }

    function paintTilt() {
      if (enableTilt) {
        current.x += (target.x - current.x) * 0.22;
        current.y += (target.y - current.y) * 0.22;
        tiltEl.style.setProperty("--ins-tilt-x", current.x.toFixed(3));
        tiltEl.style.setProperty("--ins-tilt-y", current.y.toFixed(3));
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

    function updatePointer(clientX, clientY) {
      var rect = surface.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      var px = holoClamp(holoRound((100 / rect.width) * (clientX - rect.left)), 0, 100);
      var py = holoClamp(holoRound((100 / rect.height) * (clientY - rect.top)), 0, 100);
      applyPointer(px, py, 1);
    }

    function clearPointer() {
      surface.classList.remove("interacting");
      if (enableTilt) tiltEl.classList.remove("is-tilting");
      applyPointer(50, 50, 0);
      target.x = 0;
      target.y = 0;
      if (enableTilt) queueTiltPaint();
    }

    function onEnter(event) {
      hovering = true;
      surface.classList.add("interacting");
      if (enableTilt) tiltEl.classList.add("is-tilting");
      updatePointer(event.clientX, event.clientY);
      if (enableTilt) queueTiltPaint();
    }

    function onLeave() {
      hovering = false;
      clearPointer();
    }

    function onMove(event) {
      var rect = surface.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      if (enableTilt) {
        target.x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
        target.y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));
        queueTiltPaint();
      }
      updatePointer(event.clientX, event.clientY);
    }

    if (!reduced && window.matchMedia("(pointer: fine)").matches) {
      surface.addEventListener("pointerenter", onEnter);
      surface.addEventListener("pointerleave", onLeave);
      surface.addEventListener("pointermove", onMove, { passive: true });
    } else {
      applyPointer(42, 38, 0.85);
      surface.classList.add("interacting");
    }

    return function () {
      if (!reduced && window.matchMedia("(pointer: fine)").matches) {
        surface.removeEventListener("pointerenter", onEnter);
        surface.removeEventListener("pointerleave", onLeave);
        surface.removeEventListener("pointermove", onMove);
      }
      if (rafId) cancelAnimationFrame(rafId);
      if (enableTilt) {
        tiltEl.style.removeProperty("--ins-tilt-x");
        tiltEl.style.removeProperty("--ins-tilt-y");
      }
      clearPointer();
    };
  }

  function bindRainbowDeckCard(card) {
    var rotator = card.querySelector(".card__rotator");
    if (!rotator) return function () {};
    return bindRainbowHoloSurface(card, { tiltTarget: rotator });
  }

  function bootWordmarkHolo(root) {
    if (wordmarkHoloCleanup) {
      wordmarkHoloCleanup();
      wordmarkHoloCleanup = null;
    }
    if (!window.AimyWordmarkHolo || typeof window.AimyWordmarkHolo.boot !== "function") {
      return;
    }
    wordmarkHoloCleanup = window.AimyWordmarkHolo.boot({
      id: "insights",
      root: root,
      wrap: ".ins-log__wordmark-wrap",
      wordmark: "[data-aimy-wordmark-holo]",
    });
  }

  function bootNextHolo(root) {
    if (nextHoloCleanup) {
      nextHoloCleanup();
      nextHoloCleanup = null;
    }

    var links = document.querySelectorAll(".ins-log__next-peek.ins-next-holo");
    if (!links.length) {
      links = document.querySelectorAll("[data-ins-log-next-link].ins-next-holo");
    }
    if (!links.length && root) {
      links = root.querySelectorAll(".ins-next-holo");
    }
    if (!links.length) return;

    var cleanups = [];
    links.forEach(function (link) {
      cleanups.push(bindRainbowHoloSurface(link, { tilt: false }));
    });

    nextHoloCleanup = function () {
      cleanups.forEach(function (off) {
        off();
      });
      cleanups.length = 0;
    };
  }

  function bootDeckHolo(root) {
    if (deckHoloCleanup) {
      deckHoloCleanup();
      deckHoloCleanup = null;
    }

    var cards = root.querySelectorAll(".ins-logs-deck .card");
    if (!cards.length) return;

    var cleanups = [];
    cards.forEach(function (card) {
      cleanups.push(bindRainbowDeckCard(card));
    });

    deckHoloCleanup = function () {
      cleanups.forEach(function (off) {
        off();
      });
      cleanups.length = 0;
    };
  }

  function initInsightsPage(root, options) {
    options = options || {};
    root = insightsRoot(root);
    if (!root) return;

    if (activeRoot === root && root.dataset.insightsReady === "1") {
      destroyInsightsPage({ keepRoot: true });
    }
    activeRoot = root;

    function finishBoot() {
      if (activeRoot !== root) return;
      root.classList.add("active", "is-active");
      root.dataset.insightsReady = "1";

      window.setTimeout(function () {
        if (activeRoot !== root) return;
        var scope =
          options.phase === "open" && options.log
            ? root.querySelector('[data-ins-log-panel="' + options.log + '"]')
            : root;
        if (!scope) scope = root;
        scope.querySelectorAll("[data-ins-reveal]:not(.is-in)").forEach(function (el) {
          el.classList.add("is-in");
        });
        if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh(true);
      }, 420);
    }

    if (options.phase === "choose") {
      bootSignatureDraw(root);
      bootDeckHolo(root);
      requestAnimationFrame(function () {
        finishBoot();
      });
      return;
    }

    if (deckHoloCleanup) {
      deckHoloCleanup();
      deckHoloCleanup = null;
    }
    if (wordmarkHoloCleanup) {
      wordmarkHoloCleanup();
      wordmarkHoloCleanup = null;
    }
    if (nextHoloCleanup) {
      nextHoloCleanup();
      nextHoloCleanup = null;
    }

    var panel =
      options.log && root.querySelector('[data-ins-log-panel="' + options.log + '"]');
    var revealRoot = panel || root;

    if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
      if (window.__lenis && typeof window.__lenis.on === "function") {
        window.__lenis.on("scroll", ScrollTrigger.update);
      }
    }

    bootReveals(revealRoot);
    if (revealRoot.querySelector("[data-ins-logo-focus]")) {
      bootLogoFocus(revealRoot);
    }
    bootWordmarkHolo(revealRoot);
    bootNextHolo(root);
    requestAnimationFrame(function () {
      finishBoot();
    });
  }

  function destroyInsightsPage(options) {
    options = options || {};
    if (signatureTween && signatureTween.kill) {
      signatureTween.kill();
      signatureTween = null;
    }
    if (revealObserver) {
      revealObserver.disconnect();
      revealObserver = null;
    }
    if (logoFocusCleanup) {
      logoFocusCleanup();
      logoFocusCleanup = null;
    }
    if (deckHoloCleanup) {
      deckHoloCleanup();
      deckHoloCleanup = null;
    }
    if (wordmarkHoloCleanup) {
      wordmarkHoloCleanup();
      wordmarkHoloCleanup = null;
    }
    if (nextHoloCleanup) {
      nextHoloCleanup();
      nextHoloCleanup = null;
    }
    if (typeof ScrollTrigger !== "undefined") {
      ScrollTrigger.getAll().forEach(function (st) {
        var trigger = st && st.trigger;
        if (trigger && activeRoot && activeRoot.contains(trigger)) {
          st.kill();
        }
      });
    }
    if (!options.keepRoot && window.Polyglide && typeof window.Polyglide.destroy === "function") {
      window.Polyglide.destroy();
    }
    lenis = null;

    var headerBrand = document.querySelector(".site-header[data-aimy-chrome] .brand");
    if (headerBrand) headerBrand.classList.remove("is-logo-blurred");

    if (activeRoot) {
      if (!options.keepRoot) {
        resetSignatureDraw(activeRoot);
        activeRoot.classList.remove("active", "is-active");
      }
      activeRoot.removeAttribute("data-insights-ready");
      activeRoot.querySelectorAll("[data-ins-reveal]").forEach(function (el) {
        el.classList.remove("is-in");
      });
      var logoSection = activeRoot.querySelector("[data-ins-logo-focus]");
      if (logoSection) logoSection.classList.remove("is-logo-in");
      if (!options.keepRoot) {
        activeRoot = null;
      }
    }
  }

  window.SpaPages = window.SpaPages || {};
  window.SpaPages.insightsRuntime = {
    init: initInsightsPage,
    destroy: destroyInsightsPage,
    refreshNextHolo: function () {
      bootNextHolo(activeRoot);
    },
  };
})();
