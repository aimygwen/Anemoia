/**
 * view-me.js — About / Me view lifecycle.
 */
(function () {
  "use strict";

  function meScope() {
    return document.querySelector('[data-spa-view="me"]');
  }

  window.SpaPages = window.SpaPages || {};

  window.SpaPages.me = {
    mount: function () {
      var scope = meScope();
      if (window.AboutPage && typeof window.AboutPage.boot === "function") {
        window.AboutPage.boot(scope || document);
      }
    },
    unmount: function () {
      if (window.AboutPage && typeof window.AboutPage.unmount === "function") {
        window.AboutPage.unmount();
      }
    },
  };
})();
