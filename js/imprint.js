/**
 * imprint.js — Legal page: hub picker, panel views, line reveals, hash routing.
 * SPA: ImprintPage.boot(scope) / ImprintPage.unmount()
 */
(function () {
  "use strict";

  var active = null;

  function boot(scope) {
    unmount();
    scope = scope || document;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const stage = scope.querySelector(".imprint-stage[data-imprint-phase]");
      const hub = scope.querySelector("[data-imprint-hub]");
      const content = scope.querySelector("[data-imprint-content]");
      const pickerBtns = scope.querySelectorAll(".imprint-picker__btn[data-imprint-panel]");
      const panels = scope.querySelectorAll(".imprint-panel[data-imprint-panel]");

      const PANEL_TITLES = {
        imprint: "Imprint.",
        terms: "Terms",
        policy: "Policy",
      };

      const PAGE_TITLES = {
        hub: "Yaaaaaaawn… Say Again?",
        imprint: "The Boring Bits",
        terms: "The Even More Boring Bits",
        policy: "Zzz…",
      };

      const VALID_PANELS = Object.keys(PANEL_TITLES);
      const revealObservers = [];
      let resizeTimer = null;
      let revealFallbackTimer = null;
      let phaseTimer = null;
      let scrollRevealHandler = null;
      let scrollRevealRaf = null;
      let contentReadyToken = 0;
      let imprintHashLock = false;
      const PHASE_MS = reduced ? 0 : 680;

      function setRevealMode(armed) {
        document.body.classList.toggle("imprint-reveals-ready", armed);
        document.body.classList.toggle("imprint-reveals-reduced", armed && reduced);
      }

      function bootLenis() {
        if (window.__lenis) return window.__lenis;
        if (window.Polyglide) return window.Polyglide.boot();
        return null;
      }

      function imprintRouteBase() {
        if (window.AimySpa && typeof window.AimySpa.buildUrl === "function") {
          return window.AimySpa.buildUrl("imprint", {});
        }
        return window.location.pathname + window.location.search;
      }

      function scrollToTop(options = {}) {
        const immediate = options.immediate === true || options.duration === 0.01;

        if (window.__lenis && typeof window.__lenis.scrollTo === "function") {
          window.__lenis.scrollTo(0, {
            immediate: immediate,
            duration: immediate ? 0 : options.duration != null ? options.duration : 1.15,
          });
        } else {
          window.scrollTo({
            top: 0,
            behavior: immediate || reduced ? "auto" : "smooth",
          });
        }
      }

      function scrollToTopImmediate() {
        scrollToTop({ immediate: true, duration: 0.01 });
      }

      function normalizePanel(id) {
        return VALID_PANELS.indexOf(id) !== -1 ? id : "imprint";
      }

      function syncBackChrome(visible) {
        if (!window.AimySpaSubBack) return;
        if (!visible) {
          window.AimySpaSubBack.hide();
          return;
        }
        window.setTimeout(
          function () {
            if (!stage || stage.dataset.imprintPhase !== "open") return;
            window.AimySpaSubBack.show({
              onClick: function () {
                setPhase("choose", null, { updateHash: true, scrollTop: true });
              },
            });
          },
          reduced ? 0 : 280
        );
      }

      function unbindScrollReveals() {
        if (scrollRevealRaf) {
          cancelAnimationFrame(scrollRevealRaf);
          scrollRevealRaf = null;
        }
        if (!scrollRevealHandler) return;
        if (window.__lenis && typeof window.__lenis.off === "function") {
          window.__lenis.off("scroll", scrollRevealHandler);
        } else {
          window.removeEventListener("scroll", scrollRevealHandler);
        }
        scrollRevealHandler = null;
      }

      function teardownReveals() {
        while (revealObservers.length) {
          const observer = revealObservers.pop();
          if (observer && observer.disconnect) observer.disconnect();
        }
        unbindScrollReveals();
        if (revealFallbackTimer) {
          window.clearTimeout(revealFallbackTimer);
          revealFallbackTimer = null;
        }
        setRevealMode(false);
      }

      function revealAllLines(lines) {
        lines.forEach((line) => revealLine(line));
      }

      function scheduleRevealFallback(lines) {
        if (revealFallbackTimer) window.clearTimeout(revealFallbackTimer);
        revealFallbackTimer = window.setTimeout(() => {
          revealFallbackTimer = null;
          revealLinesInView(pendingRevealLines(lines));
        }, 480);
      }

      function afterLayout(callback) {
        requestAnimationFrame(() => {
          requestAnimationFrame(callback);
        });
      }

      function whenContentReady(callback) {
        const token = contentReadyToken;

        function finish() {
          if (token !== contentReadyToken) return;
          afterLayout(callback);
        }

        if (!PHASE_MS) {
          finish();
          return;
        }

        let settled = false;

        function done() {
          if (settled || token !== contentReadyToken) return;
          settled = true;
          if (content) content.removeEventListener("transitionend", onTransitionEnd);
          window.clearTimeout(fallbackTimer);
          finish();
        }

        function onTransitionEnd(event) {
          if (!content || event.target !== content) return;
          if (event.propertyName !== "opacity" && event.propertyName !== "transform") return;
          done();
        }

        if (content) {
          content.addEventListener("transitionend", onTransitionEnd);
          const style = getComputedStyle(content);
          if (parseFloat(style.opacity) >= 0.99 && style.visibility === "visible") {
            window.setTimeout(done, 120);
          }
        }

        const fallbackTimer = window.setTimeout(done, PHASE_MS + 180);
      }

      function afterPhaseTransition(callback) {
        if (phaseTimer) window.clearTimeout(phaseTimer);
        if (!PHASE_MS) {
          afterLayout(callback);
          return;
        }
        phaseTimer = window.setTimeout(() => {
          phaseTimer = null;
          afterLayout(callback);
        }, PHASE_MS);
      }

      function clearPhaseTimer() {
        if (!phaseTimer) return;
        window.clearTimeout(phaseTimer);
        phaseTimer = null;
      }

      function restorePanelReveals(panel) {
        if (!panel) return;
        panel.querySelectorAll(".imprint-reveal-block[data-imprint-lines-ready]").forEach((block) => {
          if (block.dataset.imprintOriginal != null) {
            block.innerHTML = block.dataset.imprintOriginal;
          }
          block.classList.remove("imprint-reveal-block");
          delete block.dataset.imprintLinesReady;
          delete block.dataset.imprintOriginal;
        });
      }

      function restoreHeroReveal() {
        if (!content) return;
        const hero = content.querySelector(".imprint-content__head .ins-logs-hub__title");
        if (!hero || hero.dataset.imprintLinesReady !== "1") return;

        if (hero.dataset.imprintOriginal != null) {
          hero.innerHTML = hero.dataset.imprintOriginal;
        }
        hero.classList.remove("imprint-reveal-block");
        delete hero.dataset.imprintLinesReady;
        delete hero.dataset.imprintOriginal;
      }

      function restoreAllPanelReveals() {
        panels.forEach((panel) => restorePanelReveals(panel));
        restoreHeroReveal();
      }

      function wrapWordsInBlock(block) {
        function processNode(node) {
          if (node.nodeType === Node.TEXT_NODE) {
            const parts = node.textContent.split(/(\s+)/);
            const frag = document.createDocumentFragment();
            parts.forEach((part) => {
              if (!part) return;
              if (/^\s+$/.test(part)) {
                frag.appendChild(document.createTextNode(part));
              } else {
                const span = document.createElement("span");
                span.className = "imprint-line-word";
                span.textContent = part;
                frag.appendChild(span);
              }
            });
            node.replaceWith(frag);
            return;
          }

          if (node.nodeType !== Node.ELEMENT_NODE) return;

          if (node.tagName === "BR") {
            const marker = document.createElement("span");
            marker.className = "imprint-line-break";
            marker.setAttribute("aria-hidden", "true");
            node.replaceWith(marker);
            return;
          }

          if (node.tagName === "A") {
            node.classList.add("imprint-line-word", "imprint-line-link");
            return;
          }

          Array.from(node.childNodes).forEach(processNode);
        }

        Array.from(block.childNodes).forEach(processNode);
      }

      function segmentIsBlank(nodes) {
        if (!nodes.length) return true;
        return nodes.every(function (node) {
          return node.nodeType === Node.TEXT_NODE && !node.textContent.trim();
        });
      }

      function flattenSegmentNodes(nodes) {
        const flat = [];

        function walk(node) {
          if (node instanceof Element && node.classList.contains("imprint-line-break")) {
            flat.push(node);
            return;
          }
          if (node instanceof Element && node.classList.contains("imprint-line-word")) {
            flat.push(node);
            return;
          }
          if (node.nodeType === Node.TEXT_NODE) {
            if (node.textContent) flat.push(node);
            return;
          }
          if (node instanceof Element) {
            Array.from(node.childNodes).forEach(walk);
          }
        }

        nodes.forEach(walk);
        return flat;
      }

      function collectLineGroups(block) {
        const segments = [];
        let segment = [];

        Array.from(block.childNodes).forEach((node) => {
          if (node instanceof Element && node.classList.contains("imprint-line-break")) {
            segments.push(segmentIsBlank(segment) ? [] : segment);
            segment = [];
            return;
          }
          segment.push(node);
        });

        if (segment.length && !segmentIsBlank(segment)) segments.push(segment);
        if (!segments.length) segments.push([]);

        const groups = [];

        segments.forEach((nodes) => {
          if (!nodes.length) {
            groups.push([]);
            return;
          }

          const flat = flattenSegmentNodes(nodes);
          if (!flat.length) {
            groups.push([]);
            return;
          }

          let line = [];
          let lastTop = null;

          flat.forEach((node) => {
            if (node instanceof Element && node.classList.contains("imprint-line-word")) {
              const top = Math.round(node.offsetTop);
              if (lastTop !== null && top > lastTop + 1) {
                if (line.length) groups.push(line);
                line = [];
              }
              lastTop = top;
              line.push(node);
              return;
            }

            if (line.length) line.push(node);
          });

          if (line.length) groups.push(line);
        });

        return groups;
      }

      function appendBlankRevealLine(block) {
        const line = createRevealLine([]);
        const spacer = document.createElement("span");
        spacer.className = "imprint-line-spacer";
        spacer.setAttribute("aria-hidden", "true");
        spacer.textContent = "\u00a0";
        line.querySelector(".imprint-line__inner").appendChild(spacer);
        block.appendChild(line);
        return line;
      }

      function createRevealLine(nodes) {
        const line = document.createElement("span");
        line.className = "imprint-line";
        const inner = document.createElement("span");
        inner.className = "imprint-line__inner";
        nodes.forEach((node) => inner.appendChild(node));
        line.appendChild(inner);
        return line;
      }

      function splitBlockIntoLines(block) {
        if (block.dataset.imprintLinesReady === "1") {
          const existing = Array.from(block.querySelectorAll(".imprint-line"));
          if (existing.length) return existing;
          if (block.dataset.imprintOriginal != null) {
            block.innerHTML = block.dataset.imprintOriginal;
          }
          block.classList.remove("imprint-reveal-block");
          delete block.dataset.imprintLinesReady;
          delete block.dataset.imprintOriginal;
        }

        block.dataset.imprintOriginal = block.innerHTML;
        block.innerHTML = block.dataset.imprintOriginal;
        wrapWordsInBlock(block);

        const groups = collectLineGroups(block);

        if (!groups.length && block.textContent.trim()) {
          const fallback = document.createElement("span");
          fallback.className = "imprint-line-word";
          fallback.textContent = block.textContent.trim();
          groups.push([fallback]);
        }

        block.textContent = "";
        block.classList.add("imprint-reveal-block");
        block.dataset.imprintLinesReady = "1";

        return groups.map((nodes) => {
          if (!nodes.length) return appendBlankRevealLine(block);
          const line = createRevealLine(nodes);
          block.appendChild(line);
          return line;
        });
      }

      function revealTargetsForPanel(panel) {
        const blocks = [];
        if (content) {
          const hero = content.querySelector(".imprint-content__head .ins-logs-hub__title");
          if (hero) blocks.push(hero);
        }
        panel.querySelectorAll(".pl-text, .pl-title").forEach((block) => blocks.push(block));
        return blocks;
      }

      function revealLine(line, delayMs) {
        const inner = line.querySelector(".imprint-line__inner");
        if (!inner || inner.classList.contains("is-in")) return;

        if (delayMs > 0) {
          window.setTimeout(function () {
            if (inner.isConnected && !inner.classList.contains("is-in")) {
              inner.classList.add("is-in");
            }
          }, delayMs);
          return;
        }

        inner.classList.add("is-in");
      }

      function pendingRevealLines(lines) {
        return lines.filter((line) => {
          const inner = line.querySelector(".imprint-line__inner");
          return inner && !inner.classList.contains("is-in");
        });
      }

      function revealLinesInView(lines, options) {
        options = options || {};
        const stagger = options.stagger || 0;
        const edge = window.innerHeight * 0.96;
        let index = 0;

        lines.forEach((line) => {
          const inner = line.querySelector(".imprint-line__inner");
          if (!inner || inner.classList.contains("is-in")) return;
          const rect = line.getBoundingClientRect();
          if (rect.top < edge && rect.bottom > 0) {
            revealLine(line, stagger ? index * stagger : 0);
            index++;
          }
        });
      }

      function bindScrollReveals(lines) {
        unbindScrollReveals();
        if (reduced || !lines.length) return;

        scrollRevealHandler = function () {
          const pending = pendingRevealLines(lines);
          if (!pending.length) {
            unbindScrollReveals();
            return;
          }
          revealLinesInView(pending);
        };

        if (window.__lenis && typeof window.__lenis.on === "function") {
          window.__lenis.on("scroll", scrollRevealHandler);
        }
        window.addEventListener("scroll", scrollRevealHandler, { passive: true });

        function tick() {
          if (!scrollRevealHandler) return;
          scrollRevealHandler();
          if (scrollRevealHandler) {
            scrollRevealRaf = requestAnimationFrame(tick);
          }
        }

        scrollRevealRaf = requestAnimationFrame(tick);
      }

      function bootLineObservers(lines) {
        if (reduced || !("IntersectionObserver" in window)) {
          lines.forEach((line) => revealLine(line));
          return;
        }

        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              revealLine(entry.target);
              observer.unobserve(entry.target);
            });
            if (!pendingRevealLines(lines).length) unbindScrollReveals();
          },
          { root: null, rootMargin: "0px 0px -2% 0px", threshold: 0.01 }
        );

        lines.forEach((line) => observer.observe(line));
        revealObservers.push(observer);
        bindScrollReveals(lines);
      }

      function bootPanelReveals(panel) {
        if (!panel) return;

        teardownReveals();

        afterLayout(() => {
          if (!panel.isConnected || panel.hidden) return;

          const blocks = revealTargetsForPanel(panel);
          if (!blocks.length) return;

          const lines = [];
          blocks.forEach((block) => {
            splitBlockIntoLines(block).forEach((line) => lines.push(line));
          });

          if (!lines.length) return;

          if (reduced) {
            revealAllLines(lines);
            return;
          }

          setRevealMode(true);
          void document.body.offsetHeight;

          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              revealLinesInView(lines, { stagger: 52 });
              bootLineObservers(lines);
              scheduleRevealFallback(lines);
            });
          });
        });
      }

      function scheduleRevealBoot(panelId) {
        const id = normalizePanel(panelId);

        whenContentReady(function () {
          if (!stage || stage.dataset.imprintPhase !== "open") return;
          const panel = document.querySelector('.imprint-panel.is-active[data-imprint-panel="' + id + '"]');
          bootPanelReveals(panel);
        });
      }

      function openPanel(panelId, options) {
        options = options || {};
        scrollToTopImmediate();
        const id = normalizePanel(panelId);

        function resolvePanel() {
          return document.querySelector('.imprint-panel.is-active[data-imprint-panel="' + id + '"]');
        }

        function boot() {
          bootPanelReveals(resolvePanel());
        }

        if (options.waitForTransition) {
          scheduleRevealBoot(id);
          window.setTimeout(function () {
            if (document.body.classList.contains("imprint-reveals-ready")) return;
            if (document.querySelector(".imprint-line")) return;
            boot();
          }, PHASE_MS + 420);
          return;
        }

        boot();
      }

      function syncPageTitle(phase, panelId) {
        if (phase === "choose") {
          document.title = PAGE_TITLES.hub;
          return;
        }
        document.title = PAGE_TITLES[panelId] || PAGE_TITLES.hub;
      }

      function setActivePanel(panelId, options = {}) {
        const id = normalizePanel(panelId);
        const restoreOthers = options.restoreOthers !== false;

        pickerBtns.forEach((btn) => {
          const active = btn.dataset.imprintPanel === id;
          btn.classList.toggle("is-active", active);
          btn.setAttribute("aria-pressed", active ? "true" : "false");
        });

        panels.forEach((panel) => {
          const active = panel.dataset.imprintPanel === id;
          if (restoreOthers && !active) restorePanelReveals(panel);
          panel.classList.toggle("is-active", active);
          panel.hidden = !active;
        });

        const heroTitle = content && content.querySelector(".imprint-content__head .ins-logs-hub__title");
        if (heroTitle && PANEL_TITLES[id]) {
          if (heroTitle.dataset.imprintLinesReady === "1") {
            restoreHeroReveal();
          }
          heroTitle.innerHTML =
            '<span class="ins-logs-hub__title-line" data-imprint-title>' + PANEL_TITLES[id] + "</span>";
        }

        return id;
      }

      function setPhase(phase, panelId, options = {}) {
        const open = phase === "open";
        const updateHash = options.updateHash !== false;
        const wasOpen = stage && stage.dataset.imprintPhase === "open";
        const nextId = normalizePanel(panelId || "imprint");

        if (open && wasOpen) {
          const currentId = document.querySelector(".imprint-panel.is-active")?.dataset.imprintPanel;
          if (currentId === nextId) return;

          clearPhaseTimer();
          contentReadyToken++;
          const id = setActivePanel(nextId);
          syncPageTitle("open", id);

          if (updateHash) {
            const nextHash = "#" + id;
            if (window.location.hash !== nextHash) {
              imprintHashLock = true;
              history.replaceState(null, "", imprintRouteBase() + nextHash);
              window.setTimeout(function () {
                imprintHashLock = false;
              }, 0);
            }
          }

          if (options.scrollTop !== false) {
            scrollToTopImmediate();
          }

          openPanel(id);
          return;
        }

        clearPhaseTimer();
        contentReadyToken++;

        if (stage) stage.dataset.imprintPhase = open ? "open" : "choose";

        if (hub) hub.hidden = false;
        if (content) content.hidden = false;

        document.body.classList.toggle("imprint-phase-choose", !open);
        document.body.classList.toggle("imprint-phase-open", open);

        syncBackChrome(open);

        if (!open) {
          syncPageTitle("choose");
          teardownReveals();

          pickerBtns.forEach((btn) => {
            btn.classList.remove("is-active");
            btn.setAttribute("aria-pressed", "false");
          });

          if (updateHash) {
            const base = imprintRouteBase();
            if (window.location.hash) {
              history.replaceState(null, "", base);
            }
          }

          if (options.scrollTop !== false) {
            scrollToTop({ duration: reduced ? 0.01 : 0.85 });
          }

          afterPhaseTransition(() => {
            if (!stage || stage.dataset.imprintPhase !== "choose") return;
            restoreAllPanelReveals();
            if (content) content.hidden = true;
          });
          return;
        }

        const id = setActivePanel(nextId);
        syncPageTitle("open", id);

        if (updateHash) {
          const nextHash = "#" + id;
          if (window.location.hash !== nextHash) {
            imprintHashLock = true;
            history.replaceState(null, "", imprintRouteBase() + nextHash);
            window.setTimeout(function () {
              imprintHashLock = false;
            }, 0);
          }
        }

        if (options.scrollTop !== false) {
          scrollToTopImmediate();
        }

        openPanel(id, { waitForTransition: !options.immediateReveals });
      }

      function bootImprintHub() {
        if (!pickerBtns.length || !panels.length) return null;

        const pickerHandlers = [];
        pickerBtns.forEach((btn) => {
          const onPick = () => {
            setPhase("open", btn.dataset.imprintPanel, { updateHash: true, scrollTop: true });
          };
          btn.addEventListener("click", onPick);
          pickerHandlers.push({ btn, onPick });
        });

        const hashId = window.location.hash.replace("#", "");
        if (hashId && VALID_PANELS.indexOf(hashId) !== -1) {
          setPhase("open", hashId, { updateHash: false, immediateReveals: true });
        } else {
          setPhase("choose", null, { updateHash: false, scrollTop: false });
        }

        const onHashChange = () => {
          if (imprintHashLock) return;
          const id = window.location.hash.replace("#", "");
          if (!id) {
            setPhase("choose", null, { updateHash: false, scrollTop: true });
            return;
          }
          if (VALID_PANELS.indexOf(id) !== -1) {
            const currentId = document.querySelector(".imprint-panel.is-active")?.dataset.imprintPanel;
            if (stage && stage.dataset.imprintPhase === "open" && currentId === id) return;
            setPhase("open", id, { updateHash: false, scrollTop: true });
          }
        };
        window.addEventListener("hashchange", onHashChange);

        const onResize = () => {
          if (!stage || stage.dataset.imprintPhase !== "open") return;
          window.clearTimeout(resizeTimer);
          resizeTimer = window.setTimeout(() => {
            const panel = document.querySelector(".imprint-panel.is-active");
            if (!panel) return;
            restorePanelReveals(panel);
            restoreHeroReveal();
            bootPanelReveals(panel);
          }, 220);
        };
        window.addEventListener("resize", onResize);

        return { pickerHandlers, onHashChange, onResize };
      }

      if (stage) {
        stage.classList.add("active", "is-active");
      } else {
        return null;
      }

      bootLenis();
      const hubBindings = bootImprintHub();

      active = {
        stage: stage,
        hubBindings: hubBindings,
        teardown: function () {
          teardownReveals();
          clearPhaseTimer();
          if (resizeTimer) window.clearTimeout(resizeTimer);
          if (revealFallbackTimer) window.clearTimeout(revealFallbackTimer);
          if (hubBindings && hubBindings.pickerHandlers) {
            hubBindings.pickerHandlers.forEach(function (entry) {
              entry.btn.removeEventListener("click", entry.onPick);
            });
            window.removeEventListener("hashchange", hubBindings.onHashChange);
            window.removeEventListener("resize", hubBindings.onResize);
          }
          if (window.AimySpaSubBack) window.AimySpaSubBack.hide();
          document.body.classList.remove(
            "imprint-phase-choose",
            "imprint-phase-open",
            "imprint-reveals-ready",
            "imprint-reveals-reduced"
          );
          if (stage) stage.dataset.imprintPhase = "choose";
        },
      };

      return active;

  }

  function unmount() {
    if (!active) return;
    if (typeof active.teardown === "function") active.teardown();
    active = null;
  }

  window.ImprintPage = { boot: boot, unmount: unmount };

  if (document.body && !document.body.hasAttribute("data-spa-host")) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        active = boot(document);
      });
    } else {
      active = boot(document);
    }
  }
})();
