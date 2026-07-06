/**
 * Shared site utilities — scroll reveal, typography helpers, page chrome.
 */
(function (global) {
    "use strict";

    var reducedMotion = global.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function splitIntoLetters(element, returnCount) {
        if (!element || element.dataset.lettersSplit === "1") {
            return returnCount ? 0 : undefined;
        }
        element.dataset.lettersSplit = "1";
        var text = element.textContent;
        element.textContent = "";
        var parts = text.split(/( )/);
        var letterIndex = 0;
        parts.forEach(function (part) {
            if (part === "") return;
            if (part === " ") {
                element.appendChild(document.createTextNode(" "));
                return;
            }
            var wordSpan = document.createElement("span");
            wordSpan.className = "word";
            for (var i = 0; i < part.length; i++) {
                var letter = document.createElement("span");
                letter.className = "letter";
                letter.textContent = part.charAt(i);
                letter.style.setProperty("--letter-i", letterIndex++);
                wordSpan.appendChild(letter);
            }
            element.appendChild(wordSpan);
        });
        return returnCount ? letterIndex : undefined;
    }

    function initScrollReveal(options) {
        options = options || {};
        var selector = options.selector || ".reveal-on-scroll, .reveal-fade, .is-visible";
        var threshold = options.threshold != null ? options.threshold : 0.1;
        var visibleClass = options.visibleClass || "is-revealed";
        var twoWay = options.twoWay !== false;
        var els = document.querySelectorAll(selector);

        if (!els.length) return;

        if (!("IntersectionObserver" in global)) {
            els.forEach(function (el) {
                el.classList.add(visibleClass);
            });
            return;
        }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add(visibleClass);
                    if (options.onReveal) options.onReveal(entry.target);
                } else if (twoWay) {
                    entry.target.classList.remove(visibleClass);
                }
            });
        }, { threshold: threshold });

        els.forEach(function (el) { io.observe(el); });
    }

    function initPageTransition() {
        var cameFromTransition = sessionStorage.getItem("pageTransition") === "1";
        sessionStorage.removeItem("pageTransition");
        if (!cameFromTransition) return false;

        document.body.classList.add("is-entering");
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                document.body.classList.add("is-entered");
            });
        });
        setTimeout(function () {
            document.body.classList.remove("is-entering", "is-entered");
        }, 700);
        return true;
    }

    function initHeaderScroll() {
        if (document.body.dataset.headerScrollInit) return;
        document.body.dataset.headerScrollInit = "true";
        if (reducedMotion) return;

        var SCROLL_FADE_AT = 60;
        var TOP_THRESHOLD = 50;
        var SCROLL_DELTA = 5;
        var lastScrollY = global.scrollY || 0;
        var scrollDirection = "up";

        function onScroll() {
            var y = global.scrollY || global.pageYOffset;
            var diff = y - lastScrollY;
            if (diff > SCROLL_DELTA) scrollDirection = "down";
            else if (diff < -SCROLL_DELTA) scrollDirection = "up";

            var atTop = y <= TOP_THRESHOLD;
            var chromeLocked = document.body.classList.contains("menu-open") ||
                document.body.classList.contains("modal-open");

            document.body.classList.toggle("is-scrolled", y > SCROLL_FADE_AT);
            document.body.classList.toggle("nav-hidden", !atTop && scrollDirection === "down" && !chromeLocked);
            lastScrollY = y;
        }

        global.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
    }

    function initParallax() {
        if (reducedMotion) return;

        var parallaxEls = document.querySelectorAll("[data-parallax]");
        var parallaxUpEls = document.querySelectorAll("[data-parallax-up]");
        if (!parallaxEls.length && !parallaxUpEls.length) return;

        var ticking = false;
        function applyParallax() {
            var vh = global.innerHeight;
            var vCenter = vh / 2;
            parallaxEls.forEach(function (el) {
                var speed = parseFloat(el.dataset.parallax) || 0;
                var rect = el.getBoundingClientRect();
                var elCenter = rect.top + rect.height / 2;
                el.style.setProperty("--parallax-y", ((vCenter - elCenter) * speed).toFixed(2) + "px");
            });
            parallaxUpEls.forEach(function (el) {
                var speed = parseFloat(el.dataset.parallaxUp) || 0;
                var rect = el.getBoundingClientRect();
                var raw = Math.max(0, vh - rect.top) * speed;
                el.style.setProperty("--parallax-y", (-Math.min(raw, 46)).toFixed(2) + "px");
            });
            ticking = false;
        }

        function schedule() {
            if (!ticking) {
                requestAnimationFrame(applyParallax);
                ticking = true;
            }
        }

        global.addEventListener("scroll", schedule, { passive: true });
        global.addEventListener("resize", applyParallax, { passive: true });
        applyParallax();
    }

    function pauseOffscreenVideos() {
        if (!("IntersectionObserver" in global)) return;
        var vids = Array.prototype.slice
            .call(document.querySelectorAll("video[autoplay]"))
            .filter(function (v) {
                return !v.closest(".stage") &&
                    !v.closest(".vanta-videos") &&
                    !v.closest(".vertical-gallery");
            });
        if (!vids.length) return;

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) {
                    var p = e.target.play();
                    if (p && p.catch) p.catch(function () {});
                } else {
                    e.target.pause();
                }
            });
        }, { rootMargin: "200px 0px" });

        vids.forEach(function (v) { io.observe(v); });
    }

    var contactModalBound = false;
    var contactLastFocus = null;

    var CONTACT_MODAL_HTML =
        '<div class="modal" id="contactModal" hidden>' +
        '<div class="modal__overlay" data-close></div>' +
        '<div class="modal__dialog modern-contact-dialog" role="dialog" aria-modal="true" aria-labelledby="contactModalTitle">' +
        '<div class="modern-contact-content">' +
        '<h2 class="modern-contact-title" id="contactModalTitle">Say Hello</h2>' +
        '<p class="modern-contact-intro">No need to be shy. Have a chaotic vision or a request? Just message me, and we\'ll figure out what kind of trouble we can get into. Together.</p>' +
        '<form class="contact-form modern-contact-form" id="contact-form" novalidate>' +
        '<div class="modern-contact-fields">' +
        '<div class="modern-field field-name"><label for="cf-name">My name is</label>' +
        '<input id="cf-name" name="name" type="text" autocomplete="name" required placeholder="Who\'s hitting me up?" /></div>' +
        '<div class="modern-field field-email"><label for="cf-email">Reach me at</label>' +
        '<input id="cf-email" name="email" type="email" autocomplete="email" required placeholder="How can I reach you?" /></div>' +
        '<div class="modern-field field-message"><label for="cf-message">I want to say</label>' +
        '<textarea id="cf-message" name="message" rows="2" required placeholder="Let your ideas go wild. Don\'t hold back!"></textarea></div>' +
        '</div>' +
        '<div class="modern-contact-action">' +
        '<button class="contact-submit modern-contact-submit" type="submit">And off you go!</button>' +
        '<p class="contact-status" role="status" aria-live="polite"></p>' +
        '</div></form>' +
        '<div class="modern-contact-footer">' +
        '<span class="footer-prompt">Or write me directly at:</span>' +
        '<div class="contact-methods">' +
        '<a class="contact-method-btn email-btn" href="mailto:hello@aimygwen.art">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>' +
        '<span>hello@aimygwen.art</span></a>' +
        '<a class="contact-method-btn discord-btn" href="https://discord.com/users/1124618102500511744" target="_blank" rel="noopener noreferrer">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink: 0;"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z"/></svg>' +
        '<span>Discord DM ➔</span></a></div></div></div></div></div>';

    function ensureContactModal() {
        var modal = document.getElementById("contactModal");
        if (modal) return modal;
        var tpl = document.createElement("template");
        tpl.innerHTML = CONTACT_MODAL_HTML.trim();
        document.body.appendChild(tpl.content.firstChild);
        return document.getElementById("contactModal");
    }

    function openContactModal() {
        var modal = ensureContactModal();
        if (!modal) return;
        contactLastFocus = document.activeElement;
        modal.hidden = false;
        document.body.classList.add("modal-open");
        requestAnimationFrame(function () { modal.classList.add("is-open"); });
        var first = modal.querySelector("#cf-name");
        if (first) setTimeout(function () { first.focus(); }, 60);
    }

    function closeContactModal() {
        var modal = document.getElementById("contactModal");
        if (!modal || modal.hidden) return;
        modal.classList.remove("is-open");
        document.body.classList.remove("modal-open");
        setTimeout(function () { modal.hidden = true; }, 320);
        if (contactLastFocus && contactLastFocus.focus) contactLastFocus.focus();
    }

    function initContactModal() {
        ensureContactModal();
        if (contactModalBound) return;
        contactModalBound = true;

        document.addEventListener("click", function (e) {
            var trigger = e.target.closest("[data-contact]");
            if (trigger) {
                e.preventDefault();
                openContactModal();
                return;
            }
            var modal = document.getElementById("contactModal");
            if (modal && e.target.closest("[data-close]") && modal.contains(e.target)) {
                closeContactModal();
            }
        });

        document.addEventListener("keydown", function (e) {
            var modal = document.getElementById("contactModal");
            if (e.key === "Escape" && modal && !modal.hidden) closeContactModal();
        });

        if (global.location.hash === "#contact") setTimeout(openContactModal, 350);

        var contactForm = document.getElementById("contact-form");
        if (!contactForm) return;
        var statusEl = contactForm.querySelector(".contact-status");
        contactForm.addEventListener("submit", function (e) {
            e.preventDefault();
            if (!contactForm.reportValidity()) return;
            var get = function (n) { return (contactForm.elements[n].value || "").trim(); };
            var name = get("name");
            var email = get("email");
            var phone = get("phone");
            var message = get("message");
            var subject = "Portfolio inquiry from " + (name || "your site");
            var body = ["Name: " + name, "Email: " + email, "Phone: " + (phone || "—"), "", message].join("\n");
            global.location.href = "mailto:aimygwendesign@gmail.com?subject=" +
                encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
            if (statusEl) {
                statusEl.textContent = "Opening your email app… if nothing happens, email aimygwendesign@gmail.com directly.";
            }
        });
    }

    function initPageFadeIn(contentId, delay) {
        var shell = document.getElementById(contentId);
        if (!shell) return;
        setTimeout(function () {
            shell.classList.add("active", "is-active");
        }, delay != null ? delay : 150);
    }

    global.Site = {
        splitIntoLetters: splitIntoLetters,
        initScrollReveal: initScrollReveal,
        initPageTransition: initPageTransition,
        initHeaderScroll: initHeaderScroll,
        initParallax: initParallax,
        pauseOffscreenVideos: pauseOffscreenVideos,
        initContactModal: initContactModal,
        openContactModal: openContactModal,
        closeContactModal: closeContactModal,
        initPageFadeIn: initPageFadeIn
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initContactModal);
    } else {
        initContactModal();
    }
})(window);
