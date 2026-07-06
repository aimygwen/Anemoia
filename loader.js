(function (global) {
    "use strict";

    var script = document.currentScript;
    var base = script && script.src ? script.src.replace(/[^/]+$/, "") : "";

    var MIN_MS_INITIAL = 1100;
    var MIN_MS_SPA = 900;
    var FADE_MS = 900;

    var ROUTE_LOADER_THEMES = {
        main: { bg: "#ede8f7", accent: "#ec9ec8", bottom: "#f5e4f0" },
        gallery: { bg: "#f4f4f1", accent: "#c8f020", bottom: "#eef0e8" },
        lowpoly: { bg: "#e4daf8", accent: "#ffe566", bottom: "#efe8ff" },
        films: { bg: "#0b0b0f", accent: "#ff2d55", bottom: "#140810" },
        insights: { bg: "#d6e4f2", accent: "#a98bf5", bottom: "#dce8f8" }
    };

    var loaderEl = null;
    var orbitActive = false;
    var stopOrbit = null;
    var showStartedAt = 0;
    var visible = false;

    function applyLoaderTheme(routeKey) {
        if (!loaderEl) return;
        var theme = ROUTE_LOADER_THEMES[routeKey] || ROUTE_LOADER_THEMES.main;
        if ((!routeKey || routeKey === "main") && global.matchMedia("(prefers-color-scheme: dark)").matches) {
            theme = { bg: "#181024", accent: "#f0a8d0", bottom: "#241832" };
        }
        loaderEl.style.setProperty("--loader-bg", theme.bg);
        loaderEl.style.setProperty("--loader-accent", theme.accent);
        loaderEl.style.setProperty("--loader-bg-bottom", theme.bottom);
        loaderEl.dataset.route = routeKey || "";
    }

    function buildLoader() {
        var loader = document.createElement("div");
        loader.id = "page-loader";
        loader.className = "page-loader";
        loader.setAttribute("role", "presentation");
        loader.setAttribute("aria-hidden", "true");
        loader.innerHTML =
            '<div class="page-loader__backdrop" aria-hidden="true"></div>' +
            '<div class="page-loader__inner">' +
                '<img class="page-loader__logo" src="' + base + 'assets/branding.svg" alt="" width="104" height="70" decoding="async" />' +
                '<div class="page-loader__orbit" aria-hidden="true">' +
                    '<canvas class="page-loader__orbit-canvas"></canvas>' +
                '</div>' +
            '</div>';
        return loader;
    }

    function initOrbitLoader() {
        if (!loaderEl) return;

        var orbitEl = loaderEl.querySelector(".page-loader__orbit");
        var canvas = loaderEl.querySelector(".page-loader__orbit-canvas");
        if (!orbitEl || !canvas) return;

        if (stopOrbit) {
            stopOrbit();
            stopOrbit = null;
        }

        orbitEl.classList.remove("page-loader__orbit--static");

        var reducedMotion = global.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reducedMotion) {
            orbitEl.classList.add("page-loader__orbit--static");
            if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
            return;
        }

        if (!canvas.parentNode) {
            var newCanvas = document.createElement("canvas");
            newCanvas.className = "page-loader__orbit-canvas";
            orbitEl.appendChild(newCanvas);
            canvas = newCanvas;
        }

        var ctx = canvas.getContext("2d");
        if (!ctx) return;

        orbitActive = true;

        var DOT_COUNT = 6;
        var LOGICAL = 64;
        var dpr = Math.min(global.devicePixelRatio || 1, 2);
        var center = LOGICAL / 2;
        var orbitRadius = 21;
        var dotCore = 2.4;
        var rotation = 0;
        var rafId = null;
        var startTime = performance.now();
        var CYCLE = 5400;

        function resize() {
            canvas.width = Math.round(LOGICAL * dpr);
            canvas.height = Math.round(LOGICAL * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        resize();

        function easeInQuart(t) { return t * t * t * t; }
        function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }
        function easeInOutSine(t) { return -(Math.cos(Math.PI * t) - 1) / 2; }

        function getCycleState(elapsed) {
            var t = (elapsed % CYCLE) / CYCLE;
            var spread, speed, merge, wobbleAmt;

            if (t < 0.26) {
                var local = t / 0.26;
                spread = 0.78 + 0.22 * easeInOutSine(local);
                speed = 0.0038 + local * 0.0018;
                merge = 0;
                wobbleAmt = 0.14;
            } else if (t < 0.4) {
                var local = (t - 0.26) / 0.14;
                spread = 1 - local * 0.12;
                speed = 0.0056 + easeInQuart(local) * 0.024;
                merge = 0;
                wobbleAmt = 0.1 + local * 0.06;
            } else if (t < 0.52) {
                var local = (t - 0.4) / 0.12;
                spread = (1 - easeInQuart(local)) * 0.88;
                speed = 0.029 + local * 0.014;
                merge = easeInOutSine(local);
                wobbleAmt = 0.05 * (1 - local);
            } else if (t < 0.58) {
                spread = 0.02;
                speed = 0.042 + 0.006 * Math.sin(elapsed * 0.008);
                merge = 1;
                wobbleAmt = 0;
            } else if (t < 0.74) {
                var local = (t - 0.58) / 0.16;
                spread = easeOutQuart(local) * 0.92;
                speed = 0.048 - easeOutQuart(local) * 0.034;
                merge = 1 - easeInOutSine(local);
                wobbleAmt = 0.08 + local * 0.1;
            } else {
                var local = (t - 0.74) / 0.26;
                spread = 0.92 + 0.08 * Math.sin(local * Math.PI * 1.6);
                speed = 0.014 - easeInOutSine(local) * 0.009;
                merge = 0;
                wobbleAmt = 0.12 + 0.06 * Math.sin(local * Math.PI * 2);
            }

            speed *= 1 + 0.07 * Math.sin(elapsed * 0.0028 + 0.6);
            return { spread: spread, speed: speed, merge: merge, wobbleAmt: wobbleAmt };
        }

        function drawGlowDot(x, y, radius, alpha, blur) {
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = alpha;
            ctx.shadowColor = "rgba(255, 255, 255, 0.95)";
            ctx.shadowBlur = blur;
            var grad = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.6);
            grad.addColorStop(0, "rgba(255, 255, 255, 1)");
            grad.addColorStop(0.35, "rgba(255, 255, 255, 0.92)");
            grad.addColorStop(0.7, "rgba(255, 255, 255, 0.35)");
            grad.addColorStop(1, "rgba(255, 255, 255, 0)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, radius * 2.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        function frame(now) {
            if (!orbitActive) return;

            var elapsed = now - startTime;
            var state = getCycleState(elapsed);

            rotation += state.speed;
            ctx.clearRect(0, 0, LOGICAL, LOGICAL);

            if (state.merge > 0.92 && state.spread < 0.06) {
                var pulse = 1 + 0.12 * Math.sin(elapsed * 0.012);
                drawGlowDot(center, center, dotCore * 2.2 * pulse, 0.95, 14);
                drawGlowDot(center, center, dotCore * 1.1 * pulse, 0.55, 22);
            } else {
                var clusterPull = (1 - state.spread) * 0.55;

                for (var i = 0; i < DOT_COUNT; i++) {
                    var baseAngle = rotation + (i / DOT_COUNT) * Math.PI * 2;
                    var wobble =
                        1 +
                        state.wobbleAmt * Math.sin(elapsed * 0.0031 + i * 1.9) +
                        0.04 * Math.sin(elapsed * 0.0055 + i * 3.2);
                    var r = orbitRadius * state.spread * wobble;
                    var angle = baseAngle + clusterPull * Math.sin(baseAngle * 2.3 + elapsed * 0.0015);
                    var x = center + Math.cos(angle) * r;
                    var y = center + Math.sin(angle) * r;
                    var mergeTight = state.merge * (1 - state.spread);
                    x = x * (1 - mergeTight) + center * mergeTight;
                    y = y * (1 - mergeTight) + center * mergeTight;
                    var alpha = 0.55 + 0.45 * state.spread + state.merge * 0.25;
                    var size = dotCore + (1 - state.spread) * 0.35 + state.merge * 0.5;
                    var blur = 6 + (1 - state.spread) * 4 + state.merge * 3;
                    drawGlowDot(x, y, size, alpha, blur);
                }
            }

            rafId = global.requestAnimationFrame(frame);
        }

        rafId = global.requestAnimationFrame(frame);

        stopOrbit = function () {
            orbitActive = false;
            if (rafId) global.cancelAnimationFrame(rafId);
        };
    }

    function ensureLoader(routeKey) {
        if (!loaderEl) {
            loaderEl = buildLoader();
            applyLoaderTheme(routeKey);
            if (document.body) {
                document.body.insertBefore(loaderEl, document.body.firstChild);
            }
        } else if (routeKey) {
            applyLoaderTheme(routeKey);
        }
        return loaderEl;
    }

    function showLoader(options) {
        options = options || {};
        hidePromise = null;
        showStartedAt = Date.now();
        visible = true;

        document.documentElement.classList.add("page-loading");

        var el = ensureLoader(options.route);
        el.classList.remove("is-done");
        el.setAttribute("aria-hidden", "false");

        initOrbitLoader();

        return el;
    }

    var hidePromise = null;

    function hideLoader(minMs) {
        minMs = minMs != null ? minMs : MIN_MS_SPA;

        if (hidePromise) return hidePromise;

        hidePromise = new Promise(function (resolve) {
            if (!visible) {
                hidePromise = null;
                resolve();
                return;
            }

            var delay = Math.max(0, minMs - (Date.now() - showStartedAt));

            global.setTimeout(function () {
                visible = false;
                if (stopOrbit) stopOrbit();

                document.documentElement.classList.remove("page-loading");

                if (loaderEl) {
                    loaderEl.classList.add("is-done");
                    loaderEl.setAttribute("aria-hidden", "true");
                }

                global.setTimeout(function () {
                    hidePromise = null;
                    resolve();
                }, FADE_MS + 40);
            }, delay);
        });

        return hidePromise;
    }

    function runTransition(workFn, options) {
        options = options || {};
        var minMs = options.minMs != null ? options.minMs : MIN_MS_SPA;

        showLoader(options);

        return Promise.resolve()
            .then(workFn)
            .then(function (result) {
                return hideLoader(minMs).then(function () { return result; });
            })
            .catch(function (err) {
                return hideLoader(0).then(function () { throw err; });
            });
    }

    function waitVideos() {
        var vids = [].slice.call(document.querySelectorAll("video")).filter(function (v) {
            if (v.id === "physics-video-source") return false;
            if (v.closest(".work-fallback")) return false;
            if (v.preload === "none" && !v.autoplay) return false;
            return v.currentSrc || v.getAttribute("src");
        });
        if (!vids.length) return Promise.resolve();

        return Promise.all(vids.map(function (v) {
            return new Promise(function (resolve) {
                if (v.readyState >= 4) {
                    resolve();
                    return;
                }
                var fired = false;
                function ok() {
                    if (fired) return;
                    fired = true;
                    v.removeEventListener("canplaythrough", ok);
                    v.removeEventListener("error", ok);
                    resolve();
                }
                v.addEventListener("canplaythrough", ok);
                v.addEventListener("error", ok);
                global.setTimeout(ok, 14000);
                try {
                    v.preload = "auto";
                    v.load();
                } catch (e) {
                    ok();
                }
            });
        }));
    }

    function resolveBootRouteKey() {
        var file = global.location.pathname.split("/").pop().toLowerCase();
        if (!file || file === "index.html") return "main";
        if (file === "gallery.html") return "gallery";
        if (file === "lowpoly.html") return "lowpoly";
        if (file === "videos.html") return "films";
        if (file === "insights.html") return "insights";
        return "main";
    }

    function bootInitialLoad() {
        document.documentElement.classList.add("page-loading");

        showLoader({ route: resolveBootRouteKey() });

        var jobs = [
            new Promise(function (resolve) {
                if (document.readyState === "complete") resolve();
                else global.addEventListener("load", resolve, { once: true });
            }),
            waitVideos()
        ];

        if (document.fonts && document.fonts.ready) {
            jobs.push(document.fonts.ready.catch(function () {}));
        }

        Promise.all(jobs)
            .then(function () { return hideLoader(MIN_MS_INITIAL); })
            .catch(function () { return hideLoader(MIN_MS_INITIAL); });

        global.setTimeout(function () { hideLoader(0); }, 15000);
    }

    global.PageLoader = {
        show: showLoader,
        hide: hideLoader,
        runTransition: runTransition,
        MIN_INITIAL: MIN_MS_INITIAL,
        MIN_SPA: MIN_MS_SPA
    };

    if (document.body) bootInitialLoad();
    else document.addEventListener("DOMContentLoaded", bootInitialLoad);
})(window);
