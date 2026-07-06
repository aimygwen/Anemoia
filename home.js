/**
 * Homepage interactions — hero, player, letter animations, about reveal.
 */
(function () {
    "use strict";

    function bootHome() {
        if (!document.querySelector(".hero-section")) return;

        var Site = window.Site;
        if (!Site) return;

        var cameFromTransition = Site.initPageTransition();

        document.querySelectorAll(".about-text h1").forEach(function (el) {
            if (el.dataset.lettersSplit === "1") return;
            Site.splitIntoLetters(el);
            requestAnimationFrame(function () {
                requestAnimationFrame(function () { el.classList.add("letters-ready"); });
            });
        });

        var scrollLetterHeadings = document.querySelectorAll(
            ".career-label-word, .specialty-heading, .collaborations-heading, .work-heading, .about-bridge-heading, .visual-heading"
        );
        scrollLetterHeadings.forEach(function (el) {
            if (el.dataset.lettersSplit !== "1") Site.splitIntoLetters(el);
        });

        if (scrollLetterHeadings.length && "IntersectionObserver" in window) {
            var lettersIO = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    entry.target.classList.toggle("letters-ready", entry.isIntersecting);
                });
            }, { threshold: 0.15 });
            scrollLetterHeadings.forEach(function (el) { lettersIO.observe(el); });
        } else {
            scrollLetterHeadings.forEach(function (el) { el.classList.add("letters-ready"); });
        }

        var cozyVideo = document.querySelector(".cozy-banner video");
        if (cozyVideo) {
            cozyVideo.defaultPlaybackRate = 0.7;
            cozyVideo.playbackRate = 0.7;
        }

        initPlayer(cameFromTransition);
        initHero();
        initVantaVideos();

        setTimeout(function () {
            document.body.classList.add("about-revealed");
        }, cameFromTransition ? 300 : 100);

        Site.initScrollReveal();
        Site.initParallax();
        Site.initContactModal();
        Site.pauseOffscreenVideos();

        var careerLabel = document.querySelector(".career-label");
        var experienceSection = document.querySelector(".experience");
        if (careerLabel && experienceSection && "IntersectionObserver" in window) {
            new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    careerLabel.classList.toggle("is-revealed", entry.isIntersecting);
                });
            }, { threshold: 0.08 }).observe(experienceSection);
        }
    }

    function initPlayer(cameFromTransition) {
        var player = document.querySelector(".player");
        if (!player || player.dataset.playerInit === "1") {
            setTimeout(function () {
                if (player) player.classList.add("is-revealed");
            }, cameFromTransition ? 1300 : 1100);
            return;
        }
        player.dataset.playerInit = "1";

        var audio = player.querySelector(".player-audio");
        var playerToggle = player.querySelector(".player-toggle");
        var playerNext = player.querySelector(".player-next");
        var playerTrack = player.querySelector(".player-track");
        var TRACKS = [
            { src: "music/Lo-Fi Hip-Hop.mp3", title: "Lo-Fi Hip-Hop" },
            { src: "music/Main_79.mp3", title: "Main 79" },
            { src: "music/Full.mp3", title: "Full" }
        ];
        var trackIdx = 0;

        if (audio) audio.volume = 0.55;

        function loadTrack(i, autoplay) {
            trackIdx = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length;
            var t = TRACKS[trackIdx];
            audio.src = encodeURI(t.src);
            playerTrack.textContent = t.title;
            if (autoplay) audio.play().catch(function () {});
        }

        if (audio && playerToggle && playerNext && playerTrack) {
            loadTrack(0, false);
            playerToggle.addEventListener("click", function () {
                if (audio.paused) audio.play().catch(function () {});
                else audio.pause();
            });
            playerNext.addEventListener("click", function () {
                loadTrack(trackIdx + 1, !audio.paused);
            });
            audio.addEventListener("play", function () { player.classList.add("is-playing"); });
            audio.addEventListener("pause", function () { player.classList.remove("is-playing"); });
            audio.addEventListener("ended", function () { loadTrack(trackIdx + 1, true); });
        }

        setTimeout(function () { player.classList.add("is-revealed"); }, cameFromTransition ? 1300 : 1100);
    }

    function initHero() {
        var hero = document.querySelector(".hero");
        if (!hero || hero.dataset.heroInit === "1") return;
        hero.dataset.heroInit = "1";

        var Site = window.Site;
        var heroH1 = hero.querySelector("h1");
        var heroH2 = hero.querySelector("h2");
        var heroCta = hero.querySelector(".cta");

        if (heroH1 && heroH1.dataset.lettersSplit !== "1") Site.splitIntoLetters(heroH1);
        var h2LetterCount = 0;
        if (heroH2 && heroH2.dataset.lettersSplit !== "1") {
            h2LetterCount = Site.splitIntoLetters(heroH2, true) || 0;
        }

        if (heroH2) {
            heroH2.querySelectorAll(".word").forEach(function (w) {
                var bare = w.textContent.replace(/[^a-z]/gi, "").toLowerCase();
                if (bare === "mess") w.classList.add("word-outline");
            });
        }

        if (heroCta) {
            heroCta.style.transitionDelay = (h2LetterCount * 22 + 200) + "ms, 0s, 0s";
        }

        setTimeout(function () {
            hero.classList.add("is-revealed");
            if (heroH1) heroH1.classList.add("letters-ready");
            if (heroH2) heroH2.classList.add("letters-ready");
        }, 120);

        var VIDEOS = [
            "videos/lick.mp4", "videos/airplane.mp4", "videos/stretch.mp4", "videos/idea.mp4",
            "videos/phone.mp4", "videos/glasses.mp4", "videos/headphones.mp4", "videos/sleep.mp4",
            "videos/fasttype.mp4", "videos/fistpump.mp4", "videos/frisbee.mp4", "videos/ufo.mp4"
        ];
        var vA = document.querySelector(".stage .vA");
        var vB = document.querySelector(".stage .vB");
        if (!vA || !vB) return;

        var players = [vA, vB];
        var lastIndex = -1;
        var active = 0;

        function pickNextIndex() {
            if (VIDEOS.length <= 1) return 0;
            var i;
            do { i = Math.floor(Math.random() * VIDEOS.length); } while (i === lastIndex);
            lastIndex = i;
            return i;
        }

        function preloadInto(p) {
            p.src = VIDEOS[pickNextIndex()];
            try { p.load(); } catch (e) { /* noop */ }
        }

        function swap() {
            var cur = players[active];
            var next = players[1 - active];
            next.classList.add("is-active");
            cur.classList.remove("is-active");
            var pp = next.play();
            if (pp && pp.catch) pp.catch(function () {});
            cur.pause();
            cur.currentTime = 0;
            preloadInto(cur);
            active = 1 - active;
        }

        players.forEach(function (p) { p.addEventListener("ended", swap); });

        var poster = document.querySelector(".stage .poster");
        vA.src = VIDEOS[pickNextIndex()];
        preloadInto(vB);
        vA.addEventListener("playing", function () {
            vA.classList.add("is-active");
            if (poster) poster.style.opacity = "0";
        }, { once: true });

        var initial = vA.play();
        if (initial && initial.catch) {
            initial.catch(function () {
                function resume() {
                    vA.play().catch(function () {});
                    window.removeEventListener("click", resume);
                    window.removeEventListener("touchstart", resume);
                    window.removeEventListener("keydown", resume);
                }
                window.addEventListener("click", resume, { once: true });
                window.addEventListener("touchstart", resume, { once: true });
                window.addEventListener("keydown", resume, { once: true });
            });
        }
    }

    function initVantaVideos() {
        var wrap = document.querySelector(".vanta-videos");
        if (!wrap || wrap.dataset.vantaInit === "1") return;
        wrap.dataset.vantaInit = "1";
        var videos = Array.prototype.slice.call(wrap.querySelectorAll("video"));
        if (!videos.length) return;

        function show(i) {
            videos.forEach(function (v, n) {
                var on = n === i;
                v.classList.toggle("is-active", on);
                if (on) { v.currentTime = 0; v.play().catch(function () {}); }
                else v.pause();
            });
        }

        videos.forEach(function (v, n) {
            v.addEventListener("ended", function () { show((n + 1) % videos.length); });
        });
        show(0);
    }

    window.SpaPages = window.SpaPages || {};
    window.SpaPages.main = {
        init: bootHome,
        destroy: function () {
            var audio = document.querySelector(".player-audio");
            if (audio) audio.pause();
            document.querySelectorAll(".stage video").forEach(function (v) {
                try { v.pause(); } catch (e) { /* noop */ }
            });
        }
    };

    bootHome();
})();
