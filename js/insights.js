/**
 * Insights / Behind the Madness — Lavazza-style case study runtime
 */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lenis = null;
  var revealObserver = null;

  function bootLenis() {
    if (!window.Polyglide) return null;
    lenis = window.Polyglide.boot();
    if (lenis && typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
      lenis.on("scroll", ScrollTrigger.update);
    }
    return lenis;
  }

  function bootReveals() {
    var nodes = document.querySelectorAll("[data-ins-reveal]");
    if (!nodes.length) return;

    if (reduced || !("IntersectionObserver" in window)) {
      nodes.forEach(function (el) {
        el.classList.add("is-in");
      });
      return;
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
      if (el.classList.contains("ins-hero")) {
        el.classList.add("is-in");
        return;
      }
      revealObserver.observe(el);
    });
  }

  function bootSlider() {
    var root = document.querySelector("[data-ins-slider]");
    if (!root) return;

    var slides = Array.prototype.slice.call(root.querySelectorAll(".ins-slide"));
    if (!slides.length) return;

    var countEl = document.querySelector("[data-ins-count]");
    var prevBtn = document.querySelector("[data-ins-prev]");
    var nextBtn = document.querySelector("[data-ins-next]");
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

  function bootScrollLink() {
    var link = document.querySelector(".ins-scroll");
    if (!link) return;
    link.addEventListener("click", function (e) {
      var href = link.getAttribute("href") || "";
      if (href.charAt(0) !== "#") return;
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      if (lenis && typeof lenis.scrollTo === "function") {
        lenis.scrollTo(target, { offset: 0 });
      } else {
        target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
      }
    });
  }

  var logoFocusCleanup = null;

  function bootLogoFocus() {
    var section = document.querySelector("[data-ins-logo-focus]");
    var pinHost = section && section.querySelector("[data-ins-logo-pin] .ins-logo-pin-inner");
    if (!pinHost) {
      pinHost = section && section.querySelector("[data-ins-logo-pin]");
    }
    var headerBrand = document.querySelector(".site-header[data-aimy-chrome] .brand");
    var headerMark = headerBrand && headerBrand.querySelector(".brand-mark");
    if (!section || !pinHost || !headerMark) return;

    /* Place a large in-flow clone — sticky CSS holds it while scrolling */
    var clone = headerMark.cloneNode(true);
    clone.classList.add("ins-logo-pin-mark");
    clone.removeAttribute("width");
    clone.removeAttribute("height");
    pinHost.innerHTML = "";
    pinHost.appendChild(clone);

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

    /* Swap: header blurs out as the large sticky logo settles in */
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

    /* Keep eye rest points accurate while sticky reflows */
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

  function initInsightsPage() {
    var shell = document.getElementById("insights-page-content");
    if (!shell) return;

    bootLenis();
    bootReveals();
    bootSlider();
    bootScrollLink();
    bootLogoFocus();

    requestAnimationFrame(function () {
      setTimeout(function () {
        shell.classList.add("active", "is-active");
        document.documentElement.classList.remove("page-loading");
        if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
      }, 60);
    });
  }

  function destroyInsightsPage() {
    if (revealObserver) {
      revealObserver.disconnect();
      revealObserver = null;
    }
    if (logoFocusCleanup) {
      logoFocusCleanup();
      logoFocusCleanup = null;
    }
    if (window.Polyglide) {
      window.Polyglide.destroy();
      lenis = null;
    }
  }

  window.SpaPages = window.SpaPages || {};
  window.SpaPages.insights = {
    init: initInsightsPage,
    destroy: destroyInsightsPage,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initInsightsPage);
  } else {
    initInsightsPage();
  }
})();
