(function () {
    "use strict";

    var artEngine = null;
    var filmsEngine = null;
    var videoObserver = null;
    var displayManifest = null;

    var dimensions = [
        { w: 3621, h: 2048 }, { w: 3130, h: 1756 }, { w: 2560, h: 1440 }, { w: 2560, h: 1440 },
        { w: 3645, h: 2048 }, { w: 2560, h: 1440 }, { w: 4096, h: 2160 }, { w: 3621, h: 2048 },
        { w: 2732, h: 2048 }, { w: 2732, h: 1537 }, { w: 2560, h: 1440 }, { w: 2732, h: 1537 },
        { w: 1920, h: 1439 }, { w: 2048, h: 2732 }, { w: 2732, h: 2048 }, { w: 1440, h: 2560 },
        { w: 1800, h: 1200 }, { w: 2388, h: 2392 }, { w: 1788, h: 2384 }, { w: 1920, h: 2716 }
    ];

    var titles = [
        "Celestial Meadow Mascot", "Aetherial Canopy Sketch", "Glowgem Crystal Refraction", "Fennec Wanderer Study",
        "Runic Broadsword Concept", "Autumntide Picnic Sketch", "Voxel Sentry Construct", "Elderglen Guardian Tree",
        "Prismatic Cavern Study", "Floating Spire Sketch", "Valley Ridge Study", "Clouddrift Sails Concept",
        "Aetherwood Bonsai Design", "Vibrant Forest Flora", "Ancient Archway Sketch", "Shadowgrove Druid Mascot",
        "Firefly Hearth Painting", "Canopy Leaf Study", "Runic Obsidian Pillar", "Starry Ruins Concept"
    ];

    var categories = ["illustration", "sketches", "paintings"];

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

    function buildArtAssets(manifest) {
        return dimensions.map(function (dim, idx) {
            var entry = manifest && manifest[idx];
            return {
                id: idx + 1,
                title: titles[idx],
                category: categories[idx % categories.length],
                webp: entry ? entry.webp : "visuals/display/img" + (idx + 1) + ".webp",
                jpg: entry ? (entry.jpg || entry.webp) : "visuals/display/img" + (idx + 1) + ".webp",
                width: entry ? entry.width : dim.w,
                height: entry ? entry.height : dim.h
            };
        });
    }

    function renderArtItem(item, index) {
        var eager = index === 0;
        var loading = eager ? "eager" : "lazy";
        var priority = eager ? ' fetchpriority="high"' : "";
        var imgSrc = item.webp || item.jpg;
        var itemEl = document.createElement("div");
        itemEl.className = "gallery-item cat-" + item.category;
        itemEl.innerHTML =
            '<div class="gallery-item-media" style="aspect-ratio: ' + item.width + " / " + item.height + ';">' +
                '<img src="' + imgSrc + '" alt="' + item.title + '" width="' + item.width + '" height="' + item.height + '" loading="' + loading + '" decoding="async"' + priority + " />" +
            "</div>";
        return itemEl;
    }

    function renderFilmItem(item, index) {
        var eager = index === 0;
        var preload = eager ? "metadata" : "none";
        var itemEl = document.createElement("div");
        itemEl.className = "gallery-item cat-" + item.category;
        itemEl.setAttribute("role", "link");
        itemEl.setAttribute("tabindex", "0");
        itemEl.setAttribute("aria-label", "Watch " + item.title + " on YouTube");
        itemEl.innerHTML =
            '<div class="gallery-item-media" style="aspect-ratio: ' + item.width + " / " + item.height + ';">' +
                '<video src="' + item.video + '" muted loop playsinline preload="' + preload + '" width="' + item.width + '" height="' + item.height + '"></video>' +
                '<div class="video-border-overlay"></div>' +
                '<div class="techtangle-badge">click to view original</div>' +
            "</div>";

        function openFilm() {
            window.open(item.url, "_blank", "noopener,noreferrer");
        }

        itemEl.addEventListener("click", openFilm);
        itemEl.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openFilm();
            }
        });

        return itemEl;
    }

    function initVideoPlayback(root) {
        if (!root || !("IntersectionObserver" in window)) return null;

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                var video = entry.target;
                if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
                    var playPromise = video.play();
                    if (playPromise && playPromise.catch) playPromise.catch(function () {});
                    var item = video.closest(".gallery-item");
                    if (item) item.classList.add("is-video-active");
                } else {
                    video.pause();
                    var offItem = video.closest(".gallery-item");
                    if (offItem) offItem.classList.remove("is-video-active");
                }
            });
        }, { threshold: [0, 0.45, 0.65] });

        root.querySelectorAll(".gallery-item-media video").forEach(function (video) {
            observer.observe(video);
        });

        return observer;
    }

    function startArtGallery(items) {
        artEngine = initVerticalGallery({
            contentId: "gallery-page-content",
            enableVideoOffload: false,
            items: items,
            renderItem: function (item) {
                return renderArtItem(item, item.id - 1);
            }
        });
    }

    function startFilmsGallery() {
        filmsEngine = initVerticalGallery({
            contentId: "videos-page-content",
            enableVideoOffload: false,
            items: videoAssets,
            renderItem: function (item) {
                return renderFilmItem(item, item.id - 1);
            }
        });

        setTimeout(function () {
            var gallery = document.getElementById("vertical-gallery");
            if (videoObserver) videoObserver.disconnect();
            videoObserver = initVideoPlayback(gallery);
        }, 250);
    }

    function initGalleryPage() {
        if (!document.getElementById("gallery-page-content")) return;

        if (displayManifest) {
            startArtGallery(buildArtAssets(displayManifest));
            return;
        }

        fetch("visuals/display/manifest.json", { cache: "force-cache" })
            .then(function (res) {
                if (!res.ok) throw new Error("manifest missing");
                return res.json();
            })
            .then(function (manifest) {
                displayManifest = manifest;
                startArtGallery(buildArtAssets(manifest));
            })
            .catch(function () {
                startArtGallery(buildArtAssets(null));
            });
    }

    function destroyGalleryPage() {
        if (artEngine && typeof artEngine.destroy === "function") {
            artEngine.destroy();
        }
        artEngine = null;
    }

    function initFilmsPage() {
        if (!document.getElementById("videos-page-content")) return;
        startFilmsGallery();
    }

    function destroyFilmsPage() {
        if (videoObserver) {
            videoObserver.disconnect();
            videoObserver = null;
        }
        if (filmsEngine && typeof filmsEngine.destroy === "function") {
            filmsEngine.destroy();
        }
        filmsEngine = null;
    }

    window.SpaPages = window.SpaPages || {};
    window.SpaPages.gallery = {
        init: initGalleryPage,
        destroy: destroyGalleryPage
    };
    window.SpaPages.films = {
        init: initFilmsPage,
        destroy: destroyFilmsPage
    };

    if (document.getElementById("spa-view")) {
        var file = (window.location.pathname.split("/").pop() || "").toLowerCase();
        if (file === "gallery.html") initGalleryPage();
        if (file === "videos.html") initFilmsPage();
    }
})();
