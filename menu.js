// setup
const tl = gsap.timeline({ paused: true });
let path = document.querySelector("path");
var spanBefore = CSSRulePlugin.getRule("#hamburger span:before");

gsap.set(".menu", { visibility: "hidden" });

function revealMenu() {
    revealMenuItems();

    const hubFade = document.querySelector('.hub-fade');
    const hamburger = document.getElementById("hamburger");
    const toggleBtn = document.getElementById("toggle-btn");

    // 🛑 NEU: Fügt die no-scroll Klasse zum Body hinzu/entfernt sie
    const body = document.body;

    // Kombiniere alle Aktionen in einem einzigen Klick-Handler
    toggleBtn.onclick = function (e) {
        body.classList.toggle('no-scroll'); // <--- Steuert das Scrollen der Hauptseite

        hubFade.classList.toggle("active");
        hamburger.classList.toggle("active");

        tl.reversed(!tl.reversed());
    };
}

revealMenu();

function revealMenuItems() {
    const power4 = "power4.inOut";
    const menuLinks = ".primary-container a, .secondary-container a";

    // --- Performance-Fix 1: Initialisierung der Links mit GPU-basiertem y ---
    gsap.set(menuLinks, {
        filter: 'blur(10px)',
        opacity: 0,
        y: 50, // Ersetzt top: 50px -> nutzt transform: translateY(50px)
        scale: 1.8,
        display: 'inline-block',
        transformOrigin: 'center center',
        willChange: 'transform, opacity' // Performance Boost
    });

    // --- Bestehende Animationen (Hamburger & Outline) ---
    tl.to("#hamburger", 1.25, {
        marginTop: "-5px",
        x: -40,
        y: 40,
        ease: power4,
    });

    tl.to(
        ".btn .btn-outline",
        1,
        {
            x: -40,
            y: 40,
            scale: 1.4,
            ease: power4,
        },
        "<"
    );

    tl.to(".menu", 1, { visibility: "visible" }, "-=0.5");

    // --- Performance-Fix 2: Optimierter Link-Tween ---
    tl.to(
        menuLinks,
        1.25,
        {
            y: 0,                   // Final position (slides up to original y)
            filter: 'blur(0px)',    // Final blur (clear)
            opacity: 1,             // Final opacity (visible)
            scale: 1,               // END at normal size (100%)
            ease: "power3.out",
            stagger: {
                amount: 0.8,
                from: "start"
            },
        },
        "-=1"
    ).reverse();
}