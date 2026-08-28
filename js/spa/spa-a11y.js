/**
 * spa-a11y.js
 * Live region announcements + document titles on route change.
 */
(function () {
  "use strict";

  var region = null;

  var TITLES = {
    start: "Art of Aimy Gwen",
    work: "Choose What You Want to See!",
    "work:hytale": "My Asset Sticker Book",
    "work:lowpoly": "Look at This Mesh",
    "work:stills": "Moments Captured for Eternity",
    "work:motion": "Stories Told in Motion",
    "work:sculpts": "Forms Carved in Light",
    insights: "Gwenuine Thoughts & Brain Farts",
    "insights:identity": "Glitter, Gloss & Chaos",
    "insights:workspace": "Clean, Calm & Cozy",
    me: "Perpetrator of This Mess",
    imprint: "Yaaaaaaawn… Say Again?",
    contact: "Let's Make a Mess.",
  };

  var ANNOUNCE = {
    start: "Start",
    work: "Work",
    insights: "Insights",
    me: "Me",
    imprint: "Imprint",
    contact: "Contact",
  };

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

  function normalizeQuery(query) {
    return query ? Object.assign({}, query) : {};
  }

  function resolveTitle(view, query) {
    view = view || "start";
    query = normalizeQuery(query);

    if (view === "work" && query.category) {
      return TITLES["work:" + query.category] || TITLES.work;
    }

    if (view === "insights" && query.log) {
      return TITLES["insights:" + query.log] || TITLES.insights;
    }

    return TITLES[view] || TITLES.start;
  }

  function announce(view) {
    var el = ensureRegion();
    var label = ANNOUNCE[view] || view;
    el.textContent = "Showing " + label + " page";
  }

  function setDocumentTitle(view, query) {
    document.title = resolveTitle(view, query);
  }

  window.AimySpaA11y = {
    announce: announce,
    setDocumentTitle: setDocumentTitle,
    resolveTitle: resolveTitle,
  };
})();
