/* ----------------------------------------------------
   LOWPOLY UNIFIED SCRIPT SYSTEM
   Renders both Extensions (Mods) and Models (Assets) on the same page.
   Manages:
     - Grid rendering for both sections.
     - ScrollSpy menu link highlight.
     - Side floating assets parallax animations.
     - Retro synthesizer audio feedback & lightbox inspection modal.
   ---------------------------------------------------- */

(function () {
    let lowpolyCatalog = null;
    let lowpolyExtensions = [];
    let floatingAssetsData = [];

    const CHROMA_ICON = "lowpoly/hytale/chroma.svg";
    const ASSET_CACHE_VERSION = "20260706";

    function assetUrl(path) {
        if (!path || path.startsWith("data:")) return path;
        const separator = path.includes("?") ? "&" : "?";
        return `${path}${separator}v=${ASSET_CACHE_VERSION}`;
    }

    function categoryIcon(category) {
        if (window.LowpolyCatalog?.getCategoryIconMarkup) {
            return LowpolyCatalog.getCategoryIconMarkup(category);
        }
        return `<span class="card-category-icon-fallback">${category}</span>`;
    }

    function categoryLabel(category) {
        return window.LowpolyCatalog?.getCategoryLabel?.(category) || category;
    }

    function itemTitle(item) {
        return item.name || item.title || item.id;
    }

    function itemDescription(item) {
        return item.description || item.desc || "";
    }

    function extensionPackLabel(item) {
        if (!item.extensionPack) return null;
        return window.LowpolyCatalog?.getExtensionName?.(lowpolyCatalog, item.extensionPack) || item.extensionPack;
    }

    function hasVariants(item) {
        return Array.isArray(item.variants) && item.variants.length > 1;
    }

    function getDefaultVariantId(item) {
        if (!hasVariants(item)) return "";
        if (item.defaultVariant && item.variants.some(v => v.id === item.defaultVariant)) {
            return item.defaultVariant;
        }
        return item.variants[0].id;
    }

    function getVariantIndex(item, variantId) {
        if (!hasVariants(item)) return 0;
        const idx = item.variants.findIndex(v => v.id === variantId);
        return idx >= 0 ? idx : 0;
    }

    function getVariant(item, variantId) {
        if (!hasVariants(item)) return null;
        return item.variants[getVariantIndex(item, variantId)];
    }

    function buildColorSwatches(item, activeVariantId, groupLabel) {
        if (!hasVariants(item)) return "";
        return `
            <div class="card-color-swatches" role="group" aria-label="${groupLabel}">
                ${item.variants.map((v, i) => {
                    const isActive = v.id === activeVariantId || (!activeVariantId && i === 0);
                    return `
                    <button type="button"
                        class="color-swatch${isActive ? " active" : ""}"
                        data-variant-id="${v.id}"
                        style="--swatch-color: ${v.swatch || "#ccc"}"
                        aria-label="${v.label}"
                        aria-pressed="${isActive}">
                    </button>`;
                }).join("")}
            </div>`;
    }

    function buildCardVariantPicker(item, activeVariantId) {
        if (!hasVariants(item)) return "";
        const count = item.variants.length;
        const groupLabel = `Color options for ${itemTitle(item)}`;
        return `
            <div class="card-variant-picker">
                <button type="button" class="card-chroma-trigger" aria-label="${groupLabel}" aria-haspopup="true">
                    <img src="${CHROMA_ICON}" alt="" />
                </button>
                <div class="card-color-radial" role="group" aria-label="${groupLabel}">
                    ${item.variants.map((v, i) => {
                        const angle = (360 / count) * i - 90;
                        const isActive = v.id === activeVariantId || (!activeVariantId && i === 0);
                        return `
                        <button type="button"
                            class="color-swatch${isActive ? " active" : ""}"
                            data-variant-id="${v.id}"
                            style="--swatch-color: ${v.swatch || "#ccc"}; --swatch-angle: ${angle}deg"
                            aria-label="${v.label}"
                            aria-pressed="${isActive}">
                        </button>`;
                    }).join("")}
                </div>
            </div>`;
    }

    function bindCardVariantPicker(card, item) {
        const picker = card.querySelector(".card-variant-picker");
        if (!picker) return;

        const revertToSelected = () => {
            setCardVariant(card, item, card.dataset.selectedVariant || getDefaultVariantId(item));
        };

        picker.querySelector(".card-chroma-trigger")?.addEventListener("click", (e) => {
            e.stopPropagation();
        });

        picker.addEventListener("mouseleave", revertToSelected);

        picker.querySelectorAll(".color-swatch").forEach(btn => {
            btn.addEventListener("mouseenter", () => {
                setCardVariant(card, item, btn.dataset.variantId);
                playSound("hover");
            });
            btn.addEventListener("focus", () => {
                setCardVariant(card, item, btn.dataset.variantId);
            });
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                card.dataset.selectedVariant = btn.dataset.variantId;
                setCardVariant(card, item, btn.dataset.variantId);
                playSound("hover");
            });
        });
    }

    function setCardVariant(card, item, variantId) {
        const variant = getVariant(item, variantId);
        if (!variant) return;

        const img = card.querySelector(".card-preview-img");
        if (img) {
            img.src = variant.image;
            img.dataset.src = variant.image;
            img.alt = `${itemTitle(item)}, ${variant.label}`;
        }

        card.dataset.selectedVariant = variant.id;
        card.querySelectorAll(".color-swatch").forEach(btn => {
            const isActive = btn.dataset.variantId === variant.id;
            btn.classList.toggle("active", isActive);
            btn.setAttribute("aria-pressed", isActive ? "true" : "false");
        });
    }

    // 2. RETRO AUDIO FEEDBACK
    let audioCtx = null;
    let lastHoverSoundAt = 0;
    const HOVER_SOUND_MS = 120;

    function playSound(type) {
        try {
            if (type === "hover") {
                const now = performance.now();
                if (now - lastHoverSoundAt < HOVER_SOUND_MS) return;
                lastHoverSoundAt = now;
            }

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
    const FLOATING_ASSET_COUNT = 12;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const parallaxEnabled = !prefersReducedMotion && window.innerWidth > 992;

    let activeFloatingAssets = [];
    let scrollScheduled = false;
    let parallaxActive = false;
    let lastScrollTop = -1;
    let modelsSectionTop = 0;
    let scrollSpyActive = "extensions";

    function cacheScrollSpyMetrics() {
        const modelsSec = document.getElementById("models");
        modelsSectionTop = modelsSec ? modelsSec.offsetTop : 0;
    }

    function updateParallax() {
        if (!parallaxActive || activeFloatingAssets.length === 0) return;

        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        if (scrollTop === lastScrollTop) return;
        lastScrollTop = scrollTop;

        for (let i = 0; i < activeFloatingAssets.length; i++) {
            const item = activeFloatingAssets[i];
            const yOffset = scrollTop * item.speed;
            const currentRot = item.baseRot + scrollTop * item.rotSpeed;
            item.element.style.transform = `translate3d(0, ${yOffset}px, 0) rotate(${currentRot}deg) scale(${item.scale})`;
        }
    }

    function setParallaxActive(active) {
        parallaxActive = active && parallaxEnabled && activeFloatingAssets.length > 0;
        if (!parallaxActive) lastScrollTop = -1;
    }

    function initParallaxVisibility() {
        const container = document.getElementById("floating-assets-container");
        if (!container || !("IntersectionObserver" in window)) {
            setParallaxActive(parallaxEnabled);
            return;
        }

        const visibilityObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => setParallaxActive(entry.isIntersecting));
        }, { rootMargin: "100px 0px", threshold: 0 });

        visibilityObserver.observe(container);
    }

    // Spawn decorative side assets (capped — not one per catalog item)
    function spawnFloatingAssets() {
        if (!parallaxEnabled) return;

        const container = document.getElementById("floating-assets-container");
        if (!container) return;

        container.innerHTML = "";
        activeFloatingAssets = [];

        const startPct = 8;
        const endPct = 92;
        const count = Math.min(FLOATING_ASSET_COUNT, floatingAssetsData.length);
        const step = (endPct - startPct) / count;

        for (let index = 0; index < count; index++) {
            const asset = floatingAssetsData[index * Math.floor(floatingAssetsData.length / count)] || floatingAssetsData[index];
            const side = index % 2 === 0 ? "left" : "right";

            const bandStart = startPct + index * step;
            const bandEnd = bandStart + step;
            const topPercent = bandStart + Math.random() * (bandEnd - bandStart);
            const sidePercent = 2 + Math.random() * 18;

            const scale = 0.45 + Math.random() * 0.45;
            const baseRot = -25 + Math.random() * 50;
            const speed = (0.8 - scale) * 0.28;
            const rotSpeed = -0.04 + Math.random() * 0.08;
            const baseWidth = 90 + (scale - 0.5) * 80;
            const opacity = 0.2 + Math.random() * 0.35;

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

            el.style.transform = `translate3d(0, 0, 0) rotate(${baseRot}deg) scale(${scale})`;
            el.innerHTML = `<img src="lowpoly/hytale/block.png" alt="" loading="lazy" decoding="async" width="${Math.round(baseWidth)}" height="${Math.round(baseWidth)}" />`;

            container.appendChild(el);

            activeFloatingAssets.push({
                element: el,
                scale,
                baseRot,
                speed,
                rotSpeed
            });
        }

        initParallaxVisibility();
        updateParallax();
    }

    // 4. BENTO GRID RENDERING
    // Images use data-src and are swapped to src only when entering viewport
    function renderGrid(items, isModpacks, targetGridId) {
        const grid = document.getElementById(targetGridId);
        if (!grid) return;

        grid.innerHTML = "";

        items.forEach(item => {
            const card = document.createElement("div");
            const sizeClass = isModpacks ? `card-${item.size || "normal"}` : "card-normal";
            const itemHasVariants = !isModpacks && hasVariants(item);
            const defaultVariantId = itemHasVariants ? getDefaultVariantId(item) : "";
            card.className = `bento-card ${sizeClass} cat-${item.category}${isModpacks ? " is-modpack" : ""}${itemHasVariants ? " has-variants" : ""}`;
            card.setAttribute("role", "button");
            card.setAttribute("tabindex", "0");
            card.setAttribute("aria-label", `View details for ${itemTitle(item)}`);
            card.dataset.category = item.category;
            if (defaultVariantId) card.dataset.selectedVariant = defaultVariantId;

            const variantMarkup = itemHasVariants ? buildCardVariantPicker(item, defaultVariantId) : "";

            const logoMarkup = isModpacks && item.logo ? `
                <img class="card-pack-logo" src="${assetUrl(item.logo)}" alt="" aria-hidden="true" loading="lazy" decoding="async" />
            ` : "";

            const modpackCopyMarkup = isModpacks ? `
                <div class="card-modpack-blur" aria-hidden="true"></div>
                <div class="card-modpack-shade" aria-hidden="true"></div>
                <div class="card-modpack-copy">
                    <h3 class="card-modpack-title">${itemTitle(item)}</h3>
                    ${item.curseforgeUrl ? `
                    <a class="curseforge-badge" href="${item.curseforgeUrl}" target="_blank" rel="noopener" aria-label="Available on CurseForge" onclick="event.stopPropagation()">
                        <img src="assets/curseforge.svg" alt="CurseForge" class="cf-icon" />
                        <span>Available on CurseForge</span>
                    </a>` : ""}
                </div>
            ` : "";

            const modpackBadgeMarkup = isModpacks ? `
                <span class="card-badge" role="img" aria-label="${categoryLabel(item.category)}">${categoryIcon(item.category)}</span>
            ` : "";

            const modelCardMarkup = !isModpacks ? `
                <span class="card-badge" role="img" aria-label="${categoryLabel(item.category)}">${categoryIcon(item.category)}</span>
                <div class="card-info">
                    <h3 class="card-title-text">${itemTitle(item)}</h3>
                </div>
            ` : "";

            card.innerHTML = `
                <div class="card-media${isModpacks ? " card-media--modpack" : ""}">
                    <img class="card-preview-img" data-src="${assetUrl(item.image)}" src="" alt="${itemTitle(item)}" loading="lazy" decoding="async" />
                    ${logoMarkup}
                    ${modpackCopyMarkup}
                </div>
                ${variantMarkup}
                ${modpackBadgeMarkup}
                ${modelCardMarkup}
            `;

            if (itemHasVariants) {
                bindCardVariantPicker(card, item);
            }

            card.addEventListener("mouseenter", () => playSound("hover"));
            card.addEventListener("click", () => {
                playSound("select");
                openLightbox(item, card.dataset.selectedVariant, !isModpacks);
            });
            card.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    playSound("select");
                    openLightbox(item, card.dataset.selectedVariant, !isModpacks);
                }
            });

            grid.appendChild(card);
        });
    }

    // 5. LAZY IMAGE LOADING via IntersectionObserver
    let imgObserver;

    function observeLazyImages(root) {
        const scope = root || document;
        const images = scope.querySelectorAll("img[data-src]");
        if (!images.length) return;

        if (!("IntersectionObserver" in window)) {
            images.forEach(img => {
                img.src = img.dataset.src;
                img.removeAttribute("data-src");
            });
            return;
        }

        if (!imgObserver) {
            imgObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute("data-src");
                    imgObserver.unobserve(img);
                });
            }, {
                rootMargin: "120px 0px",
                threshold: 0
            });
        }

        images.forEach(img => imgObserver.observe(img));
    }

    function initImageLazyLoad() {
        observeLazyImages();
    }

    // 6. SCROLL REVEAL (Intersection Observer)
    let revealObserver;

    function observeRevealElements(root) {
        const scope = root || document;
        const elements = scope.querySelectorAll(".bento-card:not(.revealed), .reveal-on-scroll:not(.is-revealed)");
        if (!elements.length) return;

        if (!("IntersectionObserver" in window)) {
            elements.forEach(el => {
                el.classList.add(el.classList.contains("bento-card") ? "revealed" : "is-revealed");
            });
            return;
        }

        if (!revealObserver) {
            revealObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    const el = entry.target;
                    if (el.classList.contains("bento-card")) {
                        el.classList.add("revealed");
                    } else {
                        el.classList.add("is-revealed");
                    }
                    revealObserver.unobserve(el);
                });
            }, {
                rootMargin: "0px 0px -40px 0px",
                threshold: 0.1
            });
        }

        elements.forEach(el => revealObserver.observe(el));
    }

    function initScrollReveal() {
        observeRevealElements();
    }

    // 7. FILTER BAR LOGIC (Models/Asset library)
    function initFilterBar() {
        const bar = document.getElementById("models-filter-bar");
        if (!bar) return;

        bar.addEventListener("click", (e) => {
            const pill = e.target.closest(".filter-pill");
            if (!pill) return;

            // Update active pill
            bar.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
            pill.classList.add("active");

            const filter = pill.dataset.filter;
            const cards = document.querySelectorAll("#models-grid .bento-card");

            cards.forEach(card => {
                const matches = filter === "all" || card.dataset.category === filter;
                const wasHidden = card.classList.contains("filter-hidden");
                card.classList.toggle("filter-hidden", !matches);
                if (matches && wasHidden) {
                    card.style.transitionDelay = "0ms";
                    observeRevealElements(card);
                    observeLazyImages(card);
                }
            });
        });
    }

    // 8. SCROLL SPY MENU ACTIVE LINK STATE
    function updateScrollSpy() {
        const linkExt = document.getElementById("nav-link-extensions");
        const linkMod = document.getElementById("nav-link-models");
        const modelsSec = document.getElementById("models");
        if ((!linkExt && !linkMod) || !modelsSec) return;

        const modelsRect = modelsSec.getBoundingClientRect();
        const nextActive = modelsRect.top <= window.innerHeight / 2 ? "models" : "extensions";

        if (nextActive === scrollSpyActive) return;
        scrollSpyActive = nextActive;

        if (nextActive === "models") {
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
    const lightboxAssetNumber = document.getElementById("lightbox-asset-number");
    const lightboxExtensionPack = document.getElementById("lightbox-extension-pack");
    const lightboxDesc = document.getElementById("lightbox-desc");
    const lightboxMainImg = document.getElementById("lightbox-main-img");
    const lightboxGallery = document.getElementById("lightbox-gallery");
    const lightboxDots = document.getElementById("lightbox-dots");
    const lightboxDownloadBtn = document.getElementById("lightbox-download-btn");
    const lightboxPrev = document.getElementById("lightbox-prev");
    const lightboxNext = document.getElementById("lightbox-next");
    const lightboxColorPicker = document.getElementById("lightbox-color-picker");
    const lightboxColorBlock = document.getElementById("lightbox-color-block");
    const lightboxVariantLabel = document.getElementById("lightbox-variant-label");

    let currentImages = [];
    let currentGalleryIndex = 0;
    let currentLightboxItem = null;

    function syncLightboxColorPicker(variantIndex) {
        if (!lightboxColorPicker) return;
        lightboxColorPicker.querySelectorAll(".color-swatch").forEach((btn, i) => {
            btn.classList.toggle("active", i === variantIndex);
            btn.setAttribute("aria-pressed", i === variantIndex ? "true" : "false");
        });
        const variant = currentLightboxItem?.variants?.[variantIndex];
        if (lightboxVariantLabel) {
            lightboxVariantLabel.textContent = variant ? variant.label : "";
        }
    }

    function setGalleryIndex(idx) {
        currentGalleryIndex = Math.max(0, Math.min(idx, currentImages.length - 1));
        if (lightboxMainImg) {
            lightboxMainImg.style.opacity = "0";
            setTimeout(() => {
                lightboxMainImg.src = currentImages[currentGalleryIndex];
                lightboxMainImg.style.opacity = "1";
            }, 150);
        }
        document.querySelectorAll(".lb-dot").forEach((dot, i) => {
            dot.classList.toggle("active", i === currentGalleryIndex);
        });
        document.querySelectorAll(".lb-thumb").forEach((thumb, i) => {
            thumb.classList.toggle("active", i === currentGalleryIndex);
        });
        if (lightboxPrev) lightboxPrev.style.display = currentImages.length > 1 ? "" : "none";
        if (lightboxNext) lightboxNext.style.display = currentImages.length > 1 ? "" : "none";

        if (currentLightboxItem && hasVariants(currentLightboxItem)) {
            syncLightboxColorPicker(currentGalleryIndex);
            const variant = currentLightboxItem.variants[currentGalleryIndex];
            if (lightboxMainImg && variant) {
                lightboxMainImg.alt = `${itemTitle(currentLightboxItem)}, ${variant.label}`;
            }
        }
    }

    function openLightbox(item, variantId, isModelAsset) {
        if (!lightboxModal) return;

        currentLightboxItem = item;

        if (hasVariants(item)) {
            currentImages = item.variants.map(v => assetUrl(v.image));
            currentGalleryIndex = getVariantIndex(item, variantId);
        } else {
            const sources = (item.images && item.images.length > 0) ? item.images : [item.image];
            currentImages = sources.map(assetUrl);
            currentGalleryIndex = 0;
        }

        if (lightboxMainImg) {
            lightboxMainImg.src = currentImages[currentGalleryIndex];
            const variant = getVariant(item, variantId);
            lightboxMainImg.alt = variant
                ? `${itemTitle(item)}, ${variant.label}`
                : itemTitle(item);
            lightboxMainImg.style.opacity = "1";
        }

        if (lightboxTitle) lightboxTitle.textContent = itemTitle(item);
        if (lightboxCategory) {
            lightboxCategory.textContent = categoryLabel(item.category);
        }
        if (lightboxAssetNumber) {
            if (isModelAsset && item.assetNumber != null) {
                lightboxAssetNumber.textContent = `#${item.assetNumber}`;
                lightboxAssetNumber.hidden = false;
            } else {
                lightboxAssetNumber.textContent = "";
                lightboxAssetNumber.hidden = true;
            }
        }
        if (lightboxExtensionPack) {
            const packLabel = extensionPackLabel(item);
            if (isModelAsset && packLabel) {
                lightboxExtensionPack.textContent = packLabel;
                lightboxExtensionPack.hidden = false;
            } else {
                lightboxExtensionPack.textContent = "";
                lightboxExtensionPack.hidden = true;
            }
        }
        if (lightboxDesc) {
            const desc = itemDescription(item);
            lightboxDesc.textContent = desc || "No description provided.";
        }

        if (lightboxColorPicker) {
            if (hasVariants(item)) {
                lightboxColorPicker.innerHTML = buildColorSwatches(
                    item,
                    item.variants[currentGalleryIndex].id,
                    `Color options for ${itemTitle(item)}`
                );
                if (lightboxColorBlock) lightboxColorBlock.hidden = false;
                lightboxColorPicker.querySelectorAll(".color-swatch").forEach(btn => {
                    btn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        setGalleryIndex(getVariantIndex(item, btn.dataset.variantId));
                        playSound("hover");
                    });
                });
                syncLightboxColorPicker(currentGalleryIndex);
            } else {
                lightboxColorPicker.innerHTML = "";
                if (lightboxColorBlock) lightboxColorBlock.hidden = true;
                if (lightboxVariantLabel) lightboxVariantLabel.textContent = "";
            }
        }

        if (lightboxGallery) {
            lightboxGallery.innerHTML = "";
            const showGallery = !hasVariants(item) && currentImages.length > 1;
            if (showGallery) {
                currentImages.forEach((src, i) => {
                    const thumb = document.createElement("button");
                    thumb.className = "lb-thumb" + (i === currentGalleryIndex ? " active" : "");
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

        if (lightboxDots) {
            lightboxDots.innerHTML = "";
            const showDots = currentImages.length > 1;
            if (showDots) {
                currentImages.forEach((_, i) => {
                    const dot = document.createElement("button");
                    dot.className = "lb-dot" + (i === currentGalleryIndex ? " active" : "");
                    dot.setAttribute("aria-label", hasVariants(item)
                        ? `Show ${item.variants[i].label} color`
                        : `Go to image ${i + 1}`);
                    dot.addEventListener("click", (e) => { e.stopPropagation(); setGalleryIndex(i); });
                    lightboxDots.appendChild(dot);
                });
                lightboxDots.style.display = "";
            } else {
                lightboxDots.style.display = "none";
            }
        }

        if (lightboxPrev) lightboxPrev.style.display = currentImages.length > 1 ? "" : "none";
        if (lightboxNext) lightboxNext.style.display = currentImages.length > 1 ? "" : "none";

        // Download button (extension sets only — not model library assets)
        if (lightboxDownloadBtn) {
            if (isModelAsset) {
                lightboxDownloadBtn.hidden = true;
            } else {
                lightboxDownloadBtn.hidden = false;
                const avail = item.downloadAvailable !== false;
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
        }

        // Category class for coloring; circular backdrop only on model library assets
        lightboxModal.className = `lightbox cat-${item.category}${isModelAsset ? " lightbox--asset" : " lightbox--extension"}`;
        lightboxModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        document.body.classList.add("lightbox-open");

        requestAnimationFrame(() => {
            lightboxModal.classList.add("active");
        });
    }

    function closeLightbox() {
        if (!lightboxModal) return;
        lightboxModal.classList.remove("active");
        document.body.style.overflow = "";
        document.body.classList.remove("lightbox-open");
        setTimeout(() => {
            lightboxModal.setAttribute("aria-hidden", "true");
            if (lightboxMainImg) lightboxMainImg.src = "";
            lightboxModal.className = "lightbox";
            currentImages = [];
            currentLightboxItem = null;
        }, 350);
    }

    // Arrow navigation
    if (lightboxPrev) lightboxPrev.addEventListener("click", (e) => { e.stopPropagation(); setGalleryIndex(currentGalleryIndex - 1); });
    if (lightboxNext) lightboxNext.addEventListener("click", (e) => { e.stopPropagation(); setGalleryIndex(currentGalleryIndex + 1); });

    const lightboxCloseBtn = document.getElementById("lightbox-close");
    if (lightboxCloseBtn) {
        lightboxCloseBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            closeLightbox();
        });
    }

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

    // 9. INITIALIZE PAGE
    async function initLowpolyPage(signal) {
        const galleryContent = document.getElementById("lowpoly-gallery-content");
        setTimeout(() => {
            if (galleryContent) galleryContent.classList.add("active");
        }, 150);

        try {
            if (window.LowpolyCatalog) {
                lowpolyCatalog = await LowpolyCatalog.loadCatalog();
                lowpolyExtensions = lowpolyCatalog.extensions || [];
                floatingAssetsData = lowpolyCatalog.items || [];
                renderGrid(lowpolyExtensions, true, "extensions-grid");
            } else {
                console.error("lowpoly-catalog.js must be loaded before lowpoly.js");
            }
        } catch (err) {
            console.error("Failed to load lowpoly catalog:", err);
        }

        renderGrid(floatingAssetsData, false, "models-grid");

        // Wire up filter pills
        initFilterBar();

        // Start lazy-loading images (data-src → src when near viewport)
        initImageLazyLoad();

        // Defer decorative floating assets until browser is idle
        // so they never block the initial critical render path
        const spawnWhenIdle = typeof requestIdleCallback === "function"
            ? (fn) => requestIdleCallback(fn, { timeout: 2000 })
            : (fn) => setTimeout(fn, 500);
        spawnWhenIdle(spawnFloatingAssets);

        cacheScrollSpyMetrics();

        const scrollOpts = signal ? { passive: true, signal } : { passive: true };
        window.addEventListener("scroll", () => {
            if (!scrollScheduled) {
                scrollScheduled = true;
                requestAnimationFrame(() => {
                    updateParallax();
                    updateScrollSpy();
                    scrollScheduled = false;
                });
            }
        }, scrollOpts);

        window.addEventListener("resize", () => {
            cacheScrollSpyMetrics();
            updateParallax();
            updateScrollSpy();
        }, scrollOpts);

        updateScrollSpy();
        initScrollReveal();
        initImageLazyLoad();
    }

    window.addEventListener("DOMContentLoaded", () => {
        if (window.SpaPages && window.SpaPages.lowpoly) {
            window.SpaPages.lowpoly.init();
        } else {
            initLowpolyPage();
        }
    });

    let lowpolyAbort = null;

    window.SpaPages = window.SpaPages || {};
    window.SpaPages.lowpoly = {
        init: function () {
            if (lowpolyAbort) lowpolyAbort.abort();
            lowpolyAbort = new AbortController();
            initLowpolyPage(lowpolyAbort.signal);
        },
        destroy: function () {
            if (lowpolyAbort) lowpolyAbort.abort();
            lowpolyAbort = null;
            const lb = document.getElementById("lightbox");
            if (lb) {
                lb.classList.remove("active");
                lb.setAttribute("aria-hidden", "true");
            }
            document.body.style.overflow = "";
            document.body.classList.remove("lightbox-open");
            document.body.classList.remove("lightbox-open");
            const floating = document.getElementById("floating-assets-container");
            if (floating) floating.innerHTML = "";
        }
    };
})();
