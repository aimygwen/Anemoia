/**
 * view-start.js — Start view lifecycle (splash-only).
 */
(function () {
  "use strict";

  window.SpaPages = window.SpaPages || {};

  window.SpaPages.start = {
    mount: function () {
      if (window.AimyWordmarkHolo && typeof window.AimyWordmarkHolo.teardown === "function") {
        window.AimyWordmarkHolo.teardown("insights");
      }
      if (window.HomeSplash && typeof window.HomeSplash.boot === "function") {
        window.HomeSplash.boot({ force: true });
      }
    },
    unmount: function () {
      if (window.HomeSplash && typeof window.HomeSplash.teardown === "function") {
        window.HomeSplash.teardown();
      }
    },
  };
})();
