/**
 * view-contact.js — Contact view lifecycle.
 */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mountToken = 0;

  function contactRoot() {
    return document.querySelector('[data-spa-view="contact"] [data-contact-root]');
  }

  window.SpaPages = window.SpaPages || {};

  window.SpaPages.contact = {
    mount: function () {
      mountToken++;
      var token = mountToken;
      var root = contactRoot();
      if (!root) return;

      root.classList.remove("is-ready");

      if (reduced) {
        root.classList.add("is-ready");
        return;
      }

      requestAnimationFrame(function () {
        if (token !== mountToken) return;
        requestAnimationFrame(function () {
          if (token !== mountToken) return;
          root.classList.add("is-ready");
        });
      });

      window.setTimeout(function () {
        if (token !== mountToken) return;
        root.classList.add("is-ready");
      }, 48);
    },
    unmount: function () {
      mountToken++;
      var root = contactRoot();
      if (root) root.classList.remove("is-ready");
    },
  };
})();
