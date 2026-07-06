/**
 * Client-side router — fetches page fragments and swaps #spa-view without full reloads.
 */
(function (global) {
    "use strict";

    var ROUTES = {
        main: {
            file: "index.html",
            title: "Welcome to this Mess",
            bodyClass: "home-page-body",
            styles: ["home.css"],
            scripts: ["work-physics.js", "home.js"]
        },
        gallery: {
            file: "gallery.html",
            title: "Look at What I Made",
            bodyClass: "gallery-page-body",
            styles: ["gallery.css"],
            scripts: ["vertical-gallery.js", "gallery.js"]
        },
        lowpoly: {
            file: "lowpoly.html",
            title: "Living on the X, Y, Z",
            bodyClass: "lowpoly-page-body",
            styles: ["lowpoly.css"],
            scripts: ["lowpoly-catalog-data.js", "lowpoly-catalog.js", "lowpoly.js"]
        },
        films: {
            file: "videos.html",
            title: "Stories told in motion",
            bodyClass: "videos-page-body",
            styles: ["gallery.css"],
            scripts: ["vertical-gallery.js", "gallery.js"]
        },
        insights: {
            file: "insights.html",
            title: "Behind the Madness",
            bodyClass: "insights-page-body",
            styles: ["insights.css"],
            scripts: ["insights.js"]
        }
    };

    var PATH_TO_ROUTE = {
        "": "main",
        "index.html": "main",
        "gallery.html": "gallery",
        "lowpoly.html": "lowpoly",
        "videos.html": "films",
        "insights.html": "insights"
    };

    var currentRoute = null;
    var navigating = false;
    var htmlCache = Object.create(null);
    var loadedScripts = Object.create(null);
    var loadedStyles = Object.create(null);
    var routeViewCache = Object.create(null);

    function getPathname() {
        var parts = global.location.pathname.split("/");
        return (parts[parts.length - 1] || "").toLowerCase();
    }

    function resolveRouteKey(pathname) {
        return PATH_TO_ROUTE[pathname != null ? pathname : getPathname()] || null;
    }

    function isSpaLink(anchor) {
        if (!anchor || !anchor.href) return false;
        if (anchor.target === "_blank" || anchor.hasAttribute("download")) return false;
        if (anchor.origin !== global.location.origin) return false;
        if (anchor.pathname.endsWith("legal.html")) return false;
        var key = resolveRouteKey(anchor.pathname.split("/").pop().toLowerCase());
        if (key) return true;
        if (anchor.pathname.replace(/\/$/, "").endsWith("index.html") || anchor.pathname === "/" || anchor.pathname.endsWith("/")) {
            return anchor.hash && /^#(work|about|collaborations|contact)/.test(anchor.hash);
        }
        return false;
    }

    function normalizeHomeBodyClass() {
        if (sessionStorage.getItem("intro_seen")) {
            document.body.classList.remove("intro-active");
            document.documentElement.classList.add("intro-bypassed");
        }
    }

    function setBodyClass(routeKey) {
        var route = ROUTES[routeKey];
        if (!route) return;
        document.body.className = route.bodyClass;
        if (routeKey === "main") {
            if (!sessionStorage.getItem("intro_seen")) {
                document.body.classList.add("intro-active");
            }
            normalizeHomeBodyClass();
        }
        document.body.classList.remove("menu-open", "modal-open", "nav-hidden", "is-scrolling", "is-sliding-out");
    }

    function ensureStylesheets(routeKey) {
        var route = ROUTES[routeKey];
        if (!route) return Promise.resolve();
        var jobs = route.styles.map(function (href) {
            if (loadedStyles[href]) return Promise.resolve();
            return new Promise(function (resolve, reject) {
                var link = document.createElement("link");
                link.rel = "stylesheet";
                link.href = href;
                link.dataset.spaStyle = href;
                link.onload = function () {
                    loadedStyles[href] = true;
                    resolve();
                };
                link.onerror = reject;
                document.head.appendChild(link);
            });
        });
        return Promise.all(jobs);
    }

    function ensureScripts(routeKey) {
        var route = ROUTES[routeKey];
        if (!route) return Promise.resolve();
        var chain = Promise.resolve();
        route.scripts.forEach(function (src) {
            chain = chain.then(function () {
                var key = src.split("/").pop();
                if (loadedScripts[key]) return;
                return new Promise(function (resolve, reject) {
                    var script = document.createElement("script");
                    script.src = src;
                    script.defer = true;
                    script.dataset.spaScript = src;
                    script.onload = function () {
                        loadedScripts[src.split("/").pop()] = true;
                        resolve();
                    };
                    script.onerror = reject;
                    document.body.appendChild(script);
                });
            });
        });
        return chain;
    }

    function fetchPageHtml(file) {
        if (htmlCache[file]) return Promise.resolve(htmlCache[file]);
        return fetch(file, { credentials: "same-origin" })
            .then(function (res) {
                if (!res.ok) throw new Error("Failed to load " + file);
                return res.text();
            })
            .then(function (html) {
                htmlCache[file] = html;
                return html;
            });
    }

    function extractSpaView(html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var view = doc.getElementById("spa-view");
        return view ? view.innerHTML : "";
    }

    function getSpaViewEl() {
        return document.getElementById("spa-view");
    }

    function pauseHomeMedia() {
        var player = document.querySelector(".player-audio");
        if (player) player.pause();
        document.querySelectorAll(".stage video").forEach(function (v) {
            try { v.pause(); } catch (e) { /* noop */ }
        });
    }

    function destroyRoute(routeKey) {
        if (routeKey === "main") {
            var view = getSpaViewEl();
            if (view) routeViewCache.main = view.innerHTML;
            pauseHomeMedia();
            window.__workPhysicsDestroyed = true;
        }

        var pages = global.SpaPages || {};
        if (routeKey && pages[routeKey] && typeof pages[routeKey].destroy === "function") {
            pages[routeKey].destroy();
        }
        document.querySelectorAll("video").forEach(function (v) {
            try {
                v.pause();
            } catch (e) { /* noop */ }
        });
    }

    function mountRoute(routeKey, options) {
        options = options || {};
        var route = ROUTES[routeKey];
        var view = getSpaViewEl();
        if (!route || !view) return Promise.reject(new Error("Unknown route"));

        if (currentRoute === routeKey && !options.force) {
            if (options.hash) scrollToHash(options.hash);
            return Promise.resolve(routeKey);
        }

        navigating = true;

        function performMount() {
            destroyRoute(currentRoute);

            return ensureStylesheets(routeKey)
                .then(function () { return ensureScripts(routeKey); })
                .then(function () {
                    if (routeKey === "main" && routeViewCache.main) {
                        return routeViewCache.main;
                    }
                    if (options.html != null) {
                        return options.html;
                    }
                    if (options.useCurrentView && currentRoute === routeKey) {
                        return view.innerHTML;
                    }
                    return fetchPageHtml(route.file).then(extractSpaView);
                })
                .then(function (innerHtml) {
                    view.innerHTML = innerHtml;
                    setBodyClass(routeKey);
                    document.title = route.title;
                    currentRoute = routeKey;

                    delete document.body.dataset.headerScrollInit;

                    if (global.UI && typeof global.UI.refresh === "function") {
                        global.UI.refresh(routeKey);
                    } else if (global.Site && typeof global.Site.initContactModal === "function") {
                        global.Site.initContactModal();
                    }

                    var pages = global.SpaPages || {};
                    if (routeKey === "main" && routeViewCache.main) {
                        window.__workPhysicsDestroyed = false;
                        if (typeof global.__workPhysicsRestart === "function") {
                            global.__workPhysicsRestart();
                        }
                    } else if (pages[routeKey] && typeof pages[routeKey].init === "function") {
                        pages[routeKey].init({ spa: true });
                    }

                    if (global.Site) {
                        if (typeof global.Site.initScrollReveal === "function") {
                            global.Site.initScrollReveal();
                        }
                        if (typeof global.Site.initParallax === "function") {
                            global.Site.initParallax();
                        }
                        if (typeof global.Site.initHeaderScroll === "function") {
                            global.Site.initHeaderScroll();
                        }
                        if (typeof global.Site.pauseOffscreenVideos === "function") {
                            global.Site.pauseOffscreenVideos();
                        }
                    }

                    navigating = false;

                    if (options.hash) {
                        requestAnimationFrame(function () { scrollToHash(options.hash); });
                    } else {
                        global.scrollTo(0, 0);
                    }

                    document.dispatchEvent(new CustomEvent("spa:navigate", { detail: { route: routeKey } }));
                    return routeKey;
                });
        }

        var transition = global.PageLoader && typeof global.PageLoader.runTransition === "function"
            ? global.PageLoader.runTransition(performMount, { route: routeKey, minMs: global.PageLoader.MIN_SPA })
            : performMount();

        return transition.catch(function (err) {
            navigating = false;
            console.error("[spa-router]", err);
            global.location.href = route.file + (options.hash || "");
            throw err;
        });
    }

    function scrollToHash(hash) {
        if (!hash) return;
        var id = hash.charAt(0) === "#" ? hash.slice(1) : hash;
        if (id === "contact") {
            if (global.Site && typeof global.Site.openContactModal === "function") {
                global.Site.openContactModal();
            }
            return;
        }
        var target = document.getElementById(id);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function navigateToRoute(routeKey, options) {
        options = options || {};
        var route = ROUTES[routeKey];
        if (!route) return Promise.resolve();

        return mountRoute(routeKey, options).then(function () {
            if (!options.replace) {
                global.history.pushState({ spaRoute: routeKey }, route.title, route.file + (options.hash || ""));
            }
        });
    }

    function navigateFromAnchor(anchor) {
        var url = new URL(anchor.href, global.location.href);

        if (url.hash === "#contact") {
            if (global.Site && typeof global.Site.openContactModal === "function") {
                global.Site.openContactModal();
            }
            return true;
        }

        var file = url.pathname.split("/").pop().toLowerCase() || "index.html";
        var routeKey = resolveRouteKey(file === "" ? "index.html" : file);

        if (!routeKey && (url.pathname === "/" || url.pathname.endsWith("/"))) {
            routeKey = "main";
        }

        if (!routeKey) return false;

        if (routeKey === "main" && url.hash) {
            if (currentRoute === "main") {
                scrollToHash(url.hash);
                global.history.pushState({ spaRoute: "main" }, ROUTES.main.title, "index.html" + url.hash);
                return true;
            }
            navigateToRoute("main", { hash: url.hash });
            return true;
        }

        navigateToRoute(routeKey, { hash: url.hash });
        return true;
    }

    function boot() {
        var view = getSpaViewEl();
        if (!view) return;

        var routeKey = resolveRouteKey();
        if (!routeKey) return;

        ["home.css", "gallery.css", "lowpoly.css", "insights.css"].forEach(function (href) {
            if (document.querySelector("link[href=\"" + href + "\"]")) loadedStyles[href] = true;
        });
        document.querySelectorAll("script[src]").forEach(function (s) {
            var src = s.getAttribute("src");
            if (src) loadedScripts[src.split("/").pop()] = true;
        });

        currentRoute = routeKey;
        setBodyClass(routeKey);
        document.title = ROUTES[routeKey].title;

        if (routeKey === "main") {
            /* home bootstraps on first paint via home.js */
        }

        document.addEventListener("click", function (e) {
            if (e.target.closest("[data-contact]")) return;

            var anchor = e.target.closest("a[href]");
            if (!anchor || !isSpaLink(anchor)) return;
            e.preventDefault();
            navigateFromAnchor(anchor);
        });

        global.addEventListener("popstate", function () {
            var key = (global.history.state && global.history.state.spaRoute) || resolveRouteKey();
            if (!key || key === currentRoute) return;
            mountRoute(key, { force: true, hash: global.location.hash });
        });

        if (!global.history.state || !global.history.state.spaRoute) {
            global.history.replaceState({ spaRoute: routeKey }, document.title, global.location.pathname + global.location.search + global.location.hash);
        }

        if (global.location.hash) {
            requestAnimationFrame(function () { scrollToHash(global.location.hash); });
        }
    }

    global.SpaRouter = {
        boot: boot,
        navigate: navigateToRoute,
        getRouteKey: function () { return currentRoute || resolveRouteKey(); },
        resolveRouteKey: resolveRouteKey,
        mount: mountRoute
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})(window);
