/**
 * Shared fixed-wrapper parallax scroll engine for gallery / videos pages.
 */
(function (global) {
    "use strict";

    var FOCUS_PLAY = 0.55;
    var FOCUS_PAUSE = 0.38;
    var STILL_CAPTURE = 0.15;

    function captureVideoStill(video, img) {
        if (!video || !img || img.dataset.captured === "1") return;
        try {
            if (video.videoWidth <= 0 || video.videoHeight <= 0) return;
            var canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext("2d").drawImage(video, 0, 0);
            img.src = canvas.toDataURL("image/jpeg", 0.82);
            img.dataset.captured = "1";
        } catch (err) {
            /* canvas taint or decode failure — still img stays empty */
        }
    }

    function ensureVideoStill(item, videoEl) {
        var still = item.querySelector(".gallery-item-still");
        var src = videoEl.getAttribute("data-src");
        if (!still || !src || still.dataset.captured === "1" || still.dataset.capturing === "1") return;

        still.dataset.capturing = "1";
        var probe = document.createElement("video");
        probe.muted = true;
        probe.playsInline = true;
        probe.preload = "metadata";
        probe.src = src;

        function cleanup() {
            probe.removeAttribute("src");
            probe.load();
            still.dataset.capturing = "0";
        }

        probe.addEventListener("loadeddata", function () {
            probe.currentTime = Math.min(0.12, (probe.duration || 0.5) * 0.05);
        });

        probe.addEventListener("seeked", function () {
            captureVideoStill(probe, still);
            cleanup();
        }, { once: true });

        probe.addEventListener("error", cleanup, { once: true });
    }

    function setVideoActive(item, active) {
        item.classList.toggle("is-video-active", active);
        var glowWrap = item.querySelector(".ambient-glow-container");
        if (glowWrap) glowWrap.classList.toggle("is-video-active", active);
    }

    function mountVideoSource(videoEl) {
        var src = videoEl.getAttribute("data-src");
        if (!src || videoEl.getAttribute("src") === src) return;
        videoEl.setAttribute("src", src);
        videoEl.load();
    }

    function unmountVideoSource(videoEl) {
        if (!videoEl.getAttribute("src")) return;
        videoEl.pause();
        videoEl.removeAttribute("src");
        videoEl.load();
    }

    function syncAmbientGlow(item, active) {
        var glow = item.querySelector(".ambient-glow-video");
        if (!glow) return;
        if (active) {
            mountVideoSource(glow);
            var playPromise = glow.play();
            if (playPromise && playPromise.catch) playPromise.catch(function () {});
        } else {
            unmountVideoSource(glow);
        }
    }

    function manageItemVideo(item, focusFactor) {
        var videoEl = item.querySelector(".gallery-item-media video[data-src]");
        if (!videoEl) return;

        var shouldPlay = focusFactor >= FOCUS_PLAY;
        var shouldPause = focusFactor <= FOCUS_PAUSE;
        var isActive = item.classList.contains("is-video-active");

        if (focusFactor >= STILL_CAPTURE) {
            ensureVideoStill(item, videoEl);
        }

        if (shouldPlay && !isActive) {
            mountVideoSource(videoEl);
            setVideoActive(item, true);
            syncAmbientGlow(item, true);
            var still = item.querySelector(".gallery-item-still");
            videoEl.addEventListener("loadeddata", function onReady() {
                videoEl.removeEventListener("loadeddata", onReady);
                if (still) captureVideoStill(videoEl, still);
            });
            var playPromise = videoEl.play();
            if (playPromise && playPromise.catch) playPromise.catch(function () {});
        } else if (shouldPause && isActive) {
            unmountVideoSource(videoEl);
            syncAmbientGlow(item, false);
            setVideoActive(item, false);
        }
    }

    function initVerticalGallery(options) {
        options = options || {};
        var galleryContainer = document.getElementById(options.galleryId || "vertical-gallery");
        var wrapper = document.querySelector(".smooth-scroll-wrapper");
        var scrollSpacer = document.querySelector(".scroll-spacer");
        var contentShell = document.getElementById(options.contentId);
        var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        var manageVideos = options.enableVideoOffload === true;

        if (!galleryContainer || !wrapper) return null;

        var scroll = window.scrollY;
        var globalTargetMouseX = 0;
        var globalTargetMouseY = 0;
        var globalMouseX = 0;
        var globalMouseY = 0;
        var rafId = 0;
        var running = false;

        function updateSpacerHeight() {
            if (!wrapper || !scrollSpacer) return;
            scrollSpacer.style.height = wrapper.offsetHeight + "px";
        }

        function onMouseMove(e) {
            globalTargetMouseX = e.clientX / window.innerWidth - 0.5;
            globalTargetMouseY = e.clientY / window.innerHeight - 0.5;
        }

        function onMouseLeave() {
            globalTargetMouseX = 0;
            globalTargetMouseY = 0;
        }

        function animateGallery() {
            if (!running) return;

            var targetScrollY = window.scrollY;
            scroll += (targetScrollY - scroll) * (reducedMotion ? 1 : 0.05);

            wrapper.classList.add("is-animating");

            if (reducedMotion) {
                wrapper.style.transform = "";
                rafId = requestAnimationFrame(animateGallery);
                return;
            }

            wrapper.style.transform = "translate3d(0, " + (-scroll) + "px, 0)";

            var vh = window.innerHeight;
            var items = galleryContainer.querySelectorAll(".gallery-item");

            globalMouseX += (globalTargetMouseX - globalMouseX) * 0.08;
            globalMouseY += (globalTargetMouseY - globalMouseY) * 0.08;

            items.forEach(function (item) {
                var media = item.querySelector(".gallery-item-media");
                if (!media) return;

                var rect = media.getBoundingClientRect();
                if (rect.bottom < -100 || rect.top > vh + 100) {
                    if (manageVideos && item.classList.contains("is-video-active")) {
                        var offVideo = item.querySelector(".gallery-item-media video[data-src]");
                        if (offVideo) {
                            unmountVideoSource(offVideo);
                            syncAmbientGlow(item, false);
                            setVideoActive(item, false);
                        }
                    }
                    return;
                }

                var itemCenter = rect.top + rect.height / 2;
                var progress = (itemCenter - vh / 2) / (vh / 2 + rect.height / 2);
                var focusFactor = Math.max(0, 1 - Math.abs(progress) * 1.5);
                var scaleVal = 0.95 + focusFactor * 0.1;
                var opacityVal = 0.35 + focusFactor * 0.65;
                var containerShiftX = globalMouseX * 10 * focusFactor;
                var containerShiftY = globalMouseY * 10 * focusFactor;
                var itemParallax = progress * -40 + containerShiftY;
                var rotateAngle = progress * -3;

                item.style.opacity = opacityVal;
                item.classList.toggle("is-unfocused", focusFactor < 0.45);

                media.style.transform =
                    "translate3d(" + containerShiftX + "px, " + itemParallax + "px, 0) " +
                    "rotate(" + rotateAngle + "deg) scale(" + scaleVal + ")";

                var glowContainer = item.querySelector(".ambient-glow-container");
                if (glowContainer) {
                    glowContainer.style.transform = media.style.transform;
                }

                var inner = media.querySelector("img:not(.gallery-item-still), video");
                if (inner) {
                    var shiftX = globalMouseX * -8 * focusFactor;
                    var shiftY = globalMouseY * -8 * focusFactor;
                    var parallaxPct = progress * -5;
                    inner.style.transform =
                        "scale(1.15) translate3d(" + shiftX + "px, calc(" + parallaxPct + "% + " + shiftY + "px), 0)";
                }

                var still = media.querySelector(".gallery-item-still");
                if (still) {
                    var sShiftX = globalMouseX * -8 * focusFactor;
                    var sShiftY = globalMouseY * -8 * focusFactor;
                    var sParallax = progress * -5;
                    still.style.transform =
                        "scale(1.15) translate3d(" + sShiftX + "px, calc(" + sParallax + "% + " + sShiftY + "px), 0)";
                }

                var ambientVideo = item.querySelector(".ambient-glow-video");
                if (ambientVideo) {
                    var aShiftX = globalMouseX * -8 * focusFactor;
                    var aShiftY = globalMouseY * -8 * focusFactor;
                    var aParallax = progress * -5;
                    ambientVideo.style.transform =
                        "scale(1.20) translate3d(" + aShiftX + "px, calc(" + aParallax + "% + " + aShiftY + "px), 0)";
                }

                if (manageVideos) {
                    manageItemVideo(item, focusFactor);
                }
            });

            rafId = requestAnimationFrame(animateGallery);
        }

        function startLoop() {
            if (running) return;
            running = true;
            animateGallery();
        }

        function stopLoop() {
            running = false;
            if (rafId) cancelAnimationFrame(rafId);
            wrapper.classList.remove("is-animating");
        }

        function bindMediaLoadUpdates() {
            galleryContainer.addEventListener("load", function (e) {
                if (e.target && (e.target.tagName === "IMG" || e.target.tagName === "VIDEO")) {
                    updateSpacerHeight();
                }
            }, true);
        }

        function renderGallery(filter) {
            filter = filter || "all";
            galleryContainer.style.opacity = "0.3";
            galleryContainer.style.transition = "opacity 0.2s ease";

            setTimeout(function () {
                galleryContainer.innerHTML = "";
                var filtered = options.items.filter(function (item) {
                    return filter === "all" || item.category === filter;
                });

                filtered.forEach(function (item) {
                    galleryContainer.appendChild(options.renderItem(item));
                });

                galleryContainer.style.opacity = "1";
                updateSpacerHeight();
            }, 200);
        }

        function initResizeObserver() {
            if (typeof ResizeObserver !== "undefined" && scrollSpacer) {
                new ResizeObserver(updateSpacerHeight).observe(wrapper);
            } else {
                updateSpacerHeight();
                window.addEventListener("resize", updateSpacerHeight);
            }
        }

        function init() {
            renderGallery("all");
            bindMediaLoadUpdates();
            startLoop();
            initResizeObserver();

            if (!reducedMotion) {
                window.addEventListener("mousemove", onMouseMove, { passive: true });
                document.addEventListener("mouseleave", onMouseLeave);
            }

            window.addEventListener("scroll", updateSpacerHeight, { passive: true });

            if (contentShell) {
                setTimeout(function () {
                    contentShell.classList.add("active", "is-active");
                }, 150);
            }

            document.addEventListener("visibilitychange", function () {
                if (document.hidden) {
                    stopLoop();
                    if (manageVideos) {
                        galleryContainer.querySelectorAll(".gallery-item.is-video-active").forEach(function (item) {
                            var videoEl = item.querySelector(".gallery-item-media video[data-src]");
                            if (videoEl) unmountVideoSource(videoEl);
                            syncAmbientGlow(item, false);
                            setVideoActive(item, false);
                        });
                    }
                } else {
                    startLoop();
                }
            });
        }

        init();

        function destroy() {
            stopLoop();
            window.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseleave", onMouseLeave);
            window.removeEventListener("scroll", updateSpacerHeight);
            if (wrapper) {
                wrapper.style.transform = "";
                wrapper.classList.remove("is-animating");
            }
            if (galleryContainer) galleryContainer.innerHTML = "";
            global.filterPage = null;
        }

        global.filterPage = renderGallery;
        return { renderGallery: renderGallery, updateSpacerHeight: updateSpacerHeight, destroy: destroy };
    }

    global.initVerticalGallery = initVerticalGallery;
})(window);
