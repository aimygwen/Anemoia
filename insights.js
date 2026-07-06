(function () {
    "use strict";

    function initInsightsPage() {
        if (!document.getElementById("insights-page-content")) return;
        if (!window.Site) return;
        Site.initPageFadeIn("insights-page-content", 120);
        Site.initScrollReveal({
            selector: ".insights-page-body .reveal-on-scroll, #spa-view .reveal-on-scroll",
            threshold: 0.08,
            twoWay: false
        });
    }

    function destroyInsightsPage() {
        /* static page — nothing to tear down */
    }

    window.SpaPages = window.SpaPages || {};
    window.SpaPages.insights = {
        init: initInsightsPage,
        destroy: destroyInsightsPage
    };

    if (document.getElementById("spa-view")) {
        var file = (window.location.pathname.split("/").pop() || "").toLowerCase();
        if (file === "insights.html") initInsightsPage();
    }
})();
