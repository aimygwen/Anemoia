(function () {
    // Exact dimensions of the 20 visuals to preserve original ratios
    const dimensions = [
        { w: 3621, h: 2048 }, // img1
        { w: 3130, h: 1756 }, // img2
        { w: 2560, h: 1440 }, // img3
        { w: 2560, h: 1440 }, // img4
        { w: 3645, h: 2048 }, // img5
        { w: 2560, h: 1440 }, // img6
        { w: 4096, h: 2160 }, // img7
        { w: 3621, h: 2048 }, // img8
        { w: 2732, h: 2048 }, // img9
        { w: 2732, h: 1537 }, // img10
        { w: 2560, h: 1440 }, // img11
        { w: 2732, h: 1537 }, // img12
        { w: 1920, h: 1439 }, // img13
        { w: 2048, h: 2732 }, // img14
        { w: 2732, h: 2048 }, // img15
        { w: 1440, h: 2560 }, // img16
        { w: 1800, h: 1200 }, // img17
        { w: 2388, h: 2392 }, // img18
        { w: 1788, h: 2384 }, // img19
        { w: 1920, h: 2716 }  // img20
    ];

    // 1. ART DATABASE (20 visuals)
    const artAssets = Array.from({ length: 20 }, (_, idx) => {
        const id = idx + 1;
        const categories = ["illustration", "sketches", "paintings"];
        const category = categories[idx % categories.length];
        const dim = dimensions[idx];
        
        const titles = [
            "Celestial Meadow Mascot",
            "Aetherial Canopy Sketch",
            "Glowgem Crystal Refraction",
            "Fennec Wanderer Study",
            "Runic Broadsword Concept",
            "Autumntide Picnic Sketch",
            "Voxel Sentry Construct",
            "Elderglen Guardian Tree",
            "Prismatic Cavern Study",
            "Floating Spire Sketch",
            "Valley Ridge Study",
            "Clouddrift Sails Concept",
            "Aetherwood Bonsai Design",
            "Vibrant Forest Flora",
            "Ancient Archway Sketch",
            "Shadowgrove Druid Mascot",
            "Firefly Hearth Painting",
            "Canopy Leaf Study",
            "Runic Obsidian Pillar",
            "Starry Ruins Concept"
        ];
        
        const descriptions = [
            "A whimsical mascot design, blending pastel hues with soft organic curves.",
            "Technical voxel sketch detailing branches, floating dirt blocks, and leaves.",
            "Refraction study of light glowing through fantasy crystalline minerals.",
            "Anatomy and posture sketches for a forest glider beast companion.",
            "Concept illustration of a glowing, legendary blade infused with runic power.",
            "Digital painting capturing a peaceful, warm afternoon in the woods.",
            "Pixel-styled voxel character design of a mechanical temple guardian.",
            "High-contrast foliage concept showing an ancient hollow birch tree.",
            "Color and lighting study of glowing mushrooms in underground caves.",
            "Design blocks exploring floating platforms, steps, and chains.",
            "Line art drawing depicting modular rock pieces and ridge edges.",
            "Aerodynamic study of wings, flags, and propellers for a sky ship.",
            "Concept art for a glowing indoor voxel bonsai tree ornament.",
            "Saturated foliage sketches focusing on fantasy root plants.",
            "Detailed brick-by-brick structural drawing of a forgotten portal.",
            "Character illustration of a glowing forest spirit wearing a mask.",
            "Lighting experiment depicting cozy embers floating in a stone fireplace.",
            "Stylized botanical painting outlining various leaf types and silhouettes.",
            "Study of ancient runic engraving glowing with dark energy.",
            "Digital illustration depicting voxel brick arches under a starry sky."
        ];

        return {
            id,
            title: titles[idx],
            category,
            image: `visuals/img${id}.jpg`,
            desc: descriptions[idx],
            width: dim.w,
            height: dim.h
        };
    });

    // 2. DOM ELEMENT SELECTORS
    const galleryContainer = document.getElementById("vertical-gallery");
    const wrapper = document.querySelector(".smooth-scroll-wrapper");
    const scrollSpacer = document.querySelector(".scroll-spacer");

    // 3. RENDER GALLERY ITEMS
    function renderGallery(filter = "all") {
        if (!galleryContainer) return;

        // Fade out grid before changing content
        galleryContainer.style.opacity = "0.3";
        galleryContainer.style.transition = "opacity 0.2s ease";

        setTimeout(() => {
            galleryContainer.innerHTML = "";

            const filtered = artAssets.filter(item => filter === "all" || item.category === filter);

            filtered.forEach(item => {
                const itemEl = document.createElement("div");
                itemEl.className = `gallery-item cat-${item.category}`;

                itemEl.innerHTML = `
                    <div class="gallery-item-media" style="aspect-ratio: ${item.width} / ${item.height};">
                        <img src="${item.image}" alt="${item.title}" width="${item.width}" height="${item.height}" loading="lazy" />
                    </div>
                `;

                galleryContainer.appendChild(itemEl);
            });

            galleryContainer.style.opacity = "1";
            
            // Sync the spacer height immediately
            if (typeof updateSpacerHeight === "function") {
                updateSpacerHeight();
            }
        }, 200);
    }

    // 4. INERTIAL SCROLL AND PARALLAX ANIMATION LOOP
    let scroll = window.scrollY;

    // Global mouse tracking coordinates relative to viewport center (-0.5 to 0.5)
    let globalTargetMouseX = 0;
    let globalTargetMouseY = 0;
    let globalMouseX = 0;
    let globalMouseY = 0;

    window.addEventListener("mousemove", (e) => {
        globalTargetMouseX = (e.clientX / window.innerWidth) - 0.5;
        globalTargetMouseY = (e.clientY / window.innerHeight) - 0.5;
    });

    document.addEventListener("mouseleave", () => {
        globalTargetMouseX = 0;
        globalTargetMouseY = 0;
    });

    function updateSpacerHeight() {
        if (!wrapper || !scrollSpacer) return;
        // Use offsetHeight which is unaffected by translations/scales
        const height = wrapper.offsetHeight;
        scrollSpacer.style.height = `${height}px`;
    }

    function animateGallery() {
        // Target scroll (current native window position)
        const targetScrollY = window.scrollY;

        // Dampened scroll interpolation (lerp factor 0.05 for heavy, slow, luxurious scroll feel)
        scroll += (targetScrollY - scroll) * 0.05;

        // Interpolate global mouse coordinates for smooth lag-free animation
        globalMouseX += (globalTargetMouseX - globalMouseX) * 0.08;
        globalMouseY += (globalTargetMouseY - globalMouseY) * 0.08;

        // Translate the fixed container in 3D for hardware rendering acceleration
        if (wrapper) {
            wrapper.style.transform = `translate3d(0, ${-scroll}px, 0)`;
        }

        const vh = window.innerHeight;
        const items = document.querySelectorAll(".gallery-item");

        items.forEach(item => {
            const media = item.querySelector(".gallery-item-media");
            if (!media) return;

            const rect = media.getBoundingClientRect();

            // Skip rendering calculations if the element is off-screen (with safety buffer)
            if (rect.bottom < -100 || rect.top > vh + 100) return;

            // Calculate progress relative to screen viewport center: -1 to 1
            const itemCenter = rect.top + rect.height / 2;
            const progress = (itemCenter - vh / 2) / (vh / 2 + rect.height / 2);

            // Calculate optical focus factor (1 at center, 0 at boundaries)
            const absProgress = Math.abs(progress);
            const focusFactor = Math.max(0, 1 - absProgress * 1.5);

            // 1. Dynamic scaling (focused item scales up, unfocused items scale down slightly)
            const scaleVal = 0.95 + focusFactor * 0.1; // 0.95 (unfocused) to 1.05 (focused)

            // 2. Dynamic opacity (focused item is fully opaque, unfocused items fade)
            const opacityVal = 0.35 + focusFactor * 0.65; // 0.35 (unfocused) to 1.0 (focused)
            item.style.opacity = opacityVal;

            // 3. Dynamic blur (focused item is sharp, unfocused items are blurred)
            const blurVal = (1 - focusFactor) * 6; // 6px (unfocused) to 0px (focused)
            media.style.filter = `blur(${blurVal}px)`;

            // 4. Parallax Translation of the entire media container (no border leaks)
            // Shift container slightly based on global mouse position and focus factor for depth separation
            const containerShiftX = globalMouseX * 10 * focusFactor; // max 5px shift
            const containerShiftY = globalMouseY * 10 * focusFactor; // max 5px shift
            const itemParallax = progress * -40 + containerShiftY; // translates vertically from -40px to 40px + mouse offset

            // 5. Dynamic Rotation (tilts card frame as it passes through the screen)
            const rotateAngle = progress * -3.0; // rotates from -3deg to 3deg

            media.style.transform = `translate3d(${containerShiftX}px, ${itemParallax}px, 0) rotate(${rotateAngle}deg) scale(${scaleVal})`;

            // 6. Inner Image Parallax (slides image inside the overflow: hidden container)
            const img = media.querySelector("img");
            if (img) {
                const imgParallax = progress * -5; // translates from 5% to -5% for parallax motion
                
                // Shift image ever so slightly in the opposite direction for parallax depth separation
                const shiftX = globalMouseX * -8 * focusFactor; // max 4px horizontal offset at peak focus
                const shiftY = globalMouseY * -8 * focusFactor; // max 4px vertical offset at peak focus

                img.style.transform = `scale(1.15) translate3d(${shiftX}px, calc(${imgParallax}% + ${shiftY}px), 0)`;
            }
        });

        requestAnimationFrame(animateGallery);
    }




    // 6. INITIALIZE ON LOAD
    window.addEventListener("DOMContentLoaded", () => {
        renderGallery();
        
        // Start animation loop
        animateGallery();

        // High-performance ResizeObserver to dynamically sync spacer height with wrapper height
        // This handles image loading, window resizing, scrollbar appearance, and custom fonts loading automatically.
        if (typeof ResizeObserver !== "undefined" && wrapper && scrollSpacer) {
            const resizeObserver = new ResizeObserver(() => {
                updateSpacerHeight();
            });
            resizeObserver.observe(wrapper);
        } else {
            // Fallback for older browsers
            updateSpacerHeight();
            window.addEventListener("resize", updateSpacerHeight);
            const images = galleryContainer.querySelectorAll("img");
            images.forEach(img => {
                if (img.complete) {
                    updateSpacerHeight();
                } else {
                    img.addEventListener("load", updateSpacerHeight);
                }
            });
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(updateSpacerHeight);
            }
        }

        // Fade in page content
        const content = document.getElementById("gallery-page-content");
        if (content) {
            setTimeout(() => {
                content.classList.add("active");
            }, 150);
        }
    });

    // Expose filter callback globally
    window.filterPage = renderGallery;
})();
