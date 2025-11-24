// setup
const tl = gsap.timeline({ paused: true });
let path = document.querySelector("path");
var spanBefore = CSSRulePlugin.getRule("#mark span:before");

gsap.set(".navi", { visibility: "hidden" });

function revealnavi() {
    revealnaviitems();

    const haze = document.querySelector('.haze');
    const mark = document.getElementById("mark");
    const pond = document.getElementById("pond");

    // 🛑 NEU: Fügt die no-scroll Klasse zum Body hinzu/entfernt sie
    const body = document.body;

    // Kombiniere alle Aktionen in einem einzigen Klick-Handler
    pond.onclick = function (e) {
        body.classList.toggle('no-scroll'); // <--- Steuert das Scrollen der Hauptseite

        haze.classList.toggle("active");
        mark.classList.toggle("active");

        tl.reversed(!tl.reversed());
    };
}

revealnavi();

function revealnaviitems() {
    const power4 = "power4.inOut";
    const naviLinks = ".main-container a, .side-container a";

    // --- Performance-Fix 1: Initialisierung der Links mit GPU-basiertem y ---
    gsap.set(naviLinks, {
        filter: 'blur(10px)',
        opacity: 0,
        y: 50, // Ersetzt top: 50px -> nutzt transform: translateY(50px)
        scale: 1.8,
        display: 'inline-block',
        transformOrigin: 'center center',
        willChange: 'transform, opacity' // Performance Boost
    });

    // --- Bestehende Animationen (mark & Outline) ---
    tl.to("#mark", 1.25, {
        marginTop: "-5px",
        x: -40,
        y: 40,
        ease: power4,
    });

    tl.to(
        ".btn .ripple",
        1,
        {
            x: -40,
            y: 40,
            scale: 1.4,
            ease: power4,
        },
        "<"
    );

    tl.to(".navi", 1, { visibility: "visible" }, "-=0.5");

    // --- Performance-Fix 2: Optimierter Link-Tween ---
    tl.to(
        naviLinks,
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











// Initialisiere die Timeline für das branding-Menü
const brandingTl = gsap.timeline({ paused: true });

// Setze das Menü initial auf unsichtbar
gsap.set(".branding", { visibility: "hidden" });

function revealbrandingnavi() {
    // ... (Diese Funktion bleibt unverändert) ...
    revealbrandingContent();

    const haze = document.querySelector('.haze');
    const pond = document.getElementById("brand");
    const body = document.body;

    pond.onclick = function (e) {
        body.classList.toggle('no-scroll');
        haze.classList.toggle("active");
        pond.classList.toggle("active");

        // Fügt die Steuerung für den Grain Z-Index hinzu (wie zuvor besprochen)
        if (brandingTl.reversed()) {
            // Beim Öffnen: Z-Index sofort hochsetzen
            body.classList.add('overlay-active');
        } else {
            // Beim Schließen: Z-Index verzögert zurücksetzen (falls gewünscht)
            setTimeout(() => {
                body.classList.remove('overlay-active');
            }, 1500);
        }

        brandingTl.reversed(!brandingTl.reversed());
    };
}

revealbrandingnavi();

function revealbrandingContent() {
    // 💡 NEUE, SCHNELLERE EASE-FUNKTION
    const naviContent = ".branding-content";

    // --- 1. Initialisierung der Content-Elemente ---
    // Startet leicht außerhalb des Bildschirms und leicht skaliert (subtilerer Effekt)
    gsap.set(naviContent, {
        filter: 'blur(10px)', // Weniger Start-Blur für weniger Lag
        opacity: 0,
        scale: 1.05,        // Startet nur minimal größer
        y: 20,              // Startet leicht tiefer
        willChange: 'transform, opacity, filter' // Fügt 'filter' hinzu
    });

    // --- 2. Timeline-Definition (Schneller und Flüssiger) ---

    // Menü-Container sichtbar machen
    brandingTl.to(".branding", 0.01, { visibility: "visible" });

    // Animation für den Content (Portrait & Signatur)
    brandingTl.to(
        naviContent,
        0.8, // 💡 KÜRZERE DAUER (von 1.25s)
        {
            filter: 'blur(0px)',
            y: 0,
            opacity: 1,
            scale: 1,
            ease: "expo.out",       // 💡 HOCHWERTIGE, SCHNELLE EASE-FUNKTION
        },
        // Startet gleichzeitig mit dem Sichtbarmachen
        "<"
    ).reverse();
    // Der Reverse-Befehl ist korrekt am Ende der Timeline.
}









//Cursor//

const dot = document.querySelector('.drip-drop');
const outline = document.querySelector('.drip-echo');

// Stellt sicher, dass die Elemente existieren
if (dot && outline) {
    let mouseX = 0, mouseY = 0;
    let outlineX = 0, outlineY = 0;
    let lastX = 0, lastY = 0;

    // 💡 KORREKTUR: DELAY ERHÖHT (Mehr als 0.04)
    // Ein höherer Wert (z.B. 0.12) reduziert das "Hinterherhängen"
    const delay = 0.12;

    // Variablen für die Glättung des Stretches (unverändert)
    let currentSpeed = 0;
    const speedLerpFactor = 0.15;
    const speedThreshold = 40;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        // Dot folgt sofort
        dot.style.top = mouseY + 'px';
        dot.style.left = mouseX + 'px';
    });

    function animate() {
        // 1. Nachziehen des Outline (Echo)
        // Die Bewegung wird direkter, da 'delay' höher ist
        outlineX += (mouseX - outlineX) * delay;
        outlineY += (mouseY - outlineY) * delay;

        outline.style.top = outlineY + 'px';
        outline.style.left = outlineX + 'px';

        // 2. Berechnung von Geschwindigkeit, Winkel und Dehnung
        // Wir verwenden die geglättete Outline-Position für die Berechnung
        const dx = outlineX - lastX;
        const dy = outlineY - lastY;
        const speed = Math.sqrt(dx*dx + dy*dy);

        // Glättung der Geschwindigkeit
        currentSpeed += (speed - currentSpeed) * speedLerpFactor;

        // Winkel der Bewegung (in Radiant)
        const angle = Math.atan2(dy, dx);

        // Morph-Effekt: Dehnung und Kompression basierend auf der GLEICHMÄSSIGEN Geschwindigkeit
        const maxStretch = 0.5;
        const maxCompress = 0.2;

        const stretch = 1 + Math.min(currentSpeed / speedThreshold, maxStretch);
        const compress = 1 - Math.min(currentSpeed / speedThreshold, maxCompress);

        const scaleX = stretch;
        const scaleY = compress;

        // 3. Transformation anwenden: translate -> rotate -> scale
        outline.style.transform = `translate(-50%, -50%) rotate(${angle}rad) scale(${scaleX}, ${scaleY})`;

        lastX = outlineX;
        lastY = outlineY;

        requestAnimationFrame(animate);
    }

    animate();

    // --- Hover-Logik (unverändert) ---
    const hoverableElements = document.querySelectorAll(
        'a, button, input[type="submit"], input[type="button"], input[type="reset"], [role="button"], [onclick], [tabindex]:not([tabindex="-1"])'
    );

    hoverableElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            dot.classList.add('is-hovering');
            outline.classList.add('is-hovering');
        });
        el.addEventListener('mouseleave', () => {
            dot.classList.remove('is-hovering');
            outline.classList.remove('is-hovering');
        });
    });
}

const body = document.body;
const pondButton = document.getElementById('pond');
// Wählen Sie das Hauptelement, das die Klasse 'active' bekommt, um den Zustand zu prüfen
const menuElement = document.querySelector('.navi'); // Oder das Branding-Element

if (pondButton && menuElement) {
    pondButton.addEventListener('click', () => {

        // 1. Menü öffnen/schließen (muss als erstes passieren, um den Zustand zu ändern)
        menuElement.classList.toggle('active');
        // Fügen Sie hier alle anderen Klassen-Toggles für das Menü hinzu (z.B. haze.classList.toggle('active'))

        // 2. Zustand prüfen und Z-Index steuern
        if (menuElement.classList.contains('active')) {
            // MENÜ WIRD GEÖFFNET:
            // Der Grain Z-Index muss sofort hochgesetzt werden
            body.classList.add('overlay-active');
        } else {
            // MENÜ WIRD GESCHLOSSEN:
            // Wir warten 1500 Millisekunden (1.5 Sekunden), bevor der Grain Z-Index zurückgesetzt wird
            setTimeout(() => {
                body.classList.remove('overlay-active');
            }, 1500); // 1500ms = 1.5 Sekunden
        }
    });
}