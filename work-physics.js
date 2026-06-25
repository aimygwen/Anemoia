(function () {
    const canvas = document.getElementById("work-physics-canvas");
    if (!canvas) return;

    let time = 0;

    // Palette colors matching Aimy's portfolio
    const colors = {
        pink: "#ff9ebb",
        blue: "#8ae3d6",
        yellow: "#ffe0a3",
        lilac: "#cfa2ff",
        cream: "#fafaf9",
        ink: "#2d123d",
        white: "#ffffff"
    };

    // 1. DATA CONFIGURATIONS
    const caseStudies = [
        {
            id: 0,
            title: "Lowpoly",
            category: "Hytale Art",
            url: "hytale.html",
            imgKey: "lowpoly",
            posX: -420,
            posY: 0
        },
        {
            id: 1,
            title: "Sketchbook",
            category: "Illustration / 2D Art",
            url: "gallery.html",
            imgKey: "artwork",
            posX: -140,
            posY: 0
        },
        {
            id: 2,
            title: "Tapes",
            category: "Animation / Motion",
            url: "videos.html",
            imgKey: "tapes",
            isVideo: true,
            posX: 140,
            posY: 0
        },
        {
            id: 3,
            title: "insights",
            category: "BtS / WIP Process",
            url: "bts.html",
            imgKey: "insights",
            posX: 420,
            posY: 0
        }
    ];

    // Select preloaded DOM images (or use base64 data URLs to prevent local CORS issues)
    const images = {};
    caseStudies.forEach(study => {
        const key = study.imgKey;
        const img = new Image();
        if (window.base64Thumbnails && window.base64Thumbnails[key]) {
            img.src = window.base64Thumbnails[key];
        } else {
            // Fallback to DOM preloader if base64 not available
            const domEl = document.getElementById(`preload-img-${key}`);
            if (domEl) {
                img.src = domEl.src;
            } else {
                img.src = `./assets/thumbnails/${key}.jpg`;
            }
        }
        images[key] = img;
    });

    const videoSource = document.getElementById("physics-video-source");

    // Rainbow Color Shift Palette (Pink -> Yellow -> Teal -> Lilac -> Pink)
    const rainbowColors = [
        { r: 255, g: 126, b: 182 }, // Pink
        { r: 255, g: 234, b: 176 }, // Yellow
        { r: 45,  g: 212, b: 191 }, // Teal
        { r: 207, g: 162, b: 255 }, // Lilac
        { r: 255, g: 126, b: 182 }  // Pink
    ];

    function getRainbowColor(t) {
        const progress = t % 1;
        const numSegments = rainbowColors.length - 1;
        const segmentProgress = progress * numSegments;
        const index = Math.floor(segmentProgress) % rainbowColors.length;
        const nextIndex = (index + 1) % rainbowColors.length;
        const factor = segmentProgress - Math.floor(segmentProgress);

        const c1 = rainbowColors[index];
        const c2 = rainbowColors[nextIndex];

        if (!c1 || !c2) {
            return "rgb(255, 126, 182)";
        }

        const r = Math.round(c1.r + (c2.r - c1.r) * factor);
        const g = Math.round(c1.g + (c2.g - c1.g) * factor);
        const b = Math.round(c1.b + (c2.b - c1.b) * factor);

        return `rgb(${r}, ${g}, ${b})`;
    }

    // Helper: Draw Alkhemikal CTA button on 512x512 canvas
    function drawLinkButton(ctx, text, x, y, w, h, isHovered) {
        ctx.fillStyle = isHovered ? colors.cream : "rgba(45, 18, 61, 0.85)";
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = isHovered ? colors.ink : colors.cream;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);
        
        ctx.fillStyle = isHovered ? colors.ink : colors.cream;
        ctx.font = "bold 22px 'Plus Jakarta Sans', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(text.toUpperCase(), x + w/2, y + h/2 + 8);
    }

    // Helper: Render card text, overlays, and outline to its local canvas
    function drawCardTexture(study, hoverLerp, tVal = 0) {
        const ctx = study.ctx;
        const w = 512;
        const h = 512;

        ctx.fillStyle = colors.ink;
        ctx.fillRect(0, 0, w, h);

        // Draw cover image frame (supports playing video on file:// if browser security permits, with safe base64 fallback)
        const img = images[study.imgKey];
        let drewVideo = false;
        if (study.isVideo && videoSource) {
            ctx.drawImage(videoSource, 2, 2, w - 4, h - 4);
            try {
                // Test if drawing the video taints the canvas (triggers security error on file:// in some browsers)
                ctx.getImageData(0, 0, 1, 1);
                drewVideo = true;
            } catch (e) {
                // Canvas is tainted. Disable video mode for this session and fall back to static image
                study.isVideo = false;
                drewVideo = false;
            }
        }

        if (!drewVideo && img) {
            const isBase64 = img.src && img.src.startsWith("data:");
            if (window.location.protocol !== "file:" || isBase64) {
                ctx.drawImage(img, 2, 2, w - 4, h - 4);
            }
        }

        // Overlay backing for readability
        ctx.fillStyle = hoverLerp > 0.5 ? "rgba(45, 18, 61, 0.35)" : "rgba(45, 18, 61, 0.65)";
        ctx.fillRect(2, 2, w - 4, h - 4);

        // Category label
        ctx.fillStyle = colors.cream;
        ctx.textAlign = "center";
        ctx.font = "bold 22px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText(study.category.toUpperCase(), w / 2, h - 190);

        // Case study Title
        ctx.font = "bold 32px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText(study.title.toUpperCase(), w / 2, h - 135);

        // Dynamic CTA button
        const btnText = study.url === "videos.html" ? "WATCH REEL" : "VIEW WORK";
        drawLinkButton(ctx, btnText, w / 2 - 120, h - 85, 240, 48, hoverLerp > 0.5);

        // Hover outline border overlay
        if (hoverLerp > 0.01) {
            ctx.save();
            ctx.globalAlpha = hoverLerp;
            ctx.strokeStyle = getRainbowColor(tVal);
            ctx.lineWidth = 28;
            ctx.strokeRect(14, 14, w - 28, h - 28);
            ctx.restore();
        }
    }

    // 2. THREE.JS SCENE INITIALIZATION
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 430);

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: true });
    renderer.setPixelRatio(1);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.78);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.42);
    dirLight.position.set(50, 100, 150);
    scene.add(dirLight);

    // 3. CONSTRUCT INDEPENDENT MESHES & TEXTURES
    const cardW = 240;
    const cardH = 240;
    const segX = 2;
    const segY = 2;

    caseStudies.forEach(study => {
        // Setup individual canvas
        const cardCanvas = document.createElement("canvas");
        cardCanvas.width = 512;
        cardCanvas.height = 512;
        const cardCtx = cardCanvas.getContext("2d");

        // Setup canvas texture
        const cardTexture = new THREE.CanvasTexture(cardCanvas);
        cardTexture.minFilter = THREE.NearestFilter;
        cardTexture.magFilter = THREE.NearestFilter;

        // Create individual mesh
        const geometry = new THREE.PlaneGeometry(cardW, cardH, segX, segY);
        const material = new THREE.MeshBasicMaterial({
            map: cardTexture,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(study.posX, study.posY, 0);
        scene.add(mesh);

        // Store physics vertices states
        const posAttr = geometry.attributes.position;
        const vCount = posAttr.count;
        const vertices = [];

        for (let i = 0; i < vCount; i++) {
            vertices.push({
                initX: posAttr.getX(i),
                initY: posAttr.getY(i),
                initZ: posAttr.getZ(i),
                z: 0,
                vz: 0
            });
        }

        // Cache parameters inside case study object
        study.mesh = mesh;
        study.geometry = geometry;
        study.material = material;
        study.canvas = cardCanvas;
        study.ctx = cardCtx;
        study.texture = cardTexture;
        study.vertices = vertices;
        study.posAttr = posAttr;
        study.vCount = vCount;
        study.hoverLerp = 0;
        study.lastHovered = false;

        // Draw initial static texture
        drawCardTexture(study, 0, 0);
        cardTexture.needsUpdate = true;
    });

    // Listen for DOM images onload if they haven't finished loading yet
    Object.entries(images).forEach(([key, img]) => {
        if (img) {
            const handleLoad = () => {
                console.log(`[work-physics] DOM image loaded: ${key}`);
                caseStudies.forEach(study => {
                    drawCardTexture(study, study.hoverLerp, time * 0.37);
                    if (study.texture) {
                        study.texture.needsUpdate = true;
                    }
                });
            };

            if (img.complete) {
                // Image is already loaded and ready
                setTimeout(handleLoad, 50); // slight delay to let Three.js setup
            } else {
                img.onload = handleLoad;
                img.onerror = (err) => {
                    console.error(`[work-physics] Failed to load DOM image: ${key}`, err);
                };
            }
        }
    });

    // 4. RAYCASTING & INTERACTION LOGIC
    let targetMouse = new THREE.Vector2(-9999, -9999);
    const raycaster = new THREE.Raycaster();
    let hoveredStudy = null;
    let canvasRect = null;

    function updateCanvasRect() {
        canvasRect = canvas.getBoundingClientRect();
    }
    updateCanvasRect();
    window.addEventListener("resize", updateCanvasRect);
    window.addEventListener("scroll", updateCanvasRect, { passive: true });
    canvas.addEventListener("mouseenter", updateCanvasRect);

    // 5. ANIMATION & PHYSICS SOLVER LOOP
    const tension = 0.07;
    const damping = 0.86;

    function animate() {
        requestAnimationFrame(animate);
        time += 0.015;

        let intersectionPoint = null;
        let activeHover = null;

        if (targetMouse.x !== -9999) {
            raycaster.setFromCamera(targetMouse, camera);
            const meshesToIntersect = caseStudies.map(s => s.mesh);
            const intersects = raycaster.intersectObjects(meshesToIntersect);

            if (intersects.length > 0) {
                activeHover = caseStudies.find(s => s.mesh === intersects[0].object);
                intersectionPoint = intersects[0].point;
                canvas.style.cursor = "pointer";
            } else {
                canvas.style.cursor = "default";
            }
        } else {
            canvas.style.cursor = "default";
        }

        hoveredStudy = activeHover;

        // Process physics and rendering for each card individually
        caseStudies.forEach(study => {
            const isCardHovered = (hoveredStudy === study);
            
            // Smoothly interpolate hover state for pop-forward and scale animations
            study.hoverLerp += ((isCardHovered ? 1.0 : 0.0) - study.hoverLerp) * 0.12;

            // Lift hovered card forward in 3D and scale it up slightly
            study.mesh.position.z = study.hoverLerp * 35.0;
            const s = 1.0 + study.hoverLerp * 0.045;
            study.mesh.scale.set(s, s, s);

            // Redraw card textures (video redraws every frame, static redraws during transitions/hovers to animate rainbow border)
            const isHoverStateChanged = (isCardHovered !== study.lastHovered);
            const isTransitioning = (study.hoverLerp > 0.01 && study.hoverLerp < 0.99);
            const isHoveredAndNeedsRainbow = (study.hoverLerp > 0.01);
            
            if (study.isVideo || isHoverStateChanged || isTransitioning || isHoveredAndNeedsRainbow) {
                drawCardTexture(study, study.hoverLerp, time * 0.37);
                study.texture.needsUpdate = true;
            }
            study.lastHovered = isCardHovered;

            // Apply localized vertex spring physics
            const vCount = study.vCount;
            const vertices = study.vertices;
            const posAttr = study.posAttr;

            for (let i = 0; i < vCount; i++) {
                const v = vertices[i];

                // Continuous gentle background wave (asymmetric based on card position)
                let targetZ = Math.sin((study.posX + v.initX) * 0.015 + time * 1.5) * 
                              Math.cos((study.posY + v.initY) * 0.015 + time * 1.5) * 5.5;

                // Mouse proximity pull on the hovered card's vertices
                if (isCardHovered && intersectionPoint) {
                    // Convert global intersection coordinates to local card mesh bounds
                    const localX = intersectionPoint.x - study.posX;
                    const localY = intersectionPoint.y - study.posY;

                    const dx = v.initX - localX;
                    const dy = v.initY - localY;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 100) {
                        const factor = 1.0 - dist / 100;
                        targetZ += factor * factor * 42.0; // Bends card forward locally
                    }
                }

                // Spring equations
                const force = (targetZ - v.z) * tension;
                v.vz = (v.vz + force) * damping;
                v.z += v.vz;

                posAttr.setZ(i, v.initZ + v.z);
            }

            posAttr.needsUpdate = true;
            study.geometry.computeVertexNormals();
        });

        renderer.render(scene, camera);
    }

    // 6. INTERACTIVE BINDINGS & CLICK WOBBLE
    function onMouseMove(e) {
        if (!canvasRect) updateCanvasRect();
        targetMouse.x = ((e.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
        targetMouse.y = -((e.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
    }

    function onMouseLeave() {
        targetMouse.set(-9999, -9999);
        hoveredStudy = null;
    }

    function onClick(e) {
        if (!hoveredStudy) return;

        // Perform raycast impact to trigger dynamic wobbling ripple on click
        raycaster.setFromCamera(targetMouse, camera);
        const intersects = raycaster.intersectObject(hoveredStudy.mesh);
        if (intersects.length > 0) {
            const intersectPoint = intersects[0].point;
            const localX = intersectPoint.x - hoveredStudy.posX;
            const localY = intersectPoint.y - hoveredStudy.posY;

            const vCount = hoveredStudy.vCount;
            const vertices = hoveredStudy.vertices;
            for (let i = 0; i < vCount; i++) {
                const v = vertices[i];
                const dx = v.initX - localX;
                const dy = v.initY - localY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 70) {
                    v.vz -= (1.0 - dist / 70) * 125.0; // Dynamic ripple impact
                }
            }
        }

        // Delay redirection briefly to show tactile jiggle animation
        const targetUrl = hoveredStudy.url;
        if (targetUrl) {
            canvas.style.pointerEvents = "none";
            setTimeout(() => {
                window.location.href = targetUrl;
            }, 300);
        }
    }

    function onTouchMove(e) {
        if (e.touches.length === 0) return;
        if (!canvasRect) updateCanvasRect();
        targetMouse.x = ((e.touches[0].clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
        targetMouse.y = -((e.touches[0].clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
    }

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("touchmove", onTouchMove);
    canvas.addEventListener("touchend", onMouseLeave);

    // Responsive aspect ratio viewport fitting
    function onResize() {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;

        // Synchronize dynamic loops and mobile loops playback
        const fallbackVideo = document.querySelector(".work-fallback video");
        if (window.innerWidth > 880) {
            if (videoSource && videoSource.paused) {
                videoSource.play().catch(() => {});
            }
            if (fallbackVideo && !fallbackVideo.paused) {
                fallbackVideo.pause();
            }
        } else {
            if (videoSource && !videoSource.paused) {
                videoSource.pause();
            }
            if (fallbackVideo && fallbackVideo.paused) {
                fallbackVideo.play().catch(() => {});
            }
        }

        const resMultiplier = 0.65;
        renderer.setSize(w * resMultiplier, h * resMultiplier, false);

        camera.aspect = w / h;

        // Calculate fitting depth mapping for the 1160x320 horizontal layout bounds
        const fovRad = (camera.fov * Math.PI) / 360;
        const fitHeightZ = (320 / 2) / Math.tan(fovRad) + 20;
        const fitWidthZ = (1160 / 2) / Math.tan(fovRad) / camera.aspect + 20;

        camera.position.z = Math.max(fitHeightZ, fitWidthZ);
        camera.updateProjectionMatrix();
    }

    window.addEventListener("resize", onResize);
    onResize();

    animate();
})();
