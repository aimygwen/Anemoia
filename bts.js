(function () {
    // 1. BEHIND THE SCENES ASSETS DATABASE
    const btsAssets = [
        { 
            id: 1, 
            title: "Fennec Glider Wireframe", 
            category: "wireframe", 
            image: "lowpoly/hytale_creature.png", 
            size: "large", 
            desc: "Low-poly creature mesh wireframe detailing optimized polygon topology, bone weight placement, and deformation pivots for game engine integration." 
        },
        { 
            id: 2, 
            title: "Crystal Spire Node Mesh", 
            category: "mesh", 
            image: "lowpoly/hytale_crystal.png", 
            size: "normal", 
            desc: "Voxel density study illustrating vertex alignment and block grid subdivision layout for emissive elemental crystals." 
        },
        { 
            id: 3, 
            title: "Prismatic Sword Progress", 
            category: "progress", 
            image: "lowpoly/hytale_sword.png", 
            size: "wide", 
            desc: "Step-by-step detailing passes showing the progression from simple flat vector blocks to complex shaded, highlighted voxel blades." 
        },
        { 
            id: 4, 
            title: "Aetherial Birch Blockout", 
            category: "wireframe", 
            image: "lowpoly/hytale_tree.png", 
            size: "tall", 
            desc: "Volumetric space-filling blockout modeling leaf cluster distributions, weight distribution, and branching roots in voxel space." 
        },
        { 
            id: 5, 
            title: "Mascot Sketch Progression", 
            category: "progress", 
            image: "assets/Bunny.png", 
            size: "normal", 
            desc: "Original pixel-art sketches and shape-proportion tests for the official bunny mascot emblem before color execution." 
        },
        { 
            id: 6, 
            title: "Aimy Portrait Blockout", 
            category: "progress", 
            image: "assets/portrait.png", 
            size: "wide", 
            desc: "Early lighting composition thumbnails and values blocking for the portrait scene, showing the foundational setup before detailing." 
        }
    ];

    // 2. DOM ELEMENT SELECTORS
    const gridContainer = document.getElementById("bento-grid");
    const btsContent = document.getElementById("bts-page-content");

    // Lightbox Selectors
    const lightboxModal = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightbox-img");
    const lightboxTitle = document.getElementById("lightbox-title");
    const lightboxCategory = document.getElementById("lightbox-category");
    const lightboxDesc = document.getElementById("lightbox-desc");
    const lightboxCloseBtn = document.querySelector(".lightbox-close");

    // 3. RENDER BENTO GRID ITEMS
    function renderGrid(filter = "all") {
        if (!gridContainer) return;
        
        gridContainer.style.opacity = "0.3";
        gridContainer.style.transition = "opacity 0.2s ease";
        
        setTimeout(() => {
            gridContainer.innerHTML = "";

            const filtered = btsAssets.filter(item => filter === "all" || item.category === filter);

            filtered.forEach(item => {
                const card = document.createElement("div");
                card.className = `bento-card card-${item.size} cat-${item.category}`;
                card.setAttribute("role", "button");
                card.setAttribute("tabindex", "0");
                card.setAttribute("aria-label", `View details for ${item.title}`);
                
                card.innerHTML = `
                    <div class="corner-bracket top-left"></div>
                    <div class="corner-bracket top-right"></div>
                    <div class="corner-bracket bottom-left"></div>
                    <div class="corner-bracket bottom-right"></div>
                    <div class="card-media">
                        <img src="${item.image}" alt="${item.title}" loading="lazy" />
                    </div>
                    <div class="card-info">
                        <h3 class="card-title-text">${item.title}</h3>
                        <span class="card-badge">${item.category}</span>
                    </div>
                `;

                // Card Lightbox trigger
                card.addEventListener("click", () => openLightbox(item));
                card.addEventListener("keydown", (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openLightbox(item);
                    }
                });

                gridContainer.appendChild(card);
            });

            gridContainer.style.opacity = "1";
            initScrollReveal();
        }, 200);
    }

    // 4. STAGGERED SCROLL REVEAL (Intersection Observer)
    let revealObserver;
    function initScrollReveal() {
        if (revealObserver) revealObserver.disconnect();

        if (!("IntersectionObserver" in window)) {
            document.querySelectorAll(".bento-card").forEach(card => card.classList.add("revealed"));
            return;
        }

        revealObserver = new IntersectionObserver((entries) => {
            let staggerDelay = 0;
            const threshold = 50; 

            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const card = entry.target;
                    card.style.transitionDelay = `${staggerDelay}ms`;
                    card.classList.add("revealed");
                    staggerDelay += threshold;
                    revealObserver.unobserve(card);
                }
            });
        }, {
            rootMargin: "0px 0px -40px 0px",
            threshold: 0.1
        });

        document.querySelectorAll(".bento-card").forEach(card => {
            revealObserver.observe(card);
        });
    }

    // 5. LIGHTBOX MODAL EVENT HANDLERS
    function openLightbox(item) {
        if (!lightboxModal) return;
        
        lightboxImg.src = item.image;
        lightboxImg.alt = item.title;
        lightboxTitle.textContent = item.title;
        lightboxCategory.textContent = item.category;
        
        // Apply category class for colors
        lightboxModal.className = `lightbox cat-${item.category}`;
        lightboxDesc.textContent = item.desc || "No description provided.";
        
        lightboxModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        
        requestAnimationFrame(() => {
            lightboxModal.classList.add("active");
        });
        
        if (lightboxCloseBtn) lightboxCloseBtn.focus();
    }

    // Close Lightbox
    function closeLightbox() {
        if (!lightboxModal) return;
        
        lightboxModal.classList.remove("active");
        document.body.style.overflow = "";
        
        setTimeout(() => {
            lightboxModal.setAttribute("aria-hidden", "true");
            lightboxImg.src = "";
            lightboxModal.className = "lightbox";
        }, 350);
    }

    if (lightboxCloseBtn) {
        lightboxCloseBtn.addEventListener("click", closeLightbox);
    }
    if (lightboxModal) {
        lightboxModal.addEventListener("click", (e) => {
            if (e.target === lightboxModal) closeLightbox();
        });
    }
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && lightboxModal && lightboxModal.getAttribute("aria-hidden") === "false") {
            closeLightbox();
        }
    });



    // 7. INITIALIZE PAGE
    window.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => {
            if (btsContent) btsContent.classList.add("active");
        }, 150);

        renderGrid();
    });

    // Expose filter callback globally
    window.filterPage = renderGrid;
})();
