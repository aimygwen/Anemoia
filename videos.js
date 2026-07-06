(function () {
    "use strict";

    var galleryEngine = null;

    var videoAssets = [
        {
            id: 1,
            title: "Fisher-Price Joy Campaign",
            category: "commercial",
            video: "films/mov1.mp4",
            width: 1920,
            height: 1080,
            url: "https://youtu.be/TOHb_6M-UYU?si=QDLPVyCywHRYf9Kx"
        },
        {
            id: 2,
            title: "ACV Auction Experience Breakdown",
            category: "commercial",
            video: "films/mov2.mp4",
            width: 1920,
            height: 1080,
            url: "https://youtu.be/P16WCz7eetA?si=rHaCMML3sGt5PlWF"
        },
        {
            id: 3,
            title: "Vanta Sportswear Running Loop",
            category: "loops",
            video: "films/mov3.mp4",
            width: 1920,
            height: 1080,
            url: "https://youtu.be/yk4h39gUqQI?si=fMs7c4HRmDNP4BUT"
        }
    ];

    function initFilmsPage() {
        if (!document.getElementById("videos-page-content")) return;
        galleryEngine = initVerticalGallery({
            contentId: "videos-page-content",
            enableVideoOffload: true,
            items: videoAssets,
            renderItem: function (item) {
                var itemEl = document.createElement("a");
                itemEl.className = "gallery-item cat-" + item.category;
                itemEl.href = item.url;
                itemEl.target = "_blank";
                itemEl.rel = "noopener noreferrer";
                itemEl.setAttribute("aria-label", "Watch " + item.title + " on YouTube");
                itemEl.innerHTML =
                    '<div class="ambient-glow-container" style="aspect-ratio: ' + item.width + " / " + item.height + ';">' +
                        '<video class="ambient-glow-video" data-src="' + item.video + '" muted loop playsinline preload="none" aria-hidden="true"></video>' +
                    "</div>" +
                    '<div class="gallery-item-media" style="aspect-ratio: ' + item.width + " / " + item.height + ';">' +
                        '<img class="gallery-item-still" alt="" width="' + item.width + '" height="' + item.height + '" decoding="async" />' +
                        '<video data-src="' + item.video + '" muted loop playsinline preload="none" width="' + item.width + '" height="' + item.height + '"></video>' +
                        '<div class="video-border-overlay"></div>' +
                        '<div class="techtangle-badge">click to view original</div>' +
                    "</div>";
                return itemEl;
            }
        });
    }

    function destroyFilmsPage() {
        if (galleryEngine && typeof galleryEngine.destroy === "function") {
            galleryEngine.destroy();
        }
        galleryEngine = null;
    }

    window.SpaPages = window.SpaPages || {};
    window.SpaPages.films = {
        init: initFilmsPage,
        destroy: destroyFilmsPage
    };

    if (document.getElementById("spa-view")) {
        var file = (window.location.pathname.split("/").pop() || "").toLowerCase();
        if (file === "videos.html") initFilmsPage();
    }
})();
