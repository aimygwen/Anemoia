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

    const ASSET_BASE = typeof window !== "undefined" && window.LOWPOLY_ASSET_BASE
        ? String(window.LOWPOLY_ASSET_BASE)
        : "";
    const ASSET_CACHE_VERSION = "20260721";

    function assetUrl(path) {
        if (!path || path.startsWith("data:") || path.startsWith("http://") || path.startsWith("https://") || path.startsWith("//")) {
            return path;
        }
        let clean = String(path).replace(/^\.\//, "");
        if (
            clean === "icons/curseforge.svg" ||
            clean === "assets/icons/curseforge.svg" ||
            clean === "ui/icons/curseforge.svg" ||
            clean === "polykroma/icons/curseforge.svg" ||
            clean === "assets/polykroma/icons/curseforge.svg"
        ) {
            // Chrome icons sit under assets/polykroma, not assets/content/
            clean = "assets/polykroma/icons/curseforge.svg";
            const separator = clean.includes("?") ? "&" : "?";
            return `${clean}${separator}v=${ASSET_CACHE_VERSION}`;
        }
        // When base already ends with assets/, avoid assets/assets/...
        if (ASSET_BASE && /(?:^|\/)assets\/$/.test(ASSET_BASE) && clean.startsWith("assets/")) {
            clean = clean.slice("assets/".length);
        }
        // When base is assets/content/, strip a leading content/ from catalog-relative paths
        if (ASSET_BASE && /(?:^|\/)content\/$/.test(ASSET_BASE) && clean.startsWith("content/")) {
            clean = clean.slice("content/".length);
        }
        let resolved;
        if (!ASSET_BASE) {
            resolved = clean;
        } else if (clean.startsWith(ASSET_BASE) || path.startsWith(ASSET_BASE)) {
            resolved = clean.startsWith(ASSET_BASE) ? clean : path;
        } else {
            resolved = ASSET_BASE + clean;
        }
        const separator = resolved.includes("?") ? "&" : "?";
        return `${resolved}${separator}v=${ASSET_CACHE_VERSION}`;
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
                <button type="button" class="card-chroma-trigger" aria-label="${groupLabel}" aria-expanded="false" aria-haspopup="true">
                    <span class="card-chroma-dot" aria-hidden="true"></span>
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

        const trigger = picker.querySelector(".card-chroma-trigger");
        const radial = picker.querySelector(".card-color-radial");
        if (!trigger || !radial) return;

        const selectedId = () => card.dataset.selectedVariant || getDefaultVariantId(item);

        const setOpen = (open) => {
            picker.classList.toggle("is-open", open);
            trigger.setAttribute("aria-expanded", open ? "true" : "false");
            if (!open) {
                setCardVariant(card, item, selectedId(), { commit: false });
            }
        };

        // Keep interactions from opening the lightbox
        picker.addEventListener("click", (e) => e.stopPropagation());
        picker.addEventListener("pointerdown", (e) => e.stopPropagation());

        trigger.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(!picker.classList.contains("is-open"));
            playSound("hover");
        });

        // Desktop: open while hovering the picker hit area
        picker.addEventListener("pointerenter", () => {
            if (window.matchMedia("(hover: hover)").matches) setOpen(true);
        });
        picker.addEventListener("pointerleave", () => {
            setOpen(false);
        });

        radial.querySelectorAll(".color-swatch").forEach((btn) => {
            btn.addEventListener("pointerenter", () => {
                setCardVariant(card, item, btn.dataset.variantId, { commit: false });
                playSound("hover");
            });
            btn.addEventListener("focus", () => {
                setOpen(true);
                setCardVariant(card, item, btn.dataset.variantId, { commit: false });
            });
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                setCardVariant(card, item, btn.dataset.variantId, { commit: true });
                playSound("select");
            });
        });
    }

    function setCardVariant(card, item, variantId, options = {}) {
        const { commit = true } = options;
        const variant = getVariant(item, variantId);
        if (!variant) return;

        const img = card.querySelector(".card-preview-img");
        if (img) {
            const nextSrc = assetUrl(variant.image);
            img.src = nextSrc;
            img.removeAttribute("data-src");
            img.alt = `${itemTitle(item)}, ${variant.label}`;
        }

        if (commit) {
            card.dataset.selectedVariant = variant.id;
        }

        const pressedId = card.dataset.selectedVariant || variant.id;
        card.querySelectorAll(".color-swatch").forEach((btn) => {
            const isPreview = btn.dataset.variantId === variant.id;
            const isPressed = btn.dataset.variantId === pressedId;
            btn.classList.toggle("active", isPreview);
            btn.setAttribute("aria-pressed", isPressed ? "true" : "false");
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

    function updateParallax() {
        if (!parallaxActive || activeFloatingAssets.length === 0) return;

        const scrollTop =
            (window.__lenis && typeof window.__lenis.scroll === "number"
                ? window.__lenis.scroll
                : null) ??
            (window.pageYOffset || document.documentElement.scrollTop);
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
            el.innerHTML = `<img src="${assetUrl("lowpoly/hytale/block.png")}" alt="" loading="lazy" decoding="async" width="${Math.round(baseWidth)}" height="${Math.round(baseWidth)}" />`;

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

    // 4b. FEATURED-STYLE EXTENSIONS CAROUSEL (matches main-page Work section)
    function renderExtensionsFeatured(items) {
        const stage = document.getElementById("extensions-stage");
        const nav = document.getElementById("extensions-nav");
        if (!stage || !nav || !items.length) return;

        const n = items.length;
        let index = 0;

        const slots = [
            { key: "prev", offset: -1 },
            { key: "center", offset: 0 },
            { key: "next", offset: 1 },
        ];

        stage.innerHTML = "";
        nav.innerHTML = "";

        const columns = slots.map(({ key, offset }) => {
            const col = document.createElement("article");
            col.className = `lp-featured__col lp-featured__col--${key}`;
            col.dataset.slot = key;
            col.innerHTML = `
                <button type="button" class="lp-featured__media" aria-label="">
                    <img class="lp-featured__img" src="" alt="" decoding="async" />
                    <img class="lp-featured__pack-logo" src="" alt="" hidden decoding="async" />
                    ${offset !== 0 ? `
                    <span class="lp-featured__arrow" aria-hidden="true">
                        <svg viewBox="0 0 50 50" width="40" height="40" focusable="false">
                            ${offset < 0
                                ? '<polygon points="48 24.5 3 24.5 12.4 12.3 11.6 11.7 1.4 25 11.6 37.3 12.4 36.7 3.1 25.5 48 25.5 48 24.5"></polygon>'
                                : '<polygon points="38.4 11.7 37.6 12.3 47 24.5 2 24.5 2 25.5 46.9 25.5 37.6 36.7 38.4 37.3 48.6 25 38.4 11.7"></polygon>'}
                        </svg>
                    </span>` : ""}
                </button>
                <div class="lp-featured__meta">
                    <p class="lp-featured__status"></p>
                    <h3 class="lp-featured__title"></h3>
                    <p class="lp-featured__caption"></p>
                </div>
            `;
            stage.appendChild(col);
            return {
                col,
                offset,
                media: col.querySelector(".lp-featured__media"),
                img: col.querySelector(".lp-featured__img"),
                packLogo: col.querySelector(".lp-featured__pack-logo"),
                status: col.querySelector(".lp-featured__status"),
                title: col.querySelector(".lp-featured__title"),
                caption: col.querySelector(".lp-featured__caption")
            };
        });

        items.forEach((_, i) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "lp-featured__num";
            btn.innerHTML = `<span>${i + 1}</span>`;
            btn.setAttribute("aria-label", `Show extension set ${i + 1}`);
            btn.addEventListener("click", () => {
                playSound("select");
                setIndex(i);
            });
            nav.appendChild(btn);
        });

        const nums = [...nav.querySelectorAll(".lp-featured__num")];

        function wrap(i) {
            return ((i % n) + n) % n;
        }

        function fillSlot(slot, itemIndex) {
            const item = items[itemIndex];
            const title = itemTitle(item);
            const caption = item.cardDesc || item.cardDescription || item.desc || "";
            slot.img.src = assetUrl(item.image);
            slot.img.alt = title;
            if (slot.packLogo) {
                if (item.logo) {
                    slot.packLogo.src = assetUrl(item.logo);
                    slot.packLogo.alt = "";
                    slot.packLogo.hidden = false;
                    slot.packLogo.removeAttribute("hidden");
                } else {
                    slot.packLogo.removeAttribute("src");
                    slot.packLogo.hidden = true;
                    slot.packLogo.setAttribute("hidden", "");
                }
            }
            slot.status.textContent = categoryLabel(item.category);
            slot.title.textContent = title;
            slot.caption.textContent = caption.startsWith("+") || caption.startsWith("—")
                ? caption
                : `+ ${caption}`;
            slot.media.setAttribute(
                "aria-label",
                slot.offset === 0 ? `Open ${title}` : `Show ${title}`
            );
            slot.col.dataset.itemId = item.id;
            slot.col.dataset.itemIndex = String(itemIndex);
        }

        function setIndex(next) {
            index = wrap(next);
            columns.forEach((slot) => {
                fillSlot(slot, wrap(index + slot.offset));
            });
            nums.forEach((btn, i) => {
                const isMain = i === index;
                const isNeighbor = i === wrap(index - 1) || i === wrap(index + 1);
                btn.classList.toggle("is-active", isMain);
                btn.classList.toggle("is-neighbor", isNeighbor && !isMain);
                btn.setAttribute("aria-current", isMain ? "true" : "false");
            });
        }

        columns.forEach((slot) => {
            slot.media.addEventListener("mouseenter", () => playSound("hover"));
            slot.media.addEventListener("click", () => {
                const itemIndex = Number(slot.col.dataset.itemIndex);
                const item = items[itemIndex];
                if (!item) return;
                playSound("select");
                if (slot.offset === 0) {
                    openLightbox(item, undefined, false, slot.media);
                } else {
                    setIndex(itemIndex);
                }
                slot.media.blur();
            });
        });

        setIndex(0);
    }

    // 4. BENTO GRID RENDERING
    // Preview images use native lazy-loading; cards start revealed (scroll-IO was unreliable with content-visibility).
    function renderGrid(items, isModpacks, targetGridId) {
        const grid = document.getElementById(targetGridId);
        if (!grid) return;

        grid.innerHTML = "";

        items.forEach(item => {
            const card = document.createElement("div");
            const sizeClass = isModpacks ? `card-${item.size || "normal"}` : "card-normal";
            const itemHasVariants = !isModpacks && hasVariants(item);
            const defaultVariantId = itemHasVariants ? getDefaultVariantId(item) : "";
            card.className = `bento-card ${sizeClass} cat-${item.category} revealed${isModpacks ? " is-modpack" : ""}${itemHasVariants ? " has-variants" : ""}`;
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
                        <img src="${assetUrl("polykroma/icons/curseforge.svg")}" alt="CurseForge" class="cf-icon" />
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

            const previewSrc = assetUrl(item.image);
            /* Models: defer decode until near viewport (native lazy alone still thrashed with 90+ tiles). */
            const imgTag = isModpacks
                ? `<img class="card-preview-img" src="${previewSrc}" alt="${itemTitle(item)}" loading="lazy" decoding="async" />`
                : `<img class="card-preview-img" data-src="${previewSrc}" alt="${itemTitle(item)}" loading="lazy" decoding="async" />`;
            card.innerHTML = `
                <div class="card-media${isModpacks ? " card-media--modpack" : ""}">
                    ${imgTag}
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
                openLightbox(item, card.dataset.selectedVariant, !isModpacks, card);
            });
            card.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    playSound("select");
                    openLightbox(item, card.dataset.selectedVariant, !isModpacks, card);
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
                rootMargin: "240px 0px",
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
        if (!bar || bar.dataset.filterReady === "1") return;
        bar.dataset.filterReady = "1";

        bar.addEventListener("click", (e) => {
            const pill = e.target.closest(".filter-pill");
            if (!pill || !bar.contains(pill)) return;

            e.preventDefault();

            bar.querySelectorAll(".filter-pill").forEach((p) => {
                p.classList.toggle("active", p === pill);
                p.setAttribute("aria-pressed", p === pill ? "true" : "false");
            });

            const filter = pill.getAttribute("data-filter") || "all";
            const cards = document.querySelectorAll("#models-grid .bento-card");

            cards.forEach((card) => {
                const category = card.getAttribute("data-category") || card.dataset.category || "";
                const matches = filter === "all" || category === filter;
                card.classList.toggle("filter-hidden", !matches);
                card.hidden = !matches;
                if (matches) {
                    card.style.removeProperty("display");
                }
            });
        });
    }

    /**
     * Show category dock only while the Models / library section is in view.
     * IntersectionObserver — no continuous scroll handler.
     */
    function initFilterDockVisibility() {
        const bar = document.getElementById("models-filter-bar");
        const section = document.getElementById("models");
        if (!bar || !section || bar.dataset.dockVisibilityReady === "1") return;
        bar.dataset.dockVisibilityReady = "1";

        const setVisible = (show) => {
            bar.classList.toggle("is-visible", show);
            bar.setAttribute("aria-hidden", show ? "false" : "true");
            if ("inert" in bar) bar.inert = !show;
        };

        setVisible(false);

        if (!("IntersectionObserver" in window)) {
            let ticking = false;
            const update = () => {
                const rect = section.getBoundingClientRect();
                const vh = Math.max(window.innerHeight, 1);
                const show = rect.top < vh * 0.72 && rect.bottom > vh * 0.22;
                setVisible(show);
                ticking = false;
            };
            const onScroll = () => {
                if (ticking) return;
                ticking = true;
                requestAnimationFrame(update);
            };
            window.addEventListener("scroll", onScroll, { passive: true });
            window.addEventListener("resize", onScroll, { passive: true });
            update();
            return;
        }

        const dockObserver = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    setVisible(entry.isIntersecting);
                }
            },
            {
                root: null,
                /* Require a meaningful slice of the models section in view */
                rootMargin: "-14% 0px -20% 0px",
                threshold: 0,
            }
        );
        dockObserver.observe(section);
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
    const lightboxPackLogo = document.getElementById("lightbox-pack-logo");
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

    function openLightbox(item, variantId, isModelAsset, sourceEl) {
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

        // Download button & pack logo (extension sets only — not model library assets)
        if (lightboxPackLogo) {
            if (isModelAsset || !item.logo) {
                lightboxPackLogo.hidden = true;
                lightboxPackLogo.removeAttribute("src");
            } else {
                lightboxPackLogo.src = assetUrl(item.logo);
                lightboxPackLogo.alt = `${itemTitle(item)} logo`;
                lightboxPackLogo.hidden = false;
            }
        }

        if (lightboxDownloadBtn) {
            if (isModelAsset) {
                lightboxDownloadBtn.hidden = true;
                lightboxDownloadBtn.setAttribute("aria-hidden", "true");
                lightboxDownloadBtn.setAttribute("tabindex", "-1");
                lightboxDownloadBtn.removeAttribute("href");
                lightboxDownloadBtn.style.display = "none";
            } else {
                lightboxDownloadBtn.hidden = false;
                lightboxDownloadBtn.removeAttribute("aria-hidden");
                lightboxDownloadBtn.removeAttribute("tabindex");
                lightboxDownloadBtn.style.display = "";
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
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        lightboxModal.className = `lightbox cat-${item.category}${isModelAsset ? " lightbox--asset" : " lightbox--extension"}`;
        lightboxModal.classList.remove("lb-leaving", "lb-from-card", "lb-settled", "active");

        if (sourceEl && !reduceMotion) {
            const rect = sourceEl.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const vx = window.innerWidth / 2;
            const vy = window.innerHeight / 2;
            // Keep start scale close to final size — long jumps + big scale = jank
            const fromScale = Math.max(
                0.62,
                Math.min(0.88, Math.min(rect.width, rect.height) / Math.min(window.innerWidth * 0.5, 520))
            );
            lightboxModal.style.setProperty("--lb-from-x", `${(cx - vx).toFixed(1)}px`);
            lightboxModal.style.setProperty("--lb-from-y", `${(cy - vy).toFixed(1)}px`);
            lightboxModal.style.setProperty("--lb-from-scale", fromScale.toFixed(3));
            lightboxModal.classList.add("lb-from-card");
        } else {
            lightboxModal.style.removeProperty("--lb-from-x");
            lightboxModal.style.removeProperty("--lb-from-y");
            lightboxModal.style.removeProperty("--lb-from-scale");
        }

        lightboxModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        document.body.classList.add("lightbox-open");
        if (window.Polyglide) window.Polyglide.stop();

        const content = lightboxModal.querySelector(".lb-content");
        const settle = (event) => {
            if (event && event.target !== content) return;
            lightboxModal.classList.add("lb-settled");
            if (content) content.removeEventListener("animationend", settle);
        };
        if (content && lightboxModal.classList.contains("lb-from-card")) {
            content.addEventListener("animationend", settle);
        }

        requestAnimationFrame(() => {
            lightboxModal.classList.add("active");
        });
    }

    function closeLightbox() {
        if (!lightboxModal || lightboxModal.getAttribute("aria-hidden") === "true") return;
        lightboxModal.classList.add("lb-leaving");
        lightboxModal.classList.remove("active", "lb-settled");
        document.body.style.overflow = "";
        document.body.classList.remove("lightbox-open");
        if (window.Polyglide) window.Polyglide.start();
        setTimeout(() => {
            lightboxModal.setAttribute("aria-hidden", "true");
            lightboxModal.classList.remove("lb-leaving", "lb-from-card", "lb-settled");
            if (lightboxMainImg) lightboxMainImg.src = "";
            lightboxModal.className = "lightbox";
            lightboxModal.style.removeProperty("--lb-from-x");
            lightboxModal.style.removeProperty("--lb-from-y");
            lightboxModal.style.removeProperty("--lb-from-scale");
            if (lightboxPackLogo) {
                lightboxPackLogo.hidden = true;
                lightboxPackLogo.removeAttribute("src");
            }
            currentImages = [];
            currentLightboxItem = null;
        }, 300);
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
                if (document.getElementById("extensions-stage")) {
                    renderExtensionsFeatured(lowpolyExtensions);
                } else {
                    renderGrid(lowpolyExtensions, true, "extensions-grid");
                }
            } else if (window.LOWPOLY_CATALOG) {
                // Catalog data loaded, but loader script missing — still render.
                lowpolyCatalog = window.LOWPOLY_CATALOG;
                lowpolyExtensions = lowpolyCatalog.extensions || [];
                floatingAssetsData = lowpolyCatalog.items || [];
                if (document.getElementById("extensions-stage")) {
                    renderExtensionsFeatured(lowpolyExtensions);
                } else {
                    renderGrid(lowpolyExtensions, true, "extensions-grid");
                }
            } else {
                console.error("lowpoly-catalog.js must be loaded before lowpoly.js");
            }
        } catch (err) {
            console.error("Failed to load lowpoly catalog:", err);
        }

        renderGrid(floatingAssetsData, false, "models-grid");

        const stage = document.getElementById("extensions-stage");
        const grid = document.getElementById("models-grid");
        if (stage && !stage.children.length) {
            stage.innerHTML = `<p class="lp-load-error">Extension sets failed to load. Hard-refresh (Cmd+Shift+R) or open via http://127.0.0.1:8765/behind-the-madness/new/lowpoly.html</p>`;
        }
        if (grid && !grid.children.length) {
            grid.innerHTML = `<p class="lp-load-error">Model library failed to load (${floatingAssetsData.length} items in catalog). Hard-refresh or check the console.</p>`;
        }

        // Wire up filter pills + section-gated dock visibility
        initFilterBar();
        initFilterDockVisibility();

        // Start lazy-loading images (data-src → src when near viewport)
        initImageLazyLoad();

        const scrollOpts = signal ? { passive: true, signal } : { passive: true };
        window.addEventListener("scroll", () => {
            if (!scrollScheduled) {
                scrollScheduled = true;
                requestAnimationFrame(() => {
                    updateParallax();
                    scrollScheduled = false;
                });
            }
        }, scrollOpts);

        window.addEventListener("resize", () => {
            updateParallax();
        }, scrollOpts);

        initScrollReveal();
        initImageLazyLoad();
    }

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
            if (window.Polyglide) window.Polyglide.start();
            const floating = document.getElementById("floating-assets-container");
            if (floating) floating.innerHTML = "";
        }
    };

    function bootLowpoly() {
        // Always boot on this document. SPA hosts can call destroy/init again later.
        window.SpaPages.lowpoly.init();
    }

    if (document.readyState === "loading") {
        window.addEventListener("DOMContentLoaded", bootLowpoly);
    } else {
        bootLowpoly();
    }
})();
