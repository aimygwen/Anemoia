/**
 * spa-nav.js
 * Primary nav + coin menu active states for SPA routes.
 */
(function () {
  "use strict";

  var NAV_ITEMS = [
    { id: "start", label: "Start", href: "./" },
    { id: "work", label: "Work", href: "/work" },
    { id: "insights", label: "Insights", href: "/insights" },
    { id: "me", label: "Me", href: "./me" },
    { id: "contact", label: "Contact", href: "/contact" },
  ];

  function ensureHomeCharm() {
    var header = document.querySelector(".site-header[data-aimy-chrome]");
    if (!header) return;
    var logo = header.querySelector(".brand-link, .brand");
    if (logo) {
      logo.setAttribute("data-spa-nav", "start");
      logo.href = "./";
    }
  }

  function bindHomeCharm() {
    if (document.documentElement.dataset.spaHomeCharmBound === "1") return;
    document.documentElement.dataset.spaHomeCharmBound = "1";

    document.addEventListener(
      "click",
      function (e) {
        if (!document.body || !document.body.hasAttribute("data-spa-host")) return;
        if (e.defaultPrevented) return;
        if (e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        var brand =
          e.target && e.target.closest
            ? e.target.closest(
                ".site-header[data-aimy-chrome] .brand-link, .site-header[data-aimy-chrome] a.brand[href]"
              )
            : null;
        if (!brand) return;

        e.preventDefault();
        e.stopPropagation();

        brand.classList.remove("is-logo-blurred");

        if (window.AimySpa && typeof window.AimySpa.goHome === "function") {
          window.AimySpa.goHome();
          return;
        }
        if (window.AimySpa && typeof window.AimySpa.navigate === "function") {
          window.AimySpa.navigate("./");
        }
      },
      true
    );
  }

  function injectPrimaryNav() {
    if (document.body && document.body.hasAttribute("data-spa-host")) return;
    var header = document.querySelector(".site-header[data-aimy-chrome]");
    if (!header || header.querySelector(".spa-primary-nav")) return;

    var nav = document.createElement("nav");
    nav.className = "spa-primary-nav";
    nav.setAttribute("aria-label", "Primary");

    NAV_ITEMS.forEach(function (item) {
      var link = document.createElement("a");
      link.className = "spa-primary-nav__link";
      link.href = item.href;
      link.textContent = item.label;
      link.setAttribute("data-spa-nav", item.id);
      nav.appendChild(link);
    });

    var logo = header.querySelector(".brand-link, .brand");
    if (logo) {
      logo.setAttribute("data-spa-nav", "start");
      logo.href = "./";
    }

    header.appendChild(nav);
  }

  function syncActive(view) {
    document.querySelectorAll("[data-spa-nav]").forEach(function (link) {
      var id = link.getAttribute("data-spa-nav");
      var active = id === view;
      link.classList.toggle("is-active", active);
      link.classList.toggle("is-current", active);
      if (active) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  window.AimySpaNav = {
    inject: function () {
      ensureHomeCharm();
      bindHomeCharm();
      injectPrimaryNav();
    },
    sync: syncActive,
    syncMenu: function (view) {
      syncActive(view);
      if (typeof window.__aimyMarkMenuCurrent === "function") {
        window.__aimyMarkMenuCurrent();
      }
    },
    items: NAV_ITEMS,
  };
})();
