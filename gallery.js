(function () {
    "use strict";

    var galleryEngine = null;

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

    var displayManifest = null;

    function buildArtAssets(manifest) {
        return dimensions.map(function (dim, idx) {
            var entry = manifest && manifest[idx];
            return {
                id: idx + 1,
                title: titles[idx],
                category: categories[idx % categories.length],
                webp: entry ? entry.webp : "visuals/img" + (idx + 1) + ".jpg",
                jpg: entry ? entry.jpg : "visuals/img" + (idx + 1) + ".jpg",
                width: entry ? entry.width : dim.w,
                height: entry ? entry.height : dim.h
            };
        });
    }

    function renderGalleryItem(item, index) {
        var eager = index === 0;
        var loading = eager ? "eager" : "lazy";
        var priority = eager ? ' fetchpriority="high"' : "";
        var itemEl = document.createElement("div");
        itemEl.className = "gallery-item cat-" + item.category;
        itemEl.innerHTML =
            '<div class="gallery-item-media" style="aspect-ratio: ' + item.width + " / " + item.height + ';">' +
                "<picture>" +
                    (item.webp !== item.jpg
                        ? '<source srcset="' + item.webp + '" type="image/webp" />'
                        : "") +
                    '<img src="' + item.jpg + '" alt="' + item.title + '" width="' + item.width + '" height="' + item.height + '" loading="' + loading + '" decoding="async"' + priority + " />" +
                "</picture>" +
            "</div>";
        return itemEl;
    }

    function startGallery(items) {
        galleryEngine = initVerticalGallery({
            contentId: "gallery-page-content",
            enableVideoOffload: false,
            items: items,
            renderItem: function (item) {
                return renderGalleryItem(item, item.id - 1);
            }
        });
    }

    function initGalleryPage() {
        if (!document.getElementById("gallery-page-content")) return;

        if (displayManifest) {
            startGallery(buildArtAssets(displayManifest));
            return;
        }

        fetch("visuals/display/manifest.json", { cache: "force-cache" })
            .then(function (res) {
                if (!res.ok) throw new Error("manifest missing");
                return res.json();
            })
            .then(function (manifest) {
                displayManifest = manifest;
                startGallery(buildArtAssets(manifest));
            })
            .catch(function () {
                startGallery(buildArtAssets(null));
            });
    }

    function destroyGalleryPage() {
        if (galleryEngine && typeof galleryEngine.destroy === "function") {
            galleryEngine.destroy();
        }
        galleryEngine = null;
    }

    window.SpaPages = window.SpaPages || {};
    window.SpaPages.gallery = {
        init: initGalleryPage,
        destroy: destroyGalleryPage
    };

    if (document.getElementById("spa-view")) {
        var file = (window.location.pathname.split("/").pop() || "").toLowerCase();
        if (file === "gallery.html") initGalleryPage();
    }
})();
