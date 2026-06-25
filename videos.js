(function () {
    // 1. VIDEOS DATABASE (Widescreen 16:9 and vertical video dimensions)
    // Only the first 3 items are kept, leading to specific YouTube links or case studies
    const videoAssets = [
        { 
            id: 1, 
            title: "Fisher-Price Joy Campaign", 
            category: "commercial", 
            video: "films/mov1.mp4", 
            width: 1920,
            height: 1080,
            url: "https://youtu.be/TOHb_6M-UYU?si=QDLPVyCywHRYf9Kx",
            desc: "A high-fidelity animated marketing showreel demonstrating interactive digital toy boxes for child developmental learning." 
        },
        { 
            id: 2, 
            title: "ACV Auction Experience Breakdown", 
            category: "commercial", 
            video: "films/mov2.mp4", 
            width: 1920,
            height: 1080,
            url: "https://youtu.be/P16WCz7eetA?si=rHaCMML3sGt5PlWF",
            desc: "A motion design case study breakdown explaining the bridge between virtual auctions and physical logistics." 
        },
        { 
            id: 3, 
            title: "Vanta Sportswear Running Loop", 
            category: "loops", 
            video: "films/mov3.mp4", 
            width: 1920,
            height: 1080,
            url: "https://youtu.be/yk4h39gUqQI?si=fMs7c4HRmDNP4BUT",
            desc: "An high-energy looping segment created for the sportswear brand product landing page." 
        }
    ];

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

            const filtered = videoAssets.filter(item => filter === "all" || item.category === filter);

            filtered.forEach(item => {
                const itemEl = document.createElement("a");
                itemEl.className = `gallery-item cat-${item.category}`;
                itemEl.href = item.url;
                itemEl.target = "_blank";
                itemEl.rel = "noopener noreferrer";
                itemEl.setAttribute("aria-label", `Watch ${item.title} on YouTube`);

                itemEl.innerHTML = `
                    <div class="ambient-glow-container" style="aspect-ratio: ${item.width} / ${item.height};">
                        <video class="ambient-glow-video" src="${item.video}" autoplay loop muted playsinline aria-hidden="true"></video>
                    </div>
                    <div class="gallery-item-media" style="aspect-ratio: ${item.width} / ${item.height};">
                        <video src="${item.video}" autoplay loop muted playsinline width="${item.width}" height="${item.height}"></video>
                        <div class="video-border-overlay"></div>
                        <div class="techtangle-badge">click to view original</div>
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

            // Sync the ambient glow container transform with the media container
            const glowContainer = item.querySelector(".ambient-glow-container");
            if (glowContainer) {
                glowContainer.style.transform = `translate3d(${containerShiftX}px, ${itemParallax}px, 0) rotate(${rotateAngle}deg) scale(${scaleVal})`;
            }

            // 6. Inner Video Parallax (slides video inside the overflow: hidden container)
            const video = media.querySelector("video");
            if (video) {
                const videoParallax = progress * -5; // translates from 5% to -5% for parallax motion
                
                // Shift video ever so slightly in the opposite direction for parallax depth separation
                const shiftX = globalMouseX * -8 * focusFactor; // max 4px horizontal offset at peak focus
                const shiftY = globalMouseY * -8 * focusFactor; // max 4px vertical offset at peak focus

                video.style.transform = `scale(1.15) translate3d(${shiftX}px, calc(${videoParallax}% + ${shiftY}px), 0)`;
            }

            // Shift ambient video inside the glow container in sync
            const ambientVideo = item.querySelector(".ambient-glow-video");
            if (ambientVideo) {
                const videoParallax = progress * -5;
                const shiftX = globalMouseX * -8 * focusFactor;
                const shiftY = globalMouseY * -8 * focusFactor;

                ambientVideo.style.transform = `scale(1.20) translate3d(${shiftX}px, calc(${videoParallax}% + ${shiftY}px), 0)`;
            }
        });

        requestAnimationFrame(animateGallery);
    }

    // 5. INITIALIZE ON LOAD
    window.addEventListener("DOMContentLoaded", () => {
        renderGallery();
        
        // Start animation loop
        animateGallery();

        // High-performance ResizeObserver to dynamically sync spacer height with wrapper height
        if (typeof ResizeObserver !== "undefined" && wrapper && scrollSpacer) {
            const resizeObserver = new ResizeObserver(() => {
                updateSpacerHeight();
            });
            resizeObserver.observe(wrapper);
        } else {
            // Fallback for older browsers
            updateSpacerHeight();
            window.addEventListener("resize", updateSpacerHeight);
            const videos = galleryContainer.querySelectorAll("video");
            videos.forEach(v => {
                v.addEventListener("loadedmetadata", updateSpacerHeight);
            });
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(updateSpacerHeight);
            }
        }

        // Fade in page content
        const content = document.getElementById("videos-page-content");
        if (content) {
            setTimeout(() => {
                content.classList.add("active");
            }, 150);
        }
    });

    // Expose filter callback globally
    window.filterPage = renderGallery;
})();
