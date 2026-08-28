/**
 * view-imprint.js — Imprint / legal view lifecycle.
 */
(function () {
  "use strict";

  function imprintScope() {
    return document.querySelector('[data-spa-view="imprint"]');
  }

  window.SpaPages = window.SpaPages || {};

  window.SpaPages.imprint = {
    mount: function () {
      var scope = imprintScope();
      if (window.ImprintPage && typeof window.ImprintPage.boot === "function") {
        window.ImprintPage.boot(scope || document);
      }
    },
    unmount: function () {
      if (window.ImprintPage && typeof window.ImprintPage.unmount === "function") {
        window.ImprintPage.unmount();
      }
    },
  };
})();
