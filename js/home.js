/**
 * home.js
 * Minimal runtime so the static home SSR snapshot behaves 1:1:
 * - unlock scroll (dump uses overflow:hidden for custom scroller)
 * - --vh / --vw
 * - html.-loaded.-ready (entrance settles)
 * - --progress on [string="progress"] sections
 * - soft path / spotlight pointer on .c-welcome
 */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /**
   * First-load fullscreen typewriter reveal.
   * Shows once per session, then fades to the home page.
   */
  function bootReveal(onComplete) {
    var overlay = document.getElementById("aimy-reveal");
    if (!overlay) {
      onComplete();
      return;
    }

    if (window.sessionStorage && sessionStorage.getItem("aimy-reveal-shown")) {
      overlay.classList.add("is-done");
      onComplete();
      return;
    }

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    var lines = [
      [{ text: "AIMY", color: "magenta" }, { text: "GWEN", color: "pink" }],
      [{ text: "ARTIST", color: "teal" }],
      [{ text: "WELCOME", color: "magenta" }]
    ];

    var textEl = overlay.querySelector(".aimy-reveal__text");
    textEl.innerHTML = "";

    var lineData = [];
    lines.forEach(function (line) {
      var p = document.createElement("p");
      p.className = "aimy-reveal__line";
      var segEls = [];
      line.forEach(function (seg) {
        var s = document.createElement("span");
        s.className = "aimy-reveal__word aimy-reveal__word--" + seg.color;
        p.appendChild(s);
        segEls.push({ el: s, text: seg.text, length: seg.text.length });
      });
      textEl.appendChild(p);
      lineData.push({ el: p, segs: segEls });
    });

    var cursor = document.createElement("span");
    cursor.className = "aimy-reveal__cursor";
    cursor.textContent = "_";

    function placeCursor(lineEl) {
      if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
      if (lineEl) lineEl.appendChild(cursor);
    }

    function finish() {
      if (window.sessionStorage) sessionStorage.setItem("aimy-reveal-shown", "1");
      overlay.classList.add("is-done");
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      window.setTimeout(onComplete, 900);
    }

    if (reduced) {
      lineData.forEach(function (line) {
        line.segs.forEach(function (seg) {
          seg.el.textContent = seg.text;
        });
      });
      placeCursor(null);
      window.setTimeout(finish, 900);
      return;
    }

    var queue = [];
    lineData.forEach(function (line, li) {
      line.segs.forEach(function (seg, si) {
        for (var i = 0; i < seg.length; i++) {
          queue.push({ li: li, si: si, ci: i });
        }
      });
    });

    var charDelay = 55;
    var lineDelay = 450;
    var step = 0;

    function typeStep() {
      if (step >= queue.length) {
        placeCursor(null);
        window.setTimeout(finish, 900);
        return;
      }

      var item = queue[step];
      var line = lineData[item.li];
      var seg = line.segs[item.si];
      seg.el.textContent = seg.text.slice(0, item.ci + 1);
      placeCursor(line.el);

      var next = step + 1;
      var delay = charDelay;
      if (next < queue.length && queue[next].li !== item.li) {
        delay = lineDelay;
      }
      step = next;
      window.setTimeout(typeStep, delay);
    }

    window.setTimeout(typeStep, 350);
  }

  function setViewportUnits() {
    var h = window.innerHeight || 1;
    var w = window.innerWidth || 1;
    document.documentElement.style.setProperty("--vh", h * 0.01 + "px");
    document.documentElement.style.setProperty("--vw", w * 0.01 + "px");
  }

  function unlockScroll() {
    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";
  }

  function bootLenis() {
    if (!window.Polyglide) {
      window.__lenis = null;
      return null;
    }
    var lenis = window.Polyglide.boot();
    if (lenis && typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
      lenis.on("scroll", ScrollTrigger.update);
    }
    return lenis;
  }

  function bootProgress() {
    var nodes = document.querySelectorAll('[string="progress"], [string-id="welcome"]');
    if (!nodes.length) {
      nodes = document.querySelectorAll(".c-welcome");
    }
    if (!nodes.length) return;

    function applyProgress(el, progress) {
      var key = el.getAttribute("string-key") || "--progress";
      var value = progress.toFixed(4);
      el.style.setProperty(key, value);
      el.style.setProperty("--progress", value);

      // Home "copy-from" stand-in: push progress vars into the Work sticky stage
      if (el.classList.contains("sticky-container") || el.getAttribute("string-id") === "sticky-container") {
        var stage = el.closest(".c-places") || el;
        stage.style.setProperty("--progress", value);
      }
      if (el.getAttribute("string-id") === "progress-end" || key === "--progress-ending") {
        var places = el.closest(".c-places") || document.querySelector(".c-places");
        if (places) {
          places.style.setProperty("--progress-ending", value);
          var controller = places.querySelector(".sequence-controller");
          if (controller) controller.style.setProperty("--progress-ending", value);
        }
      }
    }

    if (reduced) {
      nodes.forEach(function (el) {
        applyProgress(el, 0);
      });
      return;
    }

    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      var fallbackTicking = false;

      function syncFallbackProgress() {
        fallbackTicking = false;
        nodes.forEach(function (el) {
          var rect = el.getBoundingClientRect();
          var progress = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height)));
          applyProgress(el, progress);
        });
      }

      function requestFallbackProgress() {
        if (fallbackTicking) return;
        fallbackTicking = true;
        requestAnimationFrame(syncFallbackProgress);
      }

      window.addEventListener("scroll", requestFallbackProgress, { passive: true });
      window.addEventListener("resize", requestFallbackProgress, { passive: true });
      if (window.__lenis) window.__lenis.on("scroll", requestFallbackProgress);
      syncFallbackProgress();
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    nodes.forEach(function (el) {
      applyProgress(el, 0);
      var offsetTop = el.getAttribute("string-offset-top") || "0%";
      var offsetBottom = el.getAttribute("string-offset-bottom") || "0%";
      ScrollTrigger.create({
        trigger: el,
        start: "top " + (offsetTop === "-50%" ? "50%" : "top"),
        end: "bottom " + (offsetBottom === "50%" ? "50%" : "top"),
        scrub: 0.35,
        onUpdate: function (self) {
          applyProgress(el, self.progress);
        },
      });
    });
  }

  /**
   * Home string="sequence" stand-in: Work / Updates / Admission carousels.
   * Wires prev/next, side-panel jumps, .-active slides, and order counters.
   */
  var FEATURED_UPDATES = [
    {
      status: "Komorebi",
      title: "Crossroads",
      caption:
        "Forest biomes, wooden paths, crossroads signals, and cozy lighting for magical journeys.",
    },
    {
      status: "Komorebi",
      title: "Timeless Tekk",
      caption:
        "Steam boilers, cog networks, copper tubing, and decorative factory blockouts.",
    },
    {
      status: "Komorebi",
      title: "Plushies!!",
      caption:
        "Cuddle-ready plush toys of Hytale beasts, elementals, and forest critters.",
    },
    {
      status: "Komorebi",
      title: "Dress Up!",
      caption:
        "Mix-and-match outfits, accessories, and flair for every adventure.",
    },
    {
      status: "In progress",
      title: "Untitled Game Project",
      caption:
        "A game still finding its name — quiet worlds, systems, and experiments in progress.",
    },
  ];

  function setFeaturedCopySlot(root, slot, slide) {
    if (!slide) return;
    var map = {
      status: ".u-s-" + slot,
      title: ".u-t-" + slot,
      caption: ".u-c-" + slot,
    };
    Object.keys(map).forEach(function (key) {
      var el = root.querySelector(map[key]);
      if (!el) return;
      var target = el.querySelector("span") || el;
      target.textContent = slide[key] || "";
    });
  }

  function syncFeaturedCopy(root, index, total) {
    if (!root || !FEATURED_UPDATES.length) return;
    var n = FEATURED_UPDATES.length;
    var prev = ((index - 1) % n + n) % n;
    var next = (index + 1) % n;
    setFeaturedCopySlot(root, 1, FEATURED_UPDATES[prev]);
    setFeaturedCopySlot(root, 2, FEATURED_UPDATES[index]);
    setFeaturedCopySlot(root, 3, FEATURED_UPDATES[next]);
  }

  function bootSequencers() {
    var configs = [
      {
        id: "places-sequencer",
        root: ".c-places",
        slideSel: ".sequence-controller > figure",
        names: [
          "Insights",
          "Sketchbook",
          "Komorebi",
          "Lowpoly",
          "Tapes",
          "Worlds",
          "Process",
        ],
      },
      {
        id: "updates-sequencer",
        root: ".c-updates",
        /* Prefer numbered nav pills; figures sync via string-sequence below */
        slideSel: ".sequence-nav .num[string-sequence-trigger], .figure-sequence > figure[string-sequence-trigger]",
        names: null,
        syncSequenceAttr: true,
        syncFeaturedCopy: true,
      },
      {
        id: "admission-sequencer",
        root: ".c-admission",
        slideSel: ".sequence-canvas figure, figure[string-sequence-trigger*='admission']",
        names: null,
      },
    ];

    configs.forEach(function (cfg) {
      var root = document.querySelector(cfg.root);
      if (!root) return;

      var slides = Array.prototype.slice.call(
        root.querySelectorAll(cfg.slideSel)
      ).filter(function (fig) {
        var t = fig.getAttribute("string-sequence-trigger") || "";
        return t.indexOf(cfg.id + "[") === 0 && /\[\d+\]/.test(t);
      });

      // Prefer figures inside the main controller when both satellites + slides match
      var controller = root.querySelector(".sequence-controller, .figure-sequence, .sequence-canvas");
      if (controller) {
        var controlled = slides.filter(function (fig) {
          return controller.contains(fig);
        });
        if (controlled.length) slides = controlled;
      }

      if (!slides.length) return;

      slides.sort(function (a, b) {
        var ia = +(a.getAttribute("string-sequence-trigger").match(/\[(\d+)\]/) || [])[1];
        var ib = +(b.getAttribute("string-sequence-trigger").match(/\[(\d+)\]/) || [])[1];
        return ia - ib;
      });

      var activeAttr = (controller && controller.getAttribute("string-active-step")) || "";
      if (!activeAttr) {
        var stepHost = root.querySelector("[string-active-step]");
        activeAttr = (stepHost && stepHost.getAttribute("string-active-step")) || "";
      }
      var m = activeAttr.match(/\[(\d+)\]/);
      var index = m ? +m[1] : 0;
      if (index < 0 || index >= slides.length) index = 0;

      var orderEl = root.querySelector(".order");
      var nameEl = root.querySelector(".place-name");
      var leavingTimer = 0;

      function setIndex(next, opts) {
        opts = opts || {};
        var total = slides.length;
        if (opts.loop) {
          next = ((next % total) + total) % total;
        } else {
          next = Math.max(0, Math.min(total - 1, next));
        }
        if (next === index && opts.force !== true) return;

        var prev = index;
        index = next;

        slides.forEach(function (fig, i) {
          fig.classList.remove("-active", "-entering", "-leaving");
          if (i === prev && prev !== index && !reduced) {
            fig.classList.add("-leaving");
          }
          if (i === index) {
            fig.classList.add(reduced || opts.force ? "-active" : "-entering", "-active");
          }
        });

        if (leavingTimer) window.clearTimeout(leavingTimer);
        leavingTimer = window.setTimeout(function () {
          slides.forEach(function (fig) {
            fig.classList.remove("-entering", "-leaving");
            if (fig === slides[index]) fig.classList.add("-active");
          });
        }, reduced ? 0 : 900);

        if (orderEl) {
          var cur = orderEl.querySelector("span > span:first-child") || orderEl.querySelector("span");
          if (cur && cur.childNodes.length) {
            // structure: <span><span>4</span><span>/7</span></span>
            var nums = orderEl.querySelectorAll("span span");
            if (nums.length >= 2) {
              nums[0].textContent = String(index + 1);
              nums[1].textContent = "/" + total;
            } else {
              orderEl.textContent = index + 1 + "/" + total;
            }
          }
        }

        if (nameEl && cfg.names && cfg.names[index]) {
          var label = nameEl.querySelector("[string], span") || nameEl;
          // Keep simple text; char-split animation skipped
          var target = nameEl.querySelector(":scope > span") || nameEl;
          target.textContent = cfg.names[index];
        }

        // Highlight matching satellite panels
        root.querySelectorAll(".i[string-sequence-trigger]").forEach(function (sat) {
          var tm = (sat.getAttribute("string-sequence-trigger") || "").match(/\[(\d+)\]/);
          sat.classList.toggle("-active", tm && +tm[1] === index);
        });

        // Featured / updates: sync each figure-sequence column by string-sequence index
        if (cfg.syncSequenceAttr) {
          root.querySelectorAll(".figure-sequence").forEach(function (col) {
            var figs = col.querySelectorAll("figure[string-sequence]");
            figs.forEach(function (fig) {
              var sm = (fig.getAttribute("string-sequence") || "").match(/\[(\d+)\]/);
              var on = sm && +sm[1] === index;
              fig.classList.remove("-entering", "-leaving");
              fig.classList.toggle("-active", !!on);
            });
          });
          root.querySelectorAll(".sequence-nav .num[string-sequence-trigger]").forEach(function (num) {
            var nm = (num.getAttribute("string-sequence-trigger") || "").match(/\[(\d+)\]/);
            var on = nm && +nm[1] === index;
            num.classList.toggle("-active", !!on);
            num.classList.toggle("-state-active-main", !!on);
            num.classList.toggle("-state-active-neighbor", nm && Math.abs(+nm[1] - index) === 1);
          });
        }

        if (cfg.syncFeaturedCopy) {
          syncFeaturedCopy(root, index, total);
        }
      }

      // Prev / next
      root.querySelectorAll('[string-sequence-trigger*="prev"], [string-sequence-trigger*="next"]').forEach(function (btn) {
        var t = btn.getAttribute("string-sequence-trigger") || "";
        if (t.indexOf(cfg.id) !== 0) return;
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          var loop = t.indexOf("loop") !== -1;
          if (t.indexOf("prev") !== -1) setIndex(index - 1, { loop: loop });
          else if (t.indexOf("next") !== -1) setIndex(index + 1, { loop: loop });
        });
      });

      // Satellite / trigger clicks → jump to slide
      root.querySelectorAll("[string-sequence-trigger]").forEach(function (el) {
        var t = el.getAttribute("string-sequence-trigger") || "";
        if (t.indexOf(cfg.id + "[") !== 0) return;
        var mm = t.match(/\[(\d+)\]/);
        if (!mm) return;
        if (slides.indexOf(el) !== -1) return; // main slide itself
        el.style.cursor = "pointer";
        el.addEventListener("click", function (e) {
          e.preventDefault();
          setIndex(+mm[1], { loop: false });
        });
      });

      setIndex(index, { force: true });
    });
  }

  function bootWelcomePointer() {
    var welcome = document.querySelector(".c-welcome");
    if (!welcome || reduced) return;

    var stone = welcome.querySelector(".stone");
    var pathX = 0;
    var pathTarget = 0;
    var rafId = 0;

    function tick() {
      pathX += (pathTarget - pathX) * 0.12;
      welcome.style.setProperty("--x", pathX.toFixed(2));
      if (Math.abs(pathTarget - pathX) > 0.2) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = 0;
      }
    }

    welcome.addEventListener(
      "pointermove",
      function (e) {
        pathTarget = (e.clientX / Math.max(window.innerWidth, 1) - 0.5) * 12;
        if (!rafId) rafId = requestAnimationFrame(tick);

        if (stone) {
          var rect = stone.getBoundingClientRect();
          var dx = e.clientX - (rect.left + rect.width * 0.5);
          var dy = e.clientY - (rect.top + rect.height * 0.5);
          welcome.style.setProperty(
            "--spotlight-angle",
            ((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(2)
          );
          welcome.style.setProperty(
            "--spotlight-distance",
            Math.min(1500, Math.hypot(dx, dy)).toFixed(1)
          );
        }
      },
      { passive: true }
    );
  }

  /**
   * 3D mouse tilt for the hero type logo + front art.
   * Sets --mx/--my on .c-welcome and rotates a "light" angle for the shadow sheen.
   */
  function bootTypeLogoTilt() {
    var welcome = document.querySelector(".c-welcome");
    if (!welcome || reduced) return;

    var rendered = { x: 0, y: 0 };
    var target = { x: 0, y: 0 };
    var rafId = 0;
    var lastLight = "";

    function tick() {
      rendered.x += (target.x - rendered.x) * 0.12;
      rendered.y += (target.y - rendered.y) * 0.12;

      var mx = rendered.x.toFixed(4);
      var my = rendered.y.toFixed(4);
      welcome.style.setProperty("--mx", mx);
      welcome.style.setProperty("--my", my);

      var light = ((Math.atan2(rendered.y, rendered.x) * 180) / Math.PI).toFixed(2);
      if (light !== lastLight) {
        welcome.style.setProperty("--logo-light", light + "deg");
        lastLight = light;
      }

      if (
        Math.abs(target.x - rendered.x) > 0.001 ||
        Math.abs(target.y - rendered.y) > 0.001
      ) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = 0;
      }
    }

    window.addEventListener(
      "pointermove",
      function (e) {
        var w = window.innerWidth || 1;
        var h = window.innerHeight || 1;
        target.x = (e.clientX / w - 0.5) * 2;
        target.y = (e.clientY / h - 0.5) * 2;
        if (!rafId) rafId = requestAnimationFrame(tick);
      },
      { passive: true }
    );

    document.documentElement.addEventListener("pointerleave", function () {
      target.x = 0;
      target.y = 0;
      if (!rafId) rafId = requestAnimationFrame(tick);
    });

    welcome.style.setProperty("--mx", "0");
    welcome.style.setProperty("--my", "0");
    welcome.style.setProperty("--logo-light", "180deg");
  }

  function bootGridStages() {
    function apply() {
      var desktop = window.matchMedia("(min-width: 1024px)").matches;
      document.querySelectorAll(".c-places .sticky-container .-gc").forEach(function (el) {
        el.style.setProperty("--columns", desktop ? "12" : "1");
        el.style.setProperty("--rows", desktop ? "20" : "1");
      });
    }
    apply();
    window.addEventListener("resize", apply, { passive: true });
  }

  function bootAimyChrome() {
    var header = document.querySelector(".site-header[data-aimy-chrome]");
    if (header && header.parentElement !== document.body) {
      document.body.insertBefore(header, document.body.firstChild);
    }

    if (!header) return;

    /* Socials scroll hide/show is owned by Polykroma */
    if (window.Polykroma && typeof window.Polykroma.bootSocialsScroll === "function") {
      window.Polykroma.bootSocialsScroll({ header: header });
    }

    var sections = document.querySelectorAll(
      "[data-header-color], #work, #featured, #insights, #about, #contact, .c-welcome, .c-places-after, .c-objects, .c-updates, .c-people, .c-admission"
    );

    var ticking = false;

    function sync() {
      var mid = window.innerHeight * 0.22;
      var activeColor = "dark";

      sections.forEach(function (sec) {
        var r = sec.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) {
          var c = sec.getAttribute("data-header-color");
          if (c === "light") activeColor = "light";
          else if (c === "dark") activeColor = "dark";
          else if (
            sec.classList.contains("c-places-after") ||
            sec.classList.contains("c-objects") ||
            sec.classList.contains("c-admission")
          ) {
            activeColor = "light";
          } else {
            activeColor = "dark";
          }
        }
      });

      header.classList.toggle("is-on-light", activeColor === "light");
      header.classList.toggle("is-on-dark", activeColor === "dark");
    }

    function requestSync() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        sync();
      });
    }

    window.addEventListener("scroll", requestSync, { passive: true });
    if (window.__lenis) window.__lenis.on("scroll", requestSync);
    sync();
  }

  function bootHeaderTheme() {
    // Legacy header theme — no-op once Aimy chrome is present
    if (document.querySelector(".site-header")) return;
    var header = document.querySelector("header");
    if (!header) return;

    var sections = document.querySelectorAll("[data-header-color]");
    if (!sections.length) return;

    var ticking = false;

    function sync() {
      ticking = false;
      var active = "light";
      var mid = window.innerHeight * 0.2;
      sections.forEach(function (sec) {
        var r = sec.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) {
          active = sec.getAttribute("data-header-color") || active;
        }
      });
      header.classList.toggle("-dark", active === "dark");
    }

    function requestSync() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(sync);
    }

    window.addEventListener("scroll", requestSync, { passive: true });
    if (window.__lenis) window.__lenis.on("scroll", requestSync);
    if (typeof ScrollTrigger !== "undefined") {
      ScrollTrigger.addEventListener("update", requestSync);
    }
    sync();
  }

  function boot() {
    bootReveal(function () {
      unlockScroll();
      setViewportUnits();
      window.addEventListener("resize", setViewportUnits, { passive: true });

      var isStartPage = !!document.querySelector("[data-start-work]");

      bootLenis();

      if (isStartPage) {
        /* Keep the hero's original scroll parallax without booting removed sections. */
        bootProgress();
        bootWelcomePointer();
        bootTypeLogoTilt();
      } else {
        bootProgress();
        bootGridStages();
        bootSequencers();
        bootWelcomePointer();
        bootTypeLogoTilt();
      }

      bootAimyChrome();
      bootHeaderTheme();

      document.documentElement.classList.add("-loaded");
      window.setTimeout(function () {
        document.documentElement.classList.add("-ready");
      }, reduced ? 0 : 50);

      if (typeof ScrollTrigger !== "undefined") {
        ScrollTrigger.refresh();
        window.addEventListener(
          "load",
          function () {
            ScrollTrigger.refresh();
          },
          { once: true }
        );
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
