/**
 * insights.js — Behind the Madness case study runtime (SPA + standalone).
 */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lenis = null;
  var revealObserver = null;
  var logNextRevealObserver = null;
  var silencePinRefit = null;
  var logoFocusCleanup = null;
  var silenceHeartCleanup = null;
  var voltageScrollCleanup = null;
  var signatureTween = null;
  var deckHoloCleanup = null;
  var wordmarkHoloCleanup = null;
  var activeRoot = null;
  var SIGNATURE_SVG = "./assets/polykroma/branding/signature.svg?v=branding-10";
  var SIGNATURE_STROKES = ["G", "w", "en", "stroke", "Dot", "Bun"];
  var SCRIBBLE_HEART_SVG = "./assets/content/insights/scribbly-heart.svg?v=insights-1";
  var HEART_LAYERS = [
    { className: "ins-silence-heart__layer ins-silence-heart__layer--ghost-a", width: 4, opacity: 0.18, lag: 0.05 },
    { className: "ins-silence-heart__layer ins-silence-heart__layer--ghost-b", width: 2.35, opacity: 0.42, lag: 0.025 },
    { className: "ins-silence-heart__layer ins-silence-heart__layer--core", width: 1.15, opacity: 1, lag: 0 },
  ];
  var HEART_SCROLL_END = "+=420%";
  var HEART_DRAW_POWER = 2.1;
  var HEART_UNLOCK = 0.992;
  var HEART_SCALE_MIN = 0.84;
  var HEART_SCRUB = 3.15;
  var VOLTAGE_SCRUB = 2.2;
  var VOLTAGE_SECTION_SCRUB = 2.9;
  var VOLTAGE_REVEAL_Y = 18;
  var VOLTAGE_REVEAL_START = "top 92%";
  var VOLTAGE_REVEAL_END = "top 70%";
  var VOLTAGE_SECTION_EXIT_START = "top 90%";
  var VOLTAGE_SECTION_EXIT_END = "bottom top+=14%";
  var lenisProxyWired = false;

  function insightsRoot(root) {
    if (root) return root;
    return document.querySelector('[data-spa-view="insights"] #insights-page-content') ||
      document.getElementById("insights-page-content");
  }

  function syncLenisScrollTrigger(activeLenis) {
    if (
      !activeLenis ||
      typeof gsap === "undefined" ||
      typeof ScrollTrigger === "undefined"
    ) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    if (!lenisProxyWired) {
      ScrollTrigger.scrollerProxy(document.documentElement, {
        scrollTop: function (value) {
          if (arguments.length) {
            activeLenis.scrollTo(value, { immediate: true });
          }
          return activeLenis.scroll;
        },
        getBoundingClientRect: function () {
          return {
            top: 0,
            left: 0,
            width: window.innerWidth,
            height: window.innerHeight,
          };
        },
      });
      lenisProxyWired = true;
    }

    if (typeof activeLenis.off === "function") {
      activeLenis.off("scroll", ScrollTrigger.update);
    }
    activeLenis.on("scroll", ScrollTrigger.update);
  }

  function bootLenis() {
    if (!window.Polyglide) return null;
    lenis = window.Polyglide.boot();
    syncLenisScrollTrigger(lenis);
    return lenis;
  }

  function bootReveals(scope) {
    if (!scope) return;

    var roots = scope.length && scope.nodeType !== 1 ? scope : [scope];
    if (scope.nodeType === 1) roots = [scope];

    var nodes = [];
    roots.forEach(function (root) {
      if (!root) return;
      nodes = nodes.concat(
        Array.prototype.slice.call(
          root.querySelectorAll(
            "[data-ins-reveal]:not(.is-in):not([data-ins-reveal-scroll]):not([data-ins-silence])"
          )
        )
      );
    });
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
      { root: null, rootMargin: "0px 0px -6% 0px", threshold: 0.08 }
    );

    nodes.forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  function observeLogNextReveal() {
    var link = document.querySelector("[data-ins-log-next-link][data-ins-reveal-scroll]");
    if (!link) return;

    if (logNextRevealObserver) {
      logNextRevealObserver.disconnect();
      logNextRevealObserver = null;
    }

    if (reduced || !("IntersectionObserver" in window)) {
      link.classList.add("is-in");
      return;
    }

    logNextRevealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          logNextRevealObserver.unobserve(entry.target);
        });
      },
      { root: null, rootMargin: "0px 0px -4% 0px", threshold: 0.05 }
    );

    logNextRevealObserver.observe(link);
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

    if (window.AimyCharmMark && typeof window.AimyCharmMark.prepareMarkStack === "function") {
      window.AimyCharmMark.prepareMarkStack(clone);
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

  function buildHeartSvg(sourcePath, viewBox) {
    var ns = "http://www.w3.org/2000/svg";
    var d = sourcePath.getAttribute("d");
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", viewBox);
    svg.setAttribute("class", "ins-silence-heart__svg");
    svg.setAttribute("role", "presentation");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("aria-hidden", "true");

    var layers = HEART_LAYERS.map(function (spec) {
      var path = document.createElementNS(ns, "path");
      path.setAttribute("d", d);
      path.setAttribute("class", spec.className);
      path.setAttribute("stroke-width", String(spec.width));
      path.setAttribute("opacity", String(spec.opacity));
      svg.appendChild(path);

      var len = path.getTotalLength();
      path.style.strokeDasharray = String(len);
      path.style.strokeDashoffset = String(len);

      return {
        el: path,
        len: len,
        lag: spec.lag,
        setOffset: gsap && gsap.quickSetter ? gsap.quickSetter(path, "strokeDashoffset") : null,
      };
    });

    return { svg: svg, layers: layers };
  }

  function heartDrawProgress(scrollProgress) {
    return Math.pow(Math.max(0, Math.min(1, scrollProgress)), HEART_DRAW_POWER);
  }

  function resetSilenceSettle(settleEl) {
    if (!settleEl) return;
    settleEl.style.opacity = "";
    settleEl.style.transform = "";
  }

  function paintHeartDraw(layers, drawProgress) {
    layers.forEach(function (layer) {
      var t = drawProgress;
      if (layer.lag) {
        t = Math.max(0, Math.min(1, (t - layer.lag) / (1 - layer.lag)));
      }
      var offset = layer.len * (1 - t);
      if (layer.setOffset) {
        layer.setOffset(offset);
      } else {
        layer.el.style.strokeDashoffset = String(offset);
      }
    });
  }

  function paintSilenceHeart(stageEl, scrollProgress) {
    if (!stageEl) return;
    var p = Math.max(0, Math.min(1, scrollProgress));
    var scale = 1 - p * (1 - HEART_SCALE_MIN);
    stageEl.style.setProperty("--heart-scale", scale.toFixed(4));
  }

  function resetSilenceHeartHost(stageEl) {
    if (stageEl) {
      stageEl.style.removeProperty("--heart-scale");
    }
  }

  function silenceTitleFade(scrollProgress) {
    if (scrollProgress <= 0.08) return 0;
    return Math.pow((scrollProgress - 0.08) / 0.92, 1.35);
  }

  function prepSilenceTitle(titleEl) {
    if (!titleEl || titleEl.dataset.silenceTitleReady === "1") return;
    titleEl.dataset.silenceTitleReady = "1";
    if (typeof gsap !== "undefined" && gsap.quickSetter) {
      titleEl._insSetTransform = gsap.quickSetter(titleEl, "transform");
      titleEl._insSetOpacity = gsap.quickSetter(titleEl, "opacity");
      titleEl._insSetFilter = gsap.quickSetter(titleEl, "filter");
    }
  }

  function paintSilenceTitle(titleEl, fadeProgress) {
    if (!titleEl) return;
    var t = Math.max(0, Math.min(1, fadeProgress));
    var scale = 1 - t * 0.5;
    var blur = t * 16;
    var opacity = 1 - t;
    var y = t * -32;
    var transform = "translate3d(0," + y.toFixed(2) + "px,0) scale(" + scale.toFixed(4) + ")";
    var filter = blur > 0.05 ? "blur(" + blur.toFixed(2) + "px)" : "none";

    if (titleEl._insSetTransform) {
      titleEl._insSetTransform(transform);
      titleEl._insSetOpacity(opacity);
      titleEl._insSetFilter(filter);
      return;
    }

    titleEl.style.transform = transform;
    titleEl.style.opacity = String(opacity);
    titleEl.style.filter = filter;
  }

  function resetSilenceTitle(titleEl) {
    if (!titleEl) return;
    paintSilenceTitle(titleEl, 0);
    delete titleEl._insSetTransform;
    delete titleEl._insSetOpacity;
    delete titleEl._insSetFilter;
    titleEl.removeAttribute("data-silence-title-ready");
    titleEl.style.transform = "";
    titleEl.style.opacity = "";
    titleEl.style.filter = "";
  }

  function paintVoltagePart(partEl, reveal) {
    if (!partEl) return;
    var r = Math.max(0, Math.min(1, reveal));
    var revealY = (1 - r) * VOLTAGE_REVEAL_Y;
    partEl.style.opacity = String(r);
    partEl.style.transform = "translate3d(0," + revealY.toFixed(2) + "px,0)";
  }

  function paintVoltageFlow(flowEl, state) {
    if (!flowEl || !state) return;
    var b = Math.max(0, Math.min(1, state.blur));
    flowEl.style.filter = b > 0.01 ? "blur(" + (b * 14).toFixed(2) + "px)" : "none";
    flowEl.style.opacity = String(1 - b * 0.82);
    flowEl.style.transform =
      "translate3d(0," +
      state.y.toFixed(2) +
      "px,0) scale(" +
      state.scale.toFixed(4) +
      ")";
  }

  function resetVoltagePart(partEl) {
    if (!partEl) return;
    partEl.style.opacity = "";
    partEl.style.transform = "";
  }

  function resetVoltageFlow(flowEl) {
    if (!flowEl) return;
    flowEl.style.filter = "";
    flowEl.style.opacity = "";
    flowEl.style.transform = "";
  }

  function showVoltageStatic(parts, finale) {
    parts.forEach(function (part) {
      paintVoltagePart(part, 1);
    });
    paintVoltagePart(finale, 1);
  }

  function bootHighVoltage(root) {
    var section = root.querySelector("[data-ins-voltage]");
    var flowEl = section && section.querySelector("[data-ins-voltage-flow]");
    var outro = section && section.querySelector(".ins-voltage-outro");
    var parts = section
      ? Array.prototype.slice.call(section.querySelectorAll("[data-ins-voltage-part]"))
      : [];
    var finale = section && section.querySelector("[data-ins-voltage-finale]");
    var voltageTweens = [];

    if (!section || !flowEl || !parts.length || !finale || section.dataset.voltageReady === "1") {
      return;
    }

    section.dataset.voltageReady = "1";

    if (reduced || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      showVoltageStatic(parts, finale);
      return;
    }

    syncLenisScrollTrigger(window.__lenis);
    gsap.registerPlugin(ScrollTrigger);

    parts.forEach(function (part) {
      var tween = gsap.fromTo(
        part,
        { opacity: 0, y: VOLTAGE_REVEAL_Y },
        {
          opacity: 1,
          y: 0,
          ease: "none",
          scrollTrigger: {
            trigger: part,
            start: VOLTAGE_REVEAL_START,
            end: VOLTAGE_REVEAL_END,
            scrub: VOLTAGE_SCRUB,
            invalidateOnRefresh: true,
          },
        }
      );
      voltageTweens.push(tween);
    });

    var exitState = { blur: 0, y: 0, scale: 1 };
    var exitTween = gsap.to(exitState, {
      blur: 1,
      y: -88,
      scale: 0.92,
      ease: "none",
      scrollTrigger: {
        trigger: outro || section,
        start: VOLTAGE_SECTION_EXIT_START,
        end: VOLTAGE_SECTION_EXIT_END,
        scrub: VOLTAGE_SECTION_SCRUB,
        invalidateOnRefresh: true,
      },
      onUpdate: function () {
        paintVoltageFlow(flowEl, exitState);
      },
    });
    voltageTweens.push(exitTween);

    voltageScrollCleanup = function () {
      voltageTweens.forEach(function (tween) {
        if (tween && tween.kill) tween.kill();
      });
      parts.forEach(resetVoltagePart);
      resetVoltageFlow(flowEl);
      section.removeAttribute("data-voltage-ready");
    };
  }

  function resetHighVoltage(root) {
    if (voltageScrollCleanup) {
      voltageScrollCleanup();
      voltageScrollCleanup = null;
    }
    if (!root) return;
    var section = root.querySelector("[data-ins-voltage]");
    if (!section) return;
    var flowEl = section.querySelector("[data-ins-voltage-flow]");
    var parts = section.querySelectorAll("[data-ins-voltage-part]");
    parts.forEach(resetVoltagePart);
    resetVoltageFlow(flowEl);
    section.removeAttribute("data-voltage-ready");
  }

  function identityPanel(root) {
    if (!root) return null;
    if (root.getAttribute && root.getAttribute("data-ins-log-panel") === "identity") {
      return root;
    }
    return root.querySelector('[data-ins-log-panel="identity"]');
  }

  function setHeartComplete(panel, on) {
    var active = !!on;
    if (panel) panel.classList.toggle("is-heart-complete", active);
    document.body.classList.toggle("ins-heart-complete", active);
  }

  function bootSilenceHeart(root) {
    var section = root.querySelector("[data-ins-silence]");
    var host = section && section.querySelector("[data-ins-silence-heart]");
    var panel = identityPanel(root);
    if (!section || !host || host.dataset.heartLoaded === "1") return;

    setHeartComplete(panel, false);

    fetch(SCRIBBLE_HEART_SVG)
      .then(function (res) {
        if (!res.ok) throw new Error("scribble heart fetch failed");
        return res.text();
      })
      .then(function (markup) {
        if (activeRoot && !activeRoot.contains(section)) return;

        host.innerHTML = markup;
        host.dataset.heartLoaded = "1";

        var imported = host.querySelector("svg");
        var sourcePath = imported && imported.querySelector("path");
        if (!imported || !sourcePath) {
          setHeartComplete(panel, true);
          return;
        }

        var viewBox = imported.getAttribute("viewBox") || "0 0 442 442";
        var built = buildHeartSvg(sourcePath, viewBox);
        host.innerHTML = "";
        host.appendChild(built.svg);

        if (reduced) {
          paintHeartDraw(built.layers, 1);
          setHeartComplete(panel, true);
          section.classList.add("is-heart-drawn");
          return;
        }

        if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
          paintHeartDraw(built.layers, 1);
          setHeartComplete(panel, true);
          section.classList.add("is-heart-drawn");
          return;
        }

        syncLenisScrollTrigger(window.__lenis);
        gsap.registerPlugin(ScrollTrigger);
        section.classList.add("is-heart-drawing");
        if (panel) panel.classList.add("is-heart-drawing");

        var pinEl = section.querySelector(".ins-silence-pin") || section;
        var settleEl = section.querySelector("[data-ins-silence-settle]");
        var stageEl = section.querySelector("[data-ins-silence-stage]");
        var titleEl =
          section.querySelector("[data-ins-silence-title]") ||
          section.querySelector(".ins-log__slot-title");
        var scroll = { p: 0 };

        function mountSilenceOverlay() {
          if (!stageEl || stageEl.dataset.insSilenceOverlay === "1") return;
          stageEl.dataset.insSilenceOverlay = "1";
          stageEl._insSilenceParent = stageEl.parentNode;
          stageEl._insSilenceNext = stageEl.nextSibling;
          document.body.classList.add("ins-silence-overlay-active");
          document.body.appendChild(stageEl);
        }

        function unmountSilenceOverlay() {
          if (!stageEl || stageEl.dataset.insSilenceOverlay !== "1") return;
          stageEl.dataset.insSilenceOverlay = "0";
          document.body.classList.remove("ins-silence-overlay-active");
          if (stageEl._insSilenceParent) {
            stageEl._insSilenceParent.insertBefore(stageEl, stageEl._insSilenceNext || null);
          }
        }

        function fitSilencePin() {
          if (!pinEl) return;
          var rail = pinEl.querySelector(".ins-silence-pin-rail");
          var h = window.innerHeight;
          if (rail) {
            rail.style.height = h + "px";
          }
          pinEl.style.height = h + "px";
          pinEl.style.minHeight = h + "px";
        }

        fitSilencePin();
        window.addEventListener("resize", fitSilencePin);

        function applyDraw(scrollProgress) {
          var raw = Math.max(0, Math.min(1, scrollProgress));
          var drawP = heartDrawProgress(raw);
          paintHeartDraw(built.layers, drawP);
          if (!reduced) {
            paintSilenceHeart(stageEl, raw);
          }

          var unlocked = raw >= HEART_UNLOCK;
          setHeartComplete(panel, unlocked);
          section.classList.toggle("is-heart-drawn", unlocked);
          section.classList.toggle("is-heart-drawing", raw > 0 && raw < HEART_UNLOCK);
          if (panel) {
            panel.classList.toggle("is-heart-drawing", raw > 0 && raw < HEART_UNLOCK);
          }
        }

        var heartScrollTween = gsap.to(scroll, {
          p: 1,
          ease: "none",
          scrollTrigger: {
            trigger: pinEl,
            start: "top top",
            end: HEART_SCROLL_END,
            pin: pinEl,
            pinSpacing: true,
            pinType: "transform",
            anticipatePin: 0,
            fastScrollEnd: true,
            scrub: HEART_SCRUB,
            invalidateOnRefresh: true,
            onEnter: function () {
              fitSilencePin();
              mountSilenceOverlay();
            },
            onEnterBack: function () {
              fitSilencePin();
              mountSilenceOverlay();
            },
            onRefresh: function (self) {
              fitSilencePin();
              if (self && self.isActive) mountSilenceOverlay();
              applyDraw(scroll.p);
            },
            onLeave: function () {
              unmountSilenceOverlay();
              resetSilenceSettle(settleEl);
              if (section.classList.contains("is-heart-drawn")) {
                applyDraw(1);
              }
            },
            onLeaveBack: function () {
              unmountSilenceOverlay();
              resetSilenceSettle(settleEl);
            },
          },
          onUpdate: function () {
            applyDraw(scroll.p);
          },
        });

        silencePinRefit = function () {
          fitSilencePin();
          var st = heartScrollTween && heartScrollTween.scrollTrigger;
          if (st && st.isActive) mountSilenceOverlay();
          applyDraw(scroll.p);
        };

        fitSilencePin();
        applyDraw(0);
        requestAnimationFrame(function () {
          silencePinRefit();
          ScrollTrigger.refresh();
        });

        silenceHeartCleanup = function () {
          silencePinRefit = null;
          window.removeEventListener("resize", fitSilencePin);
          unmountSilenceOverlay();
          document.body.classList.remove("ins-silence-overlay-active");
          if (pinEl) {
            pinEl.style.height = "";
            pinEl.style.minHeight = "";
            var rail = pinEl.querySelector(".ins-silence-pin-rail");
            if (rail) rail.style.height = "";
          }
          if (heartScrollTween) heartScrollTween.kill();
          setHeartComplete(panel, false);
          section.classList.remove("is-heart-drawn", "is-heart-drawing");
          if (panel) panel.classList.remove("is-heart-drawing");
          resetSilenceTitle(titleEl);
          resetSilenceSettle(settleEl);
          resetSilenceHeartHost(stageEl);
          host.innerHTML = "";
          host.removeAttribute("data-heart-loaded");
        };
      })
      .catch(function () {
        setHeartComplete(panel, true);
      });
  }

  function resetSilenceHeart(root) {
    if (silenceHeartCleanup) {
      silenceHeartCleanup();
      silenceHeartCleanup = null;
    }
    if (!root) return;
    var panel = identityPanel(root);
    if (panel) {
      panel.classList.remove("is-heart-complete", "is-heart-drawing");
    }
    document.body.classList.remove("ins-heart-complete");
    var section = root.querySelector("[data-ins-silence]");
    if (section) section.classList.remove("is-heart-drawn", "is-heart-drawing");
    document.body.classList.remove("ins-silence-overlay-active");
    resetSilenceTitle(section && section.querySelector("[data-ins-silence-title]"));
    resetSilenceSettle(section && section.querySelector("[data-ins-silence-settle]"));
    var host = root.querySelector("[data-ins-silence-heart]");
    resetSilenceHeartHost(section && section.querySelector("[data-ins-silence-stage]"));
    if (host) {
      host.innerHTML = "";
      host.removeAttribute("data-heart-loaded");
    }
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
        scope
          .querySelectorAll(
            "[data-ins-reveal]:not(.is-in):not([data-ins-reveal-scroll]):not([data-ins-silence])"
          )
          .forEach(function (el) {
          el.classList.add("is-in");
        });
        if (typeof ScrollTrigger !== "undefined") {
          if (options.phase === "open" && options.log) {
            if (silencePinRefit) silencePinRefit();
            ScrollTrigger.update();
          } else {
            ScrollTrigger.refresh(true);
          }
        }
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

    var panel =
      options.log && root.querySelector('[data-ins-log-panel="' + options.log + '"]');
    var revealRoot = panel || root;

    if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
      syncLenisScrollTrigger(window.__lenis);
    }

    bootReveals(revealRoot);
    observeLogNextReveal();
    if (revealRoot.querySelector("[data-ins-logo-focus]")) {
      bootLogoFocus(revealRoot);
    }
    if (revealRoot.querySelector("[data-ins-silence]")) {
      bootSilenceHeart(revealRoot);
    }
    if (revealRoot.querySelector("[data-ins-voltage]")) {
      bootHighVoltage(revealRoot);
    }
    bootWordmarkHolo(revealRoot);
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
    if (logNextRevealObserver) {
      logNextRevealObserver.disconnect();
      logNextRevealObserver = null;
    }
    if (logoFocusCleanup) {
      logoFocusCleanup();
      logoFocusCleanup = null;
    }
    if (silenceHeartCleanup) {
      silenceHeartCleanup();
      silenceHeartCleanup = null;
    }
    if (voltageScrollCleanup) {
      voltageScrollCleanup();
      voltageScrollCleanup = null;
    }
    if (deckHoloCleanup) {
      deckHoloCleanup();
      deckHoloCleanup = null;
    }
    if (wordmarkHoloCleanup) {
      wordmarkHoloCleanup();
      wordmarkHoloCleanup = null;
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
      resetSilenceHeart(activeRoot);
      resetHighVoltage(activeRoot);
      if (!options.keepRoot) {
        activeRoot = null;
      }
    }
  }

  window.SpaPages = window.SpaPages || {};
  window.SpaPages.insightsRuntime = {
    init: initInsightsPage,
    destroy: destroyInsightsPage,
    observeLogNextReveal: observeLogNextReveal,
    refitSilencePin: function () {
      if (silencePinRefit) silencePinRefit();
    },
  };
})();
