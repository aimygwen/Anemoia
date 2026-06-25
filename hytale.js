/* ----------------------------------------------------
   HYTALE UNIFIED SCRIPT SYSTEM
   Renders both Extensions (Mods) and Models (Assets) on the same page.
   Manages:
     - Grid rendering for both sections.
     - ScrollSpy menu link highlight.
     - Side floating assets parallax animations.
     - Retro synthesizer audio feedback & lightbox inspection modal.
   ---------------------------------------------------- */

(function () {
    // 1. DATA SOURCES
    const hytaleModpacks = [
        {
            id: "pack-komorebi",
            title: "Crossroads",
            category: "furnishings",
            image: "lowpoly/hytale/crossroads.png",
            images: ["lowpoly/hytale/crossroads.png", "lowpoly/hytale/hytale_01.png", "lowpoly/hytale/hytale_02.png"],
            size: "featured",
            downloadAvailable: false,
            downloadUrl: "",
            desc: "My first modpack! A beautiful, serene integration of light-dappled forest biomes, customized wooden paths, frontier crossroads signals, and cozy lighting assets designed to make your Hytale journeys feel magical."
        },
        {
            id: "pack-tekk",
            title: "Timeless Tekk",
            category: "furnishings",
            image: "lowpoly/hytale/timeless_tekk.png",
            images: ["lowpoly/hytale/timeless_tekk.png"],
            size: "featured",
            downloadAvailable: false,
            downloadUrl: "",
            desc: "A techno-magical industrial expansion introducing steam-driven boilers, cog networks, copper tubing, and decorative factory blockouts."
        },
        {
            id: "pack-plushies",
            title: "Plushies!!",
            category: "collectibles",
            image: "lowpoly/hytale/plushies.png",
            images: ["lowpoly/hytale/plushies.png"],
            size: "featured",
            downloadAvailable: false,
            downloadUrl: "",
            desc: "A collection of adorable, cuddle-ready lowpoly plush toys of legendary Hytale beasts, elementals, and cute forest critters."
        }
    ];

    const floatingAssetsData = [
        { id: "asset-1", title: "Arcade Machine", category: "furnishings", image: "lowpoly/hytale/hytale_01.png", desc: "A detailed canyon biome directional signalpost. Compatible with pathfinding physics." },
        { id: "asset-2", title: "iMirai", category: "furnishings", image: "lowpoly/hytale/hytale_02.png", desc: "An old frontier signalpost with rusted metal indicators and wooden crossbeams." },
        { id: "asset-3", title: "Mirai Studio", category: "furnishings", image: "lowpoly/hytale/hytale_03.png", desc: "A game-ready heavy paladin blade, textured with hand-painted gold filigree and steel plates." },
        { id: "asset-4", title: "Mirai Pro", category: "furnishings", image: "lowpoly/hytale/hytale_04.png", desc: "A stylized broadleaf oak tree designed for forest biomes, utilizing alpha card textures." },
        { id: "asset-5", title: "MiraiBook", category: "furnishings", image: "lowpoly/hytale/hytale_05.png", desc: "A futuristic keytar weapon blending Vaporwave synthesizer frames with glowing neon keys." },
        { id: "asset-6", title: "Mirai Classic", category: "furnishings", image: "lowpoly/hytale/hytale_06.png", desc: "A small, mossy forest creature that reacts to nearby entities and light signals." },
        { id: "asset-7", title: "Pixxel", category: "furnishings", image: "lowpoly/hytale/hytale_07.png", desc: "A glowing ore cluster found in mineral shafts. Emits a soft blue emissive texture light." },
        { id: "asset-8", title: "Qubo Mallow", category: "furnishings", image: "lowpoly/hytale/hytale_08.png", desc: "A high-voltage energy blade combining traditional curves with digital circuitry patterns." },
        { id: "asset-9", title: "Qubo Loom", category: "furnishings", image: "lowpoly/hytale/hytale_09.png", desc: "An ancient monolith carved with glowing magical symbols, overgrown with local flora." },
        { id: "asset-10", title: "Qubo Looma", category: "furnishings", image: "lowpoly/hytale/hytale_10.png", desc: "A protective sentinel construct disguised as a towering cactus, native to dry canyon biomes." },
        { id: "asset-11", title: "Qubo Hanging Looma", category: "furnishings", image: "lowpoly/hytale/hytale_11.png", desc: "A detailed pixel art arcade cabinet featuring dithered neon buttons and retro wood paneling." },
        { id: "asset-12", title: "Qubo Ivy", category: "furnishings", image: "lowpoly/hytale/hytale_12.png", desc: "A rare, dark crystal deposit that floats slightly and absorbs light. Extremely hard to mine." },
        { id: "asset-13", title: "Vanguard Greatshield", category: "battlegear", image: "lowpoly/hytale/hytale_13.png", desc: "A heavy defensive shield made of layered steel plates and reinforced copper brackets." },
        { id: "asset-14", title: "Timberland Chest", category: "furnishings", image: "lowpoly/hytale/hytale_14.png", desc: "A sturdy storage container constructed from dark spruce logs with brass lock fittings." },
        { id: "asset-15", title: "Vaporwave Synthesizer", category: "cosmetics", image: "lowpoly/hytale/hytale_15.png", desc: "A desktop sound synthesizer model complete with retro keybeds and sliders." },
        { id: "asset-16", title: "Dungeon Brick Wall", category: "furnishings", image: "lowpoly/hytale/hytale_16.png", desc: "Modular brick blocks configured for dungeons, catacombs, and castle structures." },
        { id: "asset-17", title: "Mirai Bass Guitar", category: "cosmetics", image: "lowpoly/hytale/hytale_17.png", desc: "A low-frequency cyber-weapon emitting high-amplitude vibration waves." },
        { id: "asset-18", title: "Canyon Shrub Tree", category: "furnishings", image: "lowpoly/hytale/hytale_18.png", desc: "A small, twisted desert shrub designed with custom dithered dithered leaf card shapes." },
        { id: "asset-19", title: "Outpost Boundary Flag", category: "collectibles", image: "lowpoly/hytale/hytale_19.png", desc: "A blowing cloth flag mounted on a wooden staff to mark territorial faction boundaries." },
        { id: "asset-20", title: "Artificer Workbench", category: "furnishings", image: "lowpoly/hytale/hytale_20.png", desc: "An active workbench cluttered with drafts, gears, and low-poly voxel tools." },
        { id: "asset-21", title: "Gwendollyn", category: "collectibles", image: "lowpoly/hytale/hytale_21.png", desc: "A sturdy storage container constructed from dark spruce logs with brass lock fittings." },
        { id: "asset-22", title: "Blushing Jax Plushie", category: "collectibles", image: "lowpoly/hytale/hytale_22.png", desc: "A desktop sound synthesizer model complete with retro keybeds and sliders." },
        { id: "asset-23", title: "Jax Plushie", category: "collectibles", image: "lowpoly/hytale/hytale_23.png", desc: "Modular brick blocks configured for dungeons, catacombs, and castle structures." },
        { id: "asset-24", title: "Ribbit Plushie", category: "collectibles", image: "lowpoly/hytale/hytale_24.png", desc: "A low-frequency cyber-weapon emitting high-amplitude vibration waves." },
        { id: "asset-25", title: "Gangle Plushie", category: "collectibles", image: "lowpoly/hytale/hytale_25.png", desc: "A small, twisted desert shrub designed with custom dithered dithered leaf card shapes." },
        { id: "asset-26", title: "Kinger Plushie", category: "collectibles", image: "lowpoly/hytale/hytale_26.png", desc: "A blowing cloth flag mounted on a wooden staff to mark territorial faction boundaries." },
        { id: "asset-27", title: "Seabunny Plushie", category: "collectibles", image: "lowpoly/hytale/hytale_27.png", desc: "An active workbench cluttered with drafts, gears, and low-poly voxel tools." },
        { id: "asset-28", title: "Kuromi Plushie", category: "collectibles", image: "lowpoly/hytale/hytale_28.png", desc: "A sturdy storage container constructed from dark spruce logs with brass lock fittings." },
        { id: "asset-29", title: "MyMelody Plushie", category: "collectibles", image: "lowpoly/hytale/hytale_29.png", desc: "A desktop sound synthesizer model complete with retro keybeds and sliders." },
        { id: "asset-30", title: "Abstraction Plushie", category: "collectibles", image: "lowpoly/hytale/hytale_30.png", desc: "Modular brick blocks configured for dungeons, catacombs, and castle structures." },
        { id: "asset-31", title: "Mirai Bass Guitar", category: "cosmetics", image: "lowpoly/hytale/hytale_31.png", desc: "A low-frequency cyber-weapon emitting high-amplitude vibration waves." },
        { id: "asset-32", title: "Canyon Shrub Tree", category: "furnishings", image: "lowpoly/hytale/hytale_32.png", desc: "A small, twisted desert shrub designed with custom dithered dithered leaf card shapes." },
        { id: "asset-33", title: "Outpost Boundary Flag", category: "collectibles", image: "lowpoly/hytale/hytale_33.png", desc: "A blowing cloth flag mounted on a wooden staff to mark territorial faction boundaries." },
        { id: "asset-34", title: "Artificer Workbench", category: "furnishings", image: "lowpoly/hytale/hytale_34.png", desc: "An active workbench cluttered with drafts, gears, and low-poly voxel tools." },
        { id: "asset-35", title: "Timberland Chest", category: "furnishings", image: "lowpoly/hytale/hytale_35.png", desc: "A sturdy storage container constructed from dark spruce logs with brass lock fittings." },
        { id: "asset-36", title: "Vaporwave Synthesizer", category: "cosmetics", image: "lowpoly/hytale/hytale_36.png", desc: "A desktop sound synthesizer model complete with retro keybeds and sliders." },
        { id: "asset-37", title: "Dungeon Brick Wall", category: "furnishings", image: "lowpoly/hytale/hytale_37.png", desc: "Modular brick blocks configured for dungeons, catacombs, and castle structures." },
        { id: "asset-38", title: "Mirai Bass Guitar", category: "cosmetics", image: "lowpoly/hytale/hytale_38.png", desc: "A low-frequency cyber-weapon emitting high-amplitude vibration waves." },
        { id: "asset-39", title: "Canyon Shrub Tree", category: "furnishings", image: "lowpoly/hytale/hytale_39.png", desc: "A small, twisted desert shrub designed with custom dithered dithered leaf card shapes." },
        { id: "asset-40", title: "Outpost Boundary Flag", category: "collectibles", image: "lowpoly/hytale/hytale_40.png", desc: "A blowing cloth flag mounted on a wooden staff to mark territorial faction boundaries." },
        { id: "asset-41", title: "Artificer Workbench", category: "furnishings", image: "lowpoly/hytale/hytale_41.png", desc: "An active workbench cluttered with drafts, gears, and low-poly voxel tools." }
    ];

    // 2. RETRO AUDIO FEEDBACK
    let audioCtx = null;
    function playSound(type) {
        try {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === "suspended") {
                audioCtx.resume();
            }
            
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            const now = audioCtx.currentTime;
            
            if (type === "hover") {
                osc.type = "sine";
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(150, now + 0.04);
                
                gainNode.gain.setValueAtTime(0.012, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
                
                osc.start(now);
                osc.stop(now + 0.04);
            } else if (type === "select") {
                osc.type = "square";
                osc.frequency.setValueAtTime(480, now);
                osc.frequency.setValueAtTime(960, now + 0.04);
                
                gainNode.gain.setValueAtTime(0.018, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                
                osc.start(now);
                osc.stop(now + 0.12);
            }
        } catch (e) {
            console.warn("AudioContext blocked or not supported in this browser:", e);
        }
    }

    // 3. PARALLAX STATE MANAGEMENT
    let activeFloatingAssets = [];
    let scrollScheduled = false;

    function updateParallax() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        activeFloatingAssets.forEach(item => {
            const yOffset = scrollTop * item.speed;
            const rOffset = scrollTop * item.rotSpeed;
            const currentRot = item.baseRot + rOffset;
            
            item.element.style.transform = `translate3d(0px, ${yOffset}px, 0px) rotate(${currentRot}deg) scale(${item.scale})`;
        });
    }

    // Spawn 20 floating side assets
    function spawnFloatingAssets() {
        const container = document.getElementById("floating-assets-container");
        if (!container) return;

        container.innerHTML = "";
        activeFloatingAssets = [];
        
        const startPct = 5;
        const endPct = 95;
        const totalBands = floatingAssetsData.length;
        const step = (endPct - startPct) / totalBands;

        floatingAssetsData.forEach((asset, index) => {
            const side = index % 2 === 0 ? "left" : "right";
            
            const bandStart = startPct + index * step;
            const bandEnd = bandStart + step;
            const topPercent = bandStart + Math.random() * (bandEnd - bandStart);

            // Spreads assets across margins (1.5% to 26% from viewport edges)
            const sidePercent = 1.5 + Math.random() * 24.5;

            // Parallax, opacity, and 3D fake depth parameters
            const scale = 0.4 + Math.random() * 0.65;
            const baseRot = -35 + Math.random() * 70;
            const speed = (0.8 - scale) * 0.35;
            const rotSpeed = -0.06 + Math.random() * 0.12;
            const baseWidth = 110 + (scale - 0.5) * 100;
            const opacity = 0.15 + Math.random() * 0.65; // Shift opacity randomly between 0.15 and 0.8

            const el = document.createElement("div");
            el.className = `floating-asset cat-${asset.category}`;
            el.style.width = `${baseWidth}px`;
            el.style.top = `${topPercent}%`;
            el.style.opacity = opacity;
            
            if (side === "left") {
                el.style.left = `${sidePercent}%`;
            } else {
                el.style.right = `${sidePercent}%`;
            }

            el.style.transform = `translate3d(0px, 0px, 0px) rotate(${baseRot}deg) scale(${scale})`;
            el.innerHTML = `<img src="lowpoly/hytale/block.png" alt="Decorative Block" loading="lazy" />`;

            container.appendChild(el);

            activeFloatingAssets.push({
                element: el,
                scale: scale,
                baseRot: baseRot,
                speed: speed,
                rotSpeed: rotSpeed
            });
        });
    }

    // 4. BENTO GRID RENDERING
    function renderGrid(items, isModpacks, targetGridId) {
        const grid = document.getElementById(targetGridId);
        if (!grid) return;

        grid.innerHTML = "";
        
        items.forEach(item => {
            const card = document.createElement("div");
            const sizeClass = isModpacks ? `card-${item.size || "normal"}` : "card-normal";
            card.className = `bento-card ${sizeClass} cat-${item.category}`;
            card.setAttribute("role", "button");
            card.setAttribute("tabindex", "0");
            card.setAttribute("aria-label", `View details for ${item.title}`);
            
            card.innerHTML = `
                <div class="card-media">
                    <img src="${item.image}" alt="${item.title}" loading="lazy" />
                </div>
                <span class="card-badge">${item.category}</span>
                <div class="card-info">
                    <h3 class="card-title-text">${item.title}</h3>
                </div>
            `;

            card.addEventListener("mouseenter", () => playSound("hover"));
            card.addEventListener("click", () => {
                playSound("select");
                openLightbox(item);
            });
            card.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    playSound("select");
                    openLightbox(item);
                }
            });

            grid.appendChild(card);
        });
    }

    // 5. SCROLL REVEAL (Intersection Observer)
    let revealObserver;
    function initScrollReveal() {
        if (revealObserver) revealObserver.disconnect();

        if (!("IntersectionObserver" in window)) {
            document.querySelectorAll(".bento-card").forEach(card => card.classList.add("revealed"));
            document.querySelectorAll(".reveal-on-scroll").forEach(el => el.classList.add("is-revealed"));
            return;
        }

        revealObserver = new IntersectionObserver((entries) => {
            let staggerDelay = 0;
            const threshold = 60;
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    el.style.transitionDelay = `${staggerDelay}ms`;
                    if (el.classList.contains("bento-card")) {
                        el.classList.add("revealed");
                    } else {
                        el.classList.add("is-revealed");
                    }
                    staggerDelay += threshold;
                    revealObserver.unobserve(el);
                }
            });
        }, {
            rootMargin: "0px 0px -40px 0px",
            threshold: 0.1
        });

        document.querySelectorAll(".bento-card, .reveal-on-scroll").forEach(el => {
            revealObserver.observe(el);
        });
    }

    // 6. SCROLL SPY MENU ACTIVE LINK STATE
    function updateScrollSpy() {
        const extensionsSec = document.getElementById("extensions");
        const modelsSec = document.getElementById("models");
        const linkExt = document.getElementById("nav-link-extensions");
        const linkMod = document.getElementById("nav-link-models");

        if (!extensionsSec || !modelsSec) return;

        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const viewportHeight = window.innerHeight;
        const modelsTop = modelsSec.offsetTop;

        // Highlight "Models" if scrolled more than halfway into the models section
        if (scrollTop + viewportHeight / 2 >= modelsTop) {
            if (linkExt) linkExt.classList.remove("active");
            if (linkMod) linkMod.classList.add("active");
        } else {
            if (linkExt) linkExt.classList.add("active");
            if (linkMod) linkMod.classList.remove("active");
        }
    }

    // 7. LIGHTBOX MODAL SYSTEM
    const lightboxModal = document.getElementById("lightbox");
    const lightboxTitle = document.getElementById("lightbox-title");
    const lightboxCategory = document.getElementById("lightbox-category");
    const lightboxDesc = document.getElementById("lightbox-desc");
    const lightboxMainImg = document.getElementById("lightbox-main-img");
    const lightboxGallery = document.getElementById("lightbox-gallery");
    const lightboxDots = document.getElementById("lightbox-dots");
    const lightboxDownloadBtn = document.getElementById("lightbox-download-btn");
    const lightboxPrev = document.getElementById("lightbox-prev");
    const lightboxNext = document.getElementById("lightbox-next");

    let currentImages = [];
    let currentGalleryIndex = 0;

    function setGalleryIndex(idx) {
        currentGalleryIndex = Math.max(0, Math.min(idx, currentImages.length - 1));
        if (lightboxMainImg) {
            lightboxMainImg.style.opacity = "0";
            setTimeout(() => {
                lightboxMainImg.src = currentImages[currentGalleryIndex];
                lightboxMainImg.style.opacity = "1";
            }, 150);
        }
        // Sync dots
        document.querySelectorAll(".lb-dot").forEach((dot, i) => {
            dot.classList.toggle("active", i === currentGalleryIndex);
        });
        // Sync thumbnails
        document.querySelectorAll(".lb-thumb").forEach((thumb, i) => {
            thumb.classList.toggle("active", i === currentGalleryIndex);
        });
        // Show/hide nav arrows
        if (lightboxPrev) lightboxPrev.style.display = currentImages.length > 1 ? "" : "none";
        if (lightboxNext) lightboxNext.style.display = currentImages.length > 1 ? "" : "none";
    }

    function openLightbox(item) {
        if (!lightboxModal) return;

        // Populate images array (fallback to single image)
        currentImages = (item.images && item.images.length > 0) ? item.images : [item.image];
        currentGalleryIndex = 0;

        // Main image
        if (lightboxMainImg) {
            lightboxMainImg.src = currentImages[0];
            lightboxMainImg.alt = item.title;
            lightboxMainImg.style.opacity = "1";
        }

        // Title, category, desc
        if (lightboxTitle) lightboxTitle.textContent = item.title;
        if (lightboxCategory) lightboxCategory.textContent = item.category;
        if (lightboxDesc) lightboxDesc.textContent = item.desc || "No description provided.";

        // Gallery thumbnails
        if (lightboxGallery) {
            lightboxGallery.innerHTML = "";
            if (currentImages.length > 1) {
                currentImages.forEach((src, i) => {
                    const thumb = document.createElement("button");
                    thumb.className = "lb-thumb" + (i === 0 ? " active" : "");
                    thumb.setAttribute("aria-label", `Preview image ${i + 1}`);
                    thumb.innerHTML = `<img src="${src}" alt="Preview ${i + 1}" loading="lazy" />`;
                    thumb.addEventListener("click", (e) => { e.stopPropagation(); setGalleryIndex(i); });
                    lightboxGallery.appendChild(thumb);
                });
                lightboxGallery.style.display = "";
            } else {
                lightboxGallery.style.display = "none";
            }
        }

        // Dots
        if (lightboxDots) {
            lightboxDots.innerHTML = "";
            if (currentImages.length > 1) {
                currentImages.forEach((_, i) => {
                    const dot = document.createElement("button");
                    dot.className = "lb-dot" + (i === 0 ? " active" : "");
                    dot.setAttribute("aria-label", `Go to image ${i + 1}`);
                    dot.addEventListener("click", (e) => { e.stopPropagation(); setGalleryIndex(i); });
                    lightboxDots.appendChild(dot);
                });
                lightboxDots.style.display = "";
            } else {
                lightboxDots.style.display = "none";
            }
        }

        // Show/hide nav
        if (lightboxPrev) lightboxPrev.style.display = currentImages.length > 1 ? "" : "none";
        if (lightboxNext) lightboxNext.style.display = currentImages.length > 1 ? "" : "none";

        // Download button
        if (lightboxDownloadBtn) {
            const avail = item.downloadAvailable !== false; // default true unless explicitly false
            lightboxDownloadBtn.classList.toggle("unavailable", !avail);
            if (avail) {
                lightboxDownloadBtn.textContent = "Download";
                lightboxDownloadBtn.href = item.downloadUrl || "#";
                lightboxDownloadBtn.removeAttribute("aria-disabled");
            } else {
                lightboxDownloadBtn.textContent = "Unavailable";
                lightboxDownloadBtn.href = "#";
                lightboxDownloadBtn.setAttribute("aria-disabled", "true");
            }
        }

        // Category class for coloring
        lightboxModal.className = `lightbox cat-${item.category}`;
        lightboxModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";

        requestAnimationFrame(() => {
            lightboxModal.classList.add("active");
        });
    }

    function closeLightbox() {
        if (!lightboxModal) return;
        lightboxModal.classList.remove("active");
        document.body.style.overflow = "";
        setTimeout(() => {
            lightboxModal.setAttribute("aria-hidden", "true");
            if (lightboxMainImg) lightboxMainImg.src = "";
            lightboxModal.className = "lightbox";
            currentImages = [];
        }, 350);
    }

    // Arrow navigation
    if (lightboxPrev) lightboxPrev.addEventListener("click", (e) => { e.stopPropagation(); setGalleryIndex(currentGalleryIndex - 1); });
    if (lightboxNext) lightboxNext.addEventListener("click", (e) => { e.stopPropagation(); setGalleryIndex(currentGalleryIndex + 1); });

    // Download button — prevent navigation when unavailable
    if (lightboxDownloadBtn) {
        lightboxDownloadBtn.addEventListener("click", (e) => {
            if (lightboxDownloadBtn.classList.contains("unavailable")) e.preventDefault();
        });
    }

    if (lightboxModal) {
        lightboxModal.addEventListener("click", (e) => {
            if (e.target === lightboxModal) closeLightbox();
        });
    }
    window.addEventListener("keydown", (e) => {
        if (!lightboxModal || lightboxModal.getAttribute("aria-hidden") === "true") return;
        if (e.key === "Escape") closeLightbox();
        if (e.key === "ArrowLeft") setGalleryIndex(currentGalleryIndex - 1);
        if (e.key === "ArrowRight") setGalleryIndex(currentGalleryIndex + 1);
    });

    // 8. INITIALIZE PAGE
    window.addEventListener("DOMContentLoaded", () => {
        const galleryContent = document.getElementById("hytale-gallery-content");
        setTimeout(() => {
            if (galleryContent) galleryContent.classList.add("active");
        }, 150);

        // Render both grids on the page
        renderGrid(hytaleModpacks, true, "extensions-grid");
        renderGrid(floatingAssetsData, false, "models-grid");

        // Spawn decorative side assets
        spawnFloatingAssets();

        // Bind scroll event for parallax & scrollspy
        window.addEventListener("scroll", () => {
            if (!scrollScheduled) {
                scrollScheduled = true;
                requestAnimationFrame(() => {
                    updateParallax();
                    updateScrollSpy();
                    scrollScheduled = false;
                });
            }
        }, { passive: true });

        window.addEventListener("resize", () => {
            updateParallax();
            updateScrollSpy();
        }, { passive: true });

        // Run initial update
        updateParallax();
        updateScrollSpy();
        initScrollReveal();
    });
})();
