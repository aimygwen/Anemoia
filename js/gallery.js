/**
 * Stills & Films — large DOM gallery with scroll stretch.
 * Films: preview clip in view; tap opens YouTube.
 */
(function () {
  "use strict";

  var IMG = "./assets/content/stills/";
  var FILM = "./assets/content/films/";

  var artworks = [
    { id: 1, src: IMG + "img1.webp", title: "Celestial Meadow", medium: "Illustration", width: 1600, height: 905 },
    { id: 2, src: IMG + "img2.webp", title: "Aetherial Canopy", medium: "Sketch", width: 1600, height: 898 },
    { id: 3, src: IMG + "img3.webp", title: "Glowgem Crystal", medium: "Painting", width: 1600, height: 900 },
    { id: 4, src: IMG + "img4.webp", title: "Fennec Wanderer", medium: "Illustration", width: 1600, height: 900 },
    { id: 5, src: IMG + "img5.webp", title: "Runic Broadsword", medium: "Sketch", width: 1600, height: 899 },
    { id: 6, src: IMG + "img6.webp", title: "Autumntide Picnic", medium: "Sketch", width: 1600, height: 900 },
    { id: 7, src: IMG + "img7.webp", title: "Voxel Sentry", medium: "Illustration", width: 1600, height: 844 },
    { id: 8, src: IMG + "img8.webp", title: "Elderglen Guardian", medium: "Painting", width: 1600, height: 905 },
    { id: 9, src: IMG + "img9.webp", title: "Prismatic Cavern", medium: "Painting", width: 1600, height: 1199 },
    { id: 10, src: IMG + "img10.webp", title: "Floating Spire", medium: "Sketch", width: 1600, height: 900 },
    { id: 11, src: IMG + "img11.webp", title: "Valley Ridge", medium: "Illustration", width: 1600, height: 900 },
    { id: 12, src: IMG + "img12.webp", title: "Clouddrift Sails", medium: "Sketch", width: 1600, height: 900 },
    { id: 13, src: IMG + "img13.webp", title: "Aetherwood Bonsai", medium: "Illustration", width: 1600, height: 1199 },
    { id: 14, src: IMG + "img14.webp", title: "Vibrant Forest Flora", medium: "Painting", width: 1199, height: 1600 },
    { id: 15, src: IMG + "img15.webp", title: "Ancient Archway", medium: "Sketch", width: 1600, height: 1199 },
    { id: 16, src: IMG + "img16.webp", title: "Shadowgrove Druid", medium: "Illustration", width: 900, height: 1600 },
    { id: 17, src: IMG + "img17.webp", title: "Firefly Hearth", medium: "Painting", width: 1600, height: 1067 },
    { id: 18, src: IMG + "img18.webp", title: "Canopy Leaf", medium: "Illustration", width: 1597, height: 1600 },
    { id: 19, src: IMG + "img19.webp", title: "Runic Obsidian", medium: "Sketch", width: 1200, height: 1600 },
    { id: 20, src: IMG + "img20.webp", title: "Starry Ruins", medium: "Painting", width: 1131, height: 1600 },
  ];

  var films = [
    {
      id: "mov1",
      src: FILM + "mov1.mp4",
      youtube: "https://youtu.be/TOHb_6M-UYU?si=vs5JZHF67W8-UDOg",
      medium: "Film",
      width: 1920,
      height: 1080,
    },
    {
      id: "mov2",
      src: FILM + "mov2.mp4",
      youtube: "https://youtu.be/P16WCz7eetA?si=dhVHNvjVG9JGW3rc",
      medium: "Film",
      width: 1920,
      height: 1080,
    },
    {
      id: "mov3",
      src: FILM + "mov3.mp4",
      youtube: "https://youtu.be/yk4h39gUqQI?si=OMnJRo1ycladsBi8",
      medium: "Film",
      width: 1920,
      height: 1080,
    },
  ];

  function readView() {
    var hash = (location.hash || "").replace(/^#/, "").toLowerCase();
    if (hash === "films" || hash === "film") return "films";
    var q = new URLSearchParams(location.search).get("view");
    if (q === "films" || q === "film") return "films";
    return "stills";
  }

  function mountGallery(options) {
    options = options || {};
    var spaMode = !!options.spaMode;
    var mainSel = options.main || "#main";
    var dotsSel = options.dots || ".gal-dots";
    var lightboxSel = options.lightbox || "#gal-lightbox";

    var main =
      typeof mainSel === "string" ? document.querySelector(mainSel) : mainSel;
    var dotsNav =
      typeof dotsSel === "string" ? document.querySelector(dotsSel) : dotsSel;
    var lightbox =
      typeof lightboxSel === "string"
        ? document.querySelector(lightboxSel)
        : lightboxSel;
    var lbImage = document.getElementById("gal-lightbox-image");
    var lbVideo = document.getElementById("gal-lightbox-video");
    var lbTitle = document.getElementById("gal-lightbox-title");
    var lbMedium = document.getElementById("gal-lightbox-medium");
    var lbClose = document.getElementById("gal-lightbox-close");
    var body = document.body;
    var viewLinks = document.querySelectorAll(".gal-view-nav [data-gal-view]");
    if (!main || !dotsNav) {
      return { destroy: function () {} };
    }

    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var open = false;
    var view = options.view || readView();
    var activeFilm = -1;
    var filmIO = null;
    var activeIO = null;
    var projects = [];
    var dots = [];
    var medias = [];
    var ac = new AbortController();
    var signal = ac.signal;

    function dotLabel(medium, index) {
      return medium + " " + String(index + 1);
    }

    function setViewLinks() {
      for (var i = 0; i < viewLinks.length; i++) {
        var link = viewLinks[i];
        var v = link.getAttribute("data-gal-view");
        link.classList.toggle("is-current", v === view);
        link.setAttribute("aria-current", v === view ? "page" : "false");
      }
    }

    function clearStage() {
      if (filmIO) {
        filmIO.disconnect();
        filmIO = null;
      }
      activeFilm = -1;
      main.innerHTML = "";
      dotsNav.innerHTML = "";
      projects = [];
      dots = [];
      medias = [];
    }

    function buildStills() {
      var frag = document.createDocumentFragment();
      for (var i = 0; i < artworks.length; i++) {
        var art = artworks[i];
        var section = document.createElement("section");
        section.className = "gal-project";
        section.id = "project-" + i;

        var eyebrow = document.createElement("p");
        eyebrow.className = "gal-eyebrow";
        eyebrow.textContent = art.medium;

        var card = document.createElement("div");
        card.className = "gal-card gal-card--still";

        var media = document.createElement("div");
        media.className = "gal-media";
        var img = document.createElement("img");
        img.alt = "";
        img.width = art.width;
        img.height = art.height;
        img.decoding = "async";
        img.loading = i < 2 ? "eager" : "lazy";
        img.src = art.src;
        media.appendChild(img);
        card.appendChild(media);

        section.appendChild(eyebrow);
        section.appendChild(card);
        frag.appendChild(section);
        appendDot(dotLabel(art.medium, i), section.id, i === 0);
      }
      main.appendChild(frag);
      collectRefs();
    }

    function buildFilms() {
      var frag = document.createDocumentFragment();
      for (var i = 0; i < films.length; i++) {
        var film = films[i];
        var section = document.createElement("section");
        section.className = "gal-project gal-project--film";
        section.id = "film-" + i;
        section.dataset.filmIndex = String(i);

        var eyebrow = document.createElement("p");
        eyebrow.className = "gal-eyebrow";
        eyebrow.textContent = film.medium;

        var card = document.createElement("a");
        card.className = "gal-card gal-card--film";
        card.href = film.youtube;
        card.target = "_blank";
        card.rel = "noopener noreferrer";
        card.setAttribute("aria-label", "Watch film " + String(i + 1) + " on YouTube");

        var media = document.createElement("div");
        media.className = "gal-media gal-media--film";

        var vid = document.createElement("video");
        vid.className = "gal-film-video";
        vid.muted = true;
        vid.playsInline = true;
        vid.loop = true;
        vid.preload = i === 0 ? "auto" : "metadata";
        vid.setAttribute("muted", "");
        vid.setAttribute("playsinline", "");
        vid.src = film.src;
        vid.setAttribute("aria-label", "Film preview " + String(i + 1));

        (function (v) {
          function pinStill() {
            try {
              var t = Math.min(0.35, (v.duration || 1) * 0.08);
              if (Math.abs(v.currentTime - t) > 0.05) v.currentTime = t;
            } catch (err) {}
          }
          v.addEventListener("loadeddata", pinStill, { once: true });
        })(vid);

        media.appendChild(vid);
        card.appendChild(media);

        section.appendChild(eyebrow);
        section.appendChild(card);
        frag.appendChild(section);
        appendDot(dotLabel(film.medium, i), section.id, i === 0);
      }
      main.appendChild(frag);
      collectRefs();
      wireFilmFocus();
    }

    function appendDot(label, id, active) {
      var dot = document.createElement("a");
      dot.href = "#" + id;
      if (active) dot.className = "is-active";
      dot.setAttribute("aria-label", "Go to " + label);
      var sr = document.createElement("span");
      sr.className = "sr-only";
      sr.textContent = label;
      dot.appendChild(sr);
      dotsNav.appendChild(dot);
    }

    function collectRefs() {
      projects = main.querySelectorAll(".gal-project");
      dots = dotsNav.querySelectorAll("a");
      medias = main.querySelectorAll(".gal-media");
      wireDots();
      wireActiveDots();
    }

    function setActiveDot(index) {
      for (var d = 0; d < dots.length; d++) {
        dots[d].classList.toggle("is-active", d === index);
      }
    }

    function wireActiveDots() {
      if (activeIO) activeIO.disconnect();
      activeIO = new IntersectionObserver(
        function (entries) {
          for (var e = 0; e < entries.length; e++) {
            if (!entries[e].isIntersecting) continue;
            var index = Array.prototype.indexOf.call(
              projects,
              entries[e].target
            );
            if (index >= 0) setActiveDot(index);
          }
        },
        { root: null, threshold: 0.55 }
      );
      for (var a = 0; a < projects.length; a++) activeIO.observe(projects[a]);
    }

    function wireDots() {
      for (var di = 0; di < dots.length; di++) {
        dots[di].addEventListener("click", function (ev) {
          ev.preventDefault();
          var href = this.getAttribute("href");
          var target = href && document.querySelector(href);
          if (!target) return;
          if (window.Polyglide) window.Polyglide.to(target, { offset: 0 });
          else
            target.scrollIntoView({
              behavior: reduced ? "auto" : "smooth",
              block: "start",
            });
        });
      }
    }

    function pauseFilmAt(index) {
      var section = projects[index];
      if (!section) return;
      section.classList.remove("is-playing");
      var vids = section.querySelectorAll("video");
      for (var i = 0; i < vids.length; i++) {
        try {
          vids[i].pause();
        } catch (err) {}
      }
    }

    function playFilmAt(index) {
      var section = projects[index];
      if (!section) return;
      section.classList.add("is-playing");
      var mainVid = section.querySelector(".gal-film-video");
      if (!mainVid) return;
      var p = mainVid.play();
      if (p && typeof p.catch === "function") p.catch(function () {});
    }

    function setActiveFilm(index) {
      if (index === activeFilm) return;
      if (activeFilm >= 0) pauseFilmAt(activeFilm);
      activeFilm = index;
      if (activeFilm >= 0 && !open && !reduced) playFilmAt(activeFilm);
      else if (activeFilm >= 0 && reduced) {
        projects[activeFilm].classList.add("is-playing");
      }
    }

    function wireFilmFocus() {
      filmIO = new IntersectionObserver(
        function (entries) {
          var best = null;
          for (var e = 0; e < entries.length; e++) {
            var entry = entries[e];
            if (!entry.isIntersecting) continue;
            if (!best || entry.intersectionRatio > best.intersectionRatio) {
              best = entry;
            }
          }
          if (!best) return;
          var idx = Number(best.target.dataset.filmIndex);
          if (!isNaN(idx)) setActiveFilm(idx);
        },
        { root: null, threshold: [0.45, 0.6, 0.75] }
      );
      for (var i = 0; i < projects.length; i++) filmIO.observe(projects[i]);
      if (projects.length) setActiveFilm(0);
    }

    function render() {
      clearStage();
      body.setAttribute("data-gal-view", view);
      if (!spaMode) {
        document.title =
          (view === "films" ? "Films" : "Stills") + " — Art of Aimy Gwen";
      }
      setViewLinks();
      if (view === "films") buildFilms();
      else buildStills();
      lastScroll = getScrollY();
      stretch = 1;
      squash = 1;
      skew = 0;
      rot = 0;
      applyStretch();
      if (window.Polyglide) {
        try {
          window.scrollTo(0, 0);
          if (window.__lenis && typeof window.__lenis.scrollTo === "function") {
            window.__lenis.scrollTo(0, { immediate: true });
          }
        } catch (err) {}
      }
    }

    function switchView(next, pushHash) {
      if (next !== "films" && next !== "stills") return;
      if (next === view && main.children.length) {
        setViewLinks();
        return;
      }
      view = next;
      if (pushHash !== false) {
        var hash = "#" + view;
        if (location.hash !== hash) {
          history.replaceState(null, "", hash);
        }
      }
      render();
    }

    for (var vi = 0; vi < viewLinks.length; vi++) {
      viewLinks[vi].addEventListener(
        "click",
        function (ev) {
          ev.preventDefault();
          switchView(this.getAttribute("data-gal-view"), true);
        },
        { signal: signal }
      );
    }
    if (!spaMode) {
      window.addEventListener(
        "hashchange",
        function () {
          switchView(readView(), false);
        },
        { signal: signal }
      );
    }

    if (window.Polyglide) {
      if (window.__lenis) window.Polyglide.start();
      else window.Polyglide.boot();
    }
    var lenis = window.__lenis || null;

    /* —— Scroll-velocity stretch —— */
    var lastScroll = 0;
    var speed = 0;
    var stretch = 1;
    var squash = 1;
    var skew = 0;
    var rot = 0;
    var raf = 0;
    var lastStretch = "";
    var lastSquash = "";
    var lastSkew = "";
    var lastRot = "";

    function getScrollY() {
      if (window.__lenis && typeof window.__lenis.scroll === "number") {
        return window.__lenis.scroll;
      }
      return window.scrollY || 0;
    }

    function applyStretch() {
      var s = stretch.toFixed(3);
      var q = squash.toFixed(3);
      var k = skew.toFixed(2) + "deg";
      var r = rot.toFixed(2) + "deg";
      if (s === lastStretch && q === lastSquash && k === lastSkew && r === lastRot) return;
      lastStretch = s;
      lastSquash = q;
      lastSkew = k;
      lastRot = r;
      for (var m = 0; m < medias.length; m++) {
        medias[m].style.setProperty("--gal-stretch", s);
        medias[m].style.setProperty("--gal-squash", q);
        medias[m].style.setProperty("--gal-skew", k);
        medias[m].style.setProperty("--gal-rot", r);
      }
    }

    function tickStretch() {
      raf = 0;
      if (open || reduced) {
        stretch += (1 - stretch) * 0.25;
        squash += (1 - squash) * 0.25;
        skew += (0 - skew) * 0.22;
        rot += (0 - rot) * 0.2;
        applyStretch();
        if (
          Math.abs(stretch - 1) > 0.002 ||
          Math.abs(squash - 1) > 0.002 ||
          Math.abs(skew) > 0.05 ||
          Math.abs(rot) > 0.05
        ) {
          raf = requestAnimationFrame(tickStretch);
        }
        return;
      }

      var y = getScrollY();
      var dy = y - lastScroll;
      lastScroll = y;
      speed = speed * 0.78 + dy * 0.22;

      var stretchTarget = 1 + Math.max(-0.05, Math.min(0.07, -speed * 0.0035));
      var squashTarget = 1 + Math.max(-0.04, Math.min(0.04, speed * 0.0025));
      var skewTarget = Math.max(-2.5, Math.min(2.5, speed * 0.05));
      var rotTarget = Math.max(-1, Math.min(1, speed * 0.018));

      stretch += (stretchTarget - stretch) * 0.14;
      squash += (squashTarget - squash) * 0.14;
      skew += (skewTarget - skew) * 0.12;
      rot += (rotTarget - rot) * 0.12;

      if (Math.abs(speed) < 0.25) {
        stretch += (1 - stretch) * 0.12;
        squash += (1 - squash) * 0.12;
        skew += (0 - skew) * 0.14;
        rot += (0 - rot) * 0.14;
      }

      applyStretch();

      if (
        Math.abs(speed) > 0.05 ||
        Math.abs(stretch - 1) > 0.002 ||
        Math.abs(squash - 1) > 0.002 ||
        Math.abs(skew) > 0.05 ||
        Math.abs(rot) > 0.05
      ) {
        raf = requestAnimationFrame(tickStretch);
      }
    }

    function bumpStretch() {
      if (reduced || open) return;
      if (!raf) raf = requestAnimationFrame(tickStretch);
    }

    lastScroll = getScrollY();
    window.addEventListener("scroll", bumpStretch, { passive: true, signal: signal });
    if (lenis && typeof lenis.on === "function") {
      lenis.on("scroll", bumpStretch);
    }

    function openLightbox(art, film) {
      if (!lightbox) return;
      open = true;
      if (window.Polyglide) window.Polyglide.stop();
      if (view === "films" && activeFilm >= 0) pauseFilmAt(activeFilm);
      stretch = 1;
      squash = 1;
      skew = 0;
      rot = 0;
      applyStretch();

      if (film) {
        if (lbImage) {
          lbImage.hidden = true;
          lbImage.removeAttribute("src");
        }
        if (lbVideo) {
          lbVideo.hidden = false;
          lbVideo.src = film.src;
          lbVideo.play().catch(function () {});
        }
        lbTitle.textContent = film.title;
        lbMedium.textContent = film.medium || "";
      } else if (art) {
        if (lbVideo) {
          lbVideo.pause();
          lbVideo.removeAttribute("src");
          lbVideo.hidden = true;
          lbVideo.load();
        }
        if (lbImage) {
          lbImage.hidden = false;
          lbImage.src = art.src;
          lbImage.alt = art.title;
        }
        lbTitle.textContent = art.title;
        lbMedium.textContent = art.medium || "";
      }

      lightbox.hidden = false;
      void lightbox.offsetWidth;
      lightbox.classList.add("is-open");
      body.classList.add("gal-lightbox-open");
      lbClose.focus({ preventScroll: true });
    }

    function closeLightbox() {
      if (!lightbox || !open) return;
      open = false;
      lightbox.classList.remove("is-open");
      body.classList.remove("gal-lightbox-open");
      if (lbVideo) {
        lbVideo.pause();
        lbVideo.removeAttribute("src");
        lbVideo.load();
        lbVideo.hidden = true;
      }
      if (lbImage) {
        lbImage.hidden = false;
        lbImage.removeAttribute("src");
      }
      if (window.Polyglide) window.Polyglide.start();
      if (view === "films" && activeFilm >= 0 && !reduced) {
        playFilmAt(activeFilm);
      }
      lastScroll = getScrollY();
      var done = function () {
        lightbox.hidden = true;
        lightbox.removeEventListener("transitionend", done);
      };
      lightbox.addEventListener("transitionend", done);
      setTimeout(function () {
        if (!open) lightbox.hidden = true;
      }, 380);
    }

    if (lbClose) {
      lbClose.addEventListener("click", closeLightbox, { signal: signal });
    }
    if (lightbox) {
      lightbox.addEventListener(
        "click",
        function (e) {
          if (e.target === lightbox) closeLightbox();
        },
        { signal: signal }
      );
    }
    window.addEventListener(
      "keydown",
      function (e) {
        if (e.key === "Escape" && open) {
          e.preventDefault();
          closeLightbox();
        }
      },
      { signal: signal }
    );

    document.addEventListener(
      "visibilitychange",
      function () {
        if (document.hidden) {
          if (view === "films" && activeFilm >= 0) pauseFilmAt(activeFilm);
        } else if (view === "films" && activeFilm >= 0 && !open && !reduced) {
          playFilmAt(activeFilm);
        }
      },
      { signal: signal }
    );

    render();

    return {
      destroy: function () {
        ac.abort();
        if (raf) cancelAnimationFrame(raf);
        if (filmIO) {
          filmIO.disconnect();
          filmIO = null;
        }
        if (activeIO) {
          activeIO.disconnect();
          activeIO = null;
        }
        if (open) closeLightbox();
        clearStage();
        body.classList.remove("gal-lightbox-open");
        if (lenis && typeof lenis.off === "function") {
          try {
            lenis.off("scroll", bumpStretch);
          } catch (errOff) {}
        }
      },
    };
  }

  window.SpaPages = window.SpaPages || {};
  var galleryRun = null;

  window.SpaPages.gallery = {
    mount: function (opts) {
      if (galleryRun && galleryRun.destroy) galleryRun.destroy();
      galleryRun = mountGallery(opts || {});
    },
    unmount: function () {
      if (galleryRun && galleryRun.destroy) {
        galleryRun.destroy();
        galleryRun = null;
      }
    },
  };

  function shouldAutoBootGallery() {
    if (document.body && document.body.hasAttribute("data-spa-host")) return false;
    return !!document.getElementById("main");
  }

  if (shouldAutoBootGallery()) {
    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        function () {
          window.SpaPages.gallery.mount();
        },
        { once: true }
      );
    } else {
      window.SpaPages.gallery.mount();
    }
  }
})();
