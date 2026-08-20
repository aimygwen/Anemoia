/**
 * view-insights.js — Insights Logs hub + topic routing.
 */
(function () {
  "use strict";

  window.SpaPages = window.SpaPages || {};

  var LOG_IDS = ["identity", "workspace", "hytale"];
  var LOG_LABELS = {
    identity: { title: "Vibe shit", sub: "Branding" },
    workspace: { title: "Workspace", sub: "My desk and how I work" },
    hytale: { title: "Hytale", sub: "Models, UV mapping, and structure" },
  };

  var LOG_NEXT = {
    identity: "workspace",
    workspace: "hytale",
    hytale: "identity",
  };

  var DECK_REVEAL_STAGGER_MS = 120;
  var activeLog = null;
  var mountToken = 0;
  var deckRevealTimers = [];
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var logNextLink = null;
  var logNextScrollRaf = 0;
  var logNextScrollBound = false;

  function restoreLogNextFooter() {
    teardownLogNextScroll();

    var dock = document.querySelector("[data-ins-log-next-dock]");
    if (!dock) return;

    var orphanLink = document.body.querySelector(":scope > [data-ins-log-next-link]");
    if (orphanLink) {
      orphanLink.classList.remove("ins-log__next-peek");
      orphanLink.style.top = "";
      orphanLink.style.bottom = "";
      orphanLink.style.transform = "";
      orphanLink.style.visibility = "";
      dock.appendChild(orphanLink);
    }

    logNextLink = null;

    var orphanDock = document.body.querySelector(":scope > [data-ins-log-next-dock]");
    if (orphanDock) orphanDock.remove();
  }

  function ensureLogNextLink() {
    if (logNextLink && document.body.contains(logNextLink)) return logNextLink;

    var link = findLogNextLink();
    if (!link) return null;

    link.classList.add("ins-log__next-peek");
    link.style.left = "50%";
    document.body.appendChild(link);
    logNextLink = link;
    return logNextLink;
  }

  function findLogNextLink() {
    return (
      document.body.querySelector(":scope > [data-ins-log-next-link]") ||
      document.querySelector("[data-ins-log-next-scroll] [data-ins-log-next-link]")
    );
  }

  function getLogNextHalf() {
    var scroll = document.querySelector("[data-ins-log-next-scroll]");
    if (scroll && scroll.offsetHeight) return scroll.offsetHeight;
    var link = logNextLink || findLogNextLink();
    return link && link.offsetHeight ? link.offsetHeight * 0.5 : 0;
  }

  function syncLogNextPosition() {
    logNextScrollRaf = 0;

    var scroll = document.querySelector("[data-ins-log-next-scroll]");
    var link = ensureLogNextLink();
    if (!scroll || scroll.hidden || !link) return;

    var anchorBottom = scroll.getBoundingClientRect().bottom;
    var half = getLogNextHalf();
    var vh = window.innerHeight;
    var atEnd = anchorBottom >= vh - 2;

    if (atEnd) {
      link.style.top = "auto";
      link.style.bottom = "0";
      link.style.transform = "translate(-50%, 50%)";
    } else {
      link.style.bottom = "auto";
      link.style.top = anchorBottom + "px";
      link.style.transform = "translate(-50%, -50%)";
    }

    if (anchorBottom + half < 0 || anchorBottom - half > vh) {
      link.style.visibility = "hidden";
      link.style.pointerEvents = "none";
      link.setAttribute("aria-hidden", "true");
      return;
    }

    link.style.visibility = "visible";
    link.style.pointerEvents = "auto";
    link.setAttribute("aria-hidden", "false");
  }

  function requestLogNextPosition() {
    if (logNextScrollRaf) return;
    logNextScrollRaf = window.requestAnimationFrame(syncLogNextPosition);
  }

  function bindLogNextScroll() {
    if (logNextScrollBound) return;
    logNextScrollBound = true;

    window.addEventListener("scroll", requestLogNextPosition, { passive: true });
    window.addEventListener("resize", requestLogNextPosition, { passive: true });

    if (window.__lenis && typeof window.__lenis.on === "function") {
      window.__lenis.on("scroll", requestLogNextPosition);
    }
  }

  function teardownLogNextScroll() {
    if (logNextScrollRaf) {
      window.cancelAnimationFrame(logNextScrollRaf);
      logNextScrollRaf = 0;
    }

    if (!logNextScrollBound) return;
    logNextScrollBound = false;

    window.removeEventListener("scroll", requestLogNextPosition);
    window.removeEventListener("resize", requestLogNextPosition);

    if (window.__lenis && typeof window.__lenis.off === "function") {
      window.__lenis.off("scroll", requestLogNextPosition);
    }
  }

  function syncLogBackChrome(visible, logId) {
    if (visible && logId) {
      document.body.setAttribute("data-ins-active-log", logId);
    } else {
      document.body.removeAttribute("data-ins-active-log");
    }

    if (!window.AimySpaSubBack) return;
    if (!visible || !logId) {
      window.AimySpaSubBack.hide();
      return;
    }

    window.AimySpaSubBack.show({
      tone: logId === "workspace" ? "light" : null,
      onClick: function () {
        if (window.AimySpa && typeof window.AimySpa.navigate === "function") {
          window.AimySpa.navigate("./insights");
        }
      },
    });
  }

  function syncLogNextChrome(visible, logId) {
    restoreLogNextFooter();

    var scroll = document.querySelector("[data-ins-log-next-scroll]");
    if (!scroll) return;

    var link = scroll.querySelector("[data-ins-log-next-link]");
    var label = scroll.querySelector("[data-ins-log-next-label]");

    scroll.hidden = !visible;
    scroll.setAttribute("aria-hidden", visible ? "false" : "true");

    if (!visible || !logId) return;

    var nextId = LOG_NEXT[logId];
    if (link && nextId) {
      link.href = "./insights?log=" + encodeURIComponent(nextId);
      link.setAttribute("data-ins-log-next", nextId);
    }
    if (label && nextId && LOG_LABELS[nextId]) {
      label.textContent = LOG_LABELS[nextId].title;
    }

    if (
      window.SpaPages &&
      window.SpaPages.insightsRuntime &&
      typeof window.SpaPages.insightsRuntime.refreshNextHolo === "function"
    ) {
      window.SpaPages.insightsRuntime.refreshNextHolo();
    }

    ensureLogNextLink();
    bindLogNextScroll();
    syncLogNextPosition();

    window.requestAnimationFrame(function () {
      syncLogNextPosition();
      if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh(true);
    });
  }

  function normalizeLog(ctx) {
    if (window.AimySpa && typeof window.AimySpa.normalizeLog === "function") {
      return window.AimySpa.normalizeLog(ctx && ctx.query ? ctx.query.log : null);
    }
    var raw = ctx && ctx.query ? ctx.query.log : null;
    if (raw == null || raw === "") return null;
    var id = String(raw).toLowerCase();
    return LOG_IDS.indexOf(id) !== -1 ? id : null;
  }

  function insRoot() {
    return document.querySelector('[data-spa-view="insights"] [data-ins-logs-root]');
  }

  function scrollApi() {
    return window.AimySpaViews || {};
  }

  function setPhase(root, phase) {
    var choose = phase === "choose";
    var hub = root && root.querySelector("[data-ins-logs-hub]");
    var canvas = root && root.querySelector("[data-ins-logs-canvas]");
    if (hub) {
      hub.hidden = !choose;
      hub.setAttribute("data-ins-phase", choose ? "choose" : "open");
      hub.setAttribute("aria-hidden", choose ? "false" : "true");
    }
    if (canvas) {
      canvas.hidden = choose;
      canvas.setAttribute("aria-hidden", choose ? "true" : "false");
    }
    document.body.classList.toggle("ins-logs-choose", choose);
    document.body.classList.toggle("ins-logs-open", !choose);

    var api = scrollApi();
    if (choose) {
      if (typeof api.ensureScroll === "function") api.ensureScroll();
    } else {
      if (typeof api.unlockPageScroll === "function") api.unlockPageScroll();
      if (typeof api.ensureScroll === "function") api.ensureScroll();
    }
  }

  function syncPanels(root, logId) {
    if (!root) return;
    root.querySelectorAll("[data-ins-log-panel]").forEach(function (panel) {
      panel.hidden = !logId || panel.getAttribute("data-ins-log-panel") !== logId;
    });
    syncLogBackChrome(!!logId, logId);
    syncLogNextChrome(!!logId, logId);
  }

  function clearDeckReveal(root) {
    deckRevealTimers.forEach(function (id) {
      window.clearTimeout(id);
    });
    deckRevealTimers = [];
    if (!root) return;
    var deck = root.querySelector("[data-ins-logs-deck]");
    if (deck) deck.removeAttribute("data-deck-reveal");
    root.querySelectorAll(".ins-logs-deck__item").forEach(function (item) {
      item.classList.remove("is-revealed");
    });
  }

  function scheduleDeckReveal(fn, delay) {
    deckRevealTimers.push(window.setTimeout(fn, delay));
  }

  function playHubReveal(root) {
    var deck = root && root.querySelector("[data-ins-logs-deck]");
    if (!deck) return;
    var items = deck.querySelectorAll(".ins-logs-deck__item");
    clearDeckReveal(root);
    if (!items.length) return;

    if (reduced) {
      items.forEach(function (item) {
        item.classList.add("is-revealed");
      });
      return;
    }

    deck.setAttribute("data-deck-reveal", "1");
    requestAnimationFrame(function () {
      items.forEach(function (item, index) {
        scheduleDeckReveal(function () {
          item.classList.add("is-revealed");
        }, index * DECK_REVEAL_STAGGER_MS);
      });
      scheduleDeckReveal(function () {
        deck.removeAttribute("data-deck-reveal");
      }, items.length * DECK_REVEAL_STAGGER_MS + 500);
    });
  }

  function scrollToTop() {
    window.scrollTo(0, 0);
    if (window.Polyglide && typeof window.Polyglide.to === "function") {
      window.Polyglide.to(0, { duration: 0.01 });
    }
  }

  function showChooser(root) {
    setPhase(root, "choose");
    syncPanels(root, null);
    scrollToTop();
    playHubReveal(root);
  }

  function showLog(root, logId) {
    setPhase(root, "open");
    syncPanels(root, logId);
    scrollToTop();
    window.requestAnimationFrame(syncLogNextPosition);
  }

  function bindHub(root) {
    if (!root || root.__insLogsBound) return;
    root.__insLogsBound = true;

    root.addEventListener("click", function (e) {
      var item = e.target.closest("[data-ins-log-pick]");
      if (item) {
        var pickBtn = item.querySelector(".ins-logs-deck__pick");
        if (pickBtn && e.target !== pickBtn && !pickBtn.contains(e.target)) return;
        e.preventDefault();
        var logId = item.getAttribute("data-ins-log-pick");
        if (!logId || !window.AimySpa || typeof window.AimySpa.navigate !== "function") return;
        window.AimySpa.navigate("./insights?log=" + encodeURIComponent(logId));
        return;
      }

      var nextLink = e.target.closest("[data-ins-log-next]");
      if (nextLink) {
        e.preventDefault();
        var nextId = nextLink.getAttribute("data-ins-log-next");
        if (!nextId || !window.AimySpa || typeof window.AimySpa.navigate !== "function") return;
        window.AimySpa.navigate("./insights?log=" + encodeURIComponent(nextId));
      }
    });
  }

  window.SpaPages.insights = {
    mount: function (ctx) {
      var root = insRoot();
      var logId = normalizeLog(ctx);
      mountToken++;
      bindHub(root);
      restoreLogNextFooter();

      var runtime = window.SpaPages.insightsRuntime;
      if (runtime && typeof runtime.destroy === "function") {
        runtime.destroy({ keepRoot: true });
      }

      if (!logId) {
        showChooser(root);
      } else {
        showLog(root, logId);
      }

      activeLog = logId;

      if (runtime && typeof runtime.init === "function") {
        runtime.init(root, {
          log: logId,
          phase: logId ? "open" : "choose",
        });
      }

      window.setTimeout(function () {
        document.title = logId
          ? (LOG_LABELS[logId].title || "Log") + " — Behind the madness — Aimy Gwen"
          : "Behind the madness, Gwenuinely. — Insights — Aimy Gwen";
      }, 0);
    },
    unmount: function () {
      mountToken++;
      clearDeckReveal(insRoot());
      activeLog = null;
      document.body.classList.remove("ins-logs-choose", "ins-logs-open");
      document.body.removeAttribute("data-ins-active-log");
      if (window.AimySpaSubBack) window.AimySpaSubBack.hide();
      restoreLogNextFooter();
      var nextScroll = document.querySelector("[data-ins-log-next-scroll]");
      if (nextScroll) {
        nextScroll.hidden = true;
        nextScroll.setAttribute("aria-hidden", "true");
      }

      var runtime = window.SpaPages.insightsRuntime;
      if (runtime && typeof runtime.destroy === "function") {
        runtime.destroy();
      }
    },
  };
})();
