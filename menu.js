// Wähle den Button anhand seiner ID aus
const toggleBtn = document.getElementById('toggle-btn');

// Füge einen Event Listener hinzu, der auf Klicks wartet
toggleBtn.addEventListener('click', () => {
    // Schaltet die Klasse 'menu-open' auf dem Button um.
    toggleBtn.classList.toggle('menu-open');
});

// setup
// Initialize the GSAP timeline, paused by default
const tl = gsap.timeline({ paused: true });
let path = document.querySelector("path"); // NOTE: There is no 'path' element in the HTML
var spanBefore = CSSRulePlugin.getRule("#hamburger span:before");


gsap.set(".menu", { visibility: "hidden" });

function revealMenu() {
    revealMenuItems();

    const hubFade = document.querySelector('.hub-fade');
    const hamburger = document.getElementById("hamburger");
    const toggleBtn = document.getElementById("toggle-btn");

    // Kombiniere alle Aktionen in einem einzigen Klick-Handler
    toggleBtn.onclick = function (e) {
        // Fügt die 'active'-Klasse zum hub-fade (für den Blur) hinzu/entfernt sie
        hubFade.classList.toggle("active");

        // Fügt die 'active'-Klasse zum hamburger (für die Icon-Animation) hinzu/entfernt sie
        hamburger.classList.toggle("active");

        // Kehrt die GSAP-Timeline um (öffnet/schließt das Menü)
        tl.reversed(!tl.reversed());
    };
}

revealMenu();

// how to reveal
function revealMenuItems() {
    const power4 = "power4.inOut";

// ... (inside function revealMenuItems)

// Target all primary and secondary menu links
    const menuLinks = ".primary-container a, .secondary-container a";

// 1. **SET Initial State:** Apply blur, opacity, slide, AND SCALE
    gsap.set(menuLinks, {
        filter: 'blur(10px)',
        opacity: 0,
        top: '50px',
        scale: 1.8,

        // ⭐ KEY FIXES ADDED HERE ⭐
        display: 'inline-block', // Ensure the element behaves correctly for transforms
        transformOrigin: 'center center' // GSAP version of transform-origin: center;
    });
// ... (rest of the function remains the same)

    // --- Existing Animations (Hamburger & Outline) ---

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
            width: "175px",
            height: "175px",
            ease: power4,
        },
        "<"
    );

    tl.to(".menu", 1, { visibility: "visible" }, "-=0.5");

    // --- New/Updated Links Animation: Slide Up, Fade In, AND Scale Down ---
    tl.to(
        menuLinks,
        1.25,
        {
            top: 0,                 // Final position (slides up)
            filter: 'blur(0px)',    // Final blur (clear)
            opacity: 1,             // Final opacity (visible)
            scale: 1,               // END at normal size (100%)
            ease: "power3.out",
            stagger: {              // Staggered delay applied to ALL links
                amount: 0.8,        // Increased stagger amount to span both primary and secondary links
                from: "start"
            },
        },
        "-=1"
    ).reverse();
}

