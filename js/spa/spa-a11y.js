/**
 * spa-a11y.js
 * Live region announcements on route change.
 */
(function () {
  "use strict";

  var region = null;

  function ensureRegion() {
    if (region) return region;
    region = document.getElementById("spa-live-region");
    if (region) return region;
    region = document.createElement("div");
    region.id = "spa-live-region";
    region.className = "spa-live-region";
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-atomic", "true");
    document.body.appendChild(region);
    return region;
  }

  var TITLES = {
    start: "Start",
    work: "Work",
    insights: "Insights",
    me: "Me",
    contact: "Contact",
  };

  function announce(view) {
    var el = ensureRegion();
    var label = TITLES[view] || view;
    el.textContent = "Showing " + label + " page";
  }

  function setDocumentTitle(view) {
    var label = TITLES[view] || "Aimy Gwen";
    document.title = view === "start" ? "Aimy Gwen — Art of Aimy Gwen" : label + " — Aimy Gwen";
  }

  window.AimySpaA11y = {
    announce: announce,
    setDocumentTitle: setDocumentTitle,
  };
})();
