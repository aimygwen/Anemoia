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

    // Verzögerung für das "Hinterherziehen" der Outline (Echo)
    const delay = 0.12;

    // Variablen für die Glättung des Stretches
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

    // ==========================================================
    // KLICK-LOGIK
    // ==========================================================

    // Maustaste gedrückt halten (MouseDown)
    document.addEventListener('mousedown', () => {
        dot.classList.add('is-clicked');
        outline.classList.add('is-clicked');
    });

    // Maustaste losgelassen (MouseUp)
    document.addEventListener('mouseup', () => {
        dot.classList.remove('is-clicked');
        outline.classList.remove('is-clicked');
    });

    // ==========================================================
    // ENDE KLICK-LOGIK
    // ==========================================================

    function animate() {
        // 1. Nachziehen des Outline (Echo)
        outlineX += (mouseX - outlineX) * delay;
        outlineY += (mouseY - outlineY) * delay;

        outline.style.top = outlineY + 'px';
        outline.style.left = outlineX + 'px';

        // 2. Berechnung von Geschwindigkeit, Winkel und Dehnung
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

    // --- Hover-Logik (KORREKTUR: .sound-button hinzugefügt) ---
    const hoverableElements = document.querySelectorAll(
        'a, button, input[type="submit"], input[type="button"], input[type="reset"], [role="button"], [onclick], [tabindex]:not([tabindex="-1"]), .sound-button' // <-- Hinzugefügt!
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














// ... (Ihr PondButton/Menu-Logik bleibt unverändert) ...
const body = document.body;
const pondButton = document.getElementById('pond');
const menuElement = document.querySelector('.navi');

if (pondButton && menuElement) {
    pondButton.addEventListener('click', () => {

        menuElement.classList.toggle('active');

        if (menuElement.classList.contains('active')) {
            body.classList.add('overlay-active');
        } else {
            setTimeout(() => {
                body.classList.remove('overlay-active');
            }, 1500);
        }
    });
}
















document.addEventListener("DOMContentLoaded", () => {
    const button = document.querySelector(".sound-button");
    const canvas = button.querySelector("canvas");
    const audio = button.querySelector("#audio");
    const ctx = canvas.getContext("2d");

    // Set canvas pixels
    function resizeCanvas() {
        canvas.width = canvas.offsetWidth * 2;
        canvas.height = canvas.offsetHeight * 2;
        ctx.scale(2, 2);
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    let isPlaying = false;
    let time = 0;

    const INACTIVE_AMPLITUDE = 2;
    const ACTIVE_AMPLITUDE = 30;

    let targetAmplitude = INACTIVE_AMPLITUDE;
    let currentAmplitude = targetAmplitude;

    function drawWave() {
        ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

        const w = canvas.offsetWidth;
        const h = canvas.offsetHeight;
        const midY = h / 2;

        // Smooth transition logic
        targetAmplitude = isPlaying ? ACTIVE_AMPLITUDE : INACTIVE_AMPLITUDE;
        const easeRate = 0.05;
        currentAmplitude += (targetAmplitude - currentAmplitude) * easeRate;

        // Shared Drawing Parameters
        const points = 200;
        const frequency = 0.05; // Amount of waves
        const speed = 0.05; // Base wave movement speed

        // --- 🌊 1. DRAW THE BACKGROUND (BLURRED) WAVE ---

        // Determine background opacity (max 20%) based on currentAmplitude for smooth fade
        const maxOpacity = 0.2;
        const opacity = Math.min(maxOpacity, (currentAmplitude - INACTIVE_AMPLITUDE) / (ACTIVE_AMPLITUDE - INACTIVE_AMPLITUDE) * maxOpacity * 2);

        // Set stroke style with calculated opacity
        ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;

        if (opacity > 0.01) { // Only draw if visible
            ctx.shadowBlur = 8;
            ctx.shadowColor = "#ffffff";

            // Slightly smaller amplitude
            const backgroundAmplitude = currentAmplitude * 0.2;

            // 💡 ADJUSTMENT 1: Increase the phase offset to make it look delayed
            const offset = 0.5;

            // 💡 ADJUSTMENT 2: Use a slightly slower speed for the time component
            const backgroundSpeed = speed * 0.75; // 75% of the main wave's speed

            ctx.beginPath();

            for (let i = 0; i <= points; i++) {
                const x = (w / points) * i;

                // Wave calculation using the new offset and slower speed
                const y = midY + Math.sin(i * frequency + time * backgroundSpeed + offset) * backgroundAmplitude;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // --- 🔪 2. DRAW THE FOREGROUND (SHARP) WAVE ---

        // Reset blur and opacity for the foreground wave
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#333333";
        ctx.lineWidth = 1.5;

        ctx.beginPath();

        for (let i = 0; i <= points; i++) {
            const x = (w / points) * i;
            // Original wave calculation using base speed
            const y = midY + Math.sin(i * frequency + time * speed) * currentAmplitude;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        time++;
        requestAnimationFrame(drawWave);
    }

    drawWave();

    canvas.addEventListener("click", () => {
        if (isPlaying) {
            audio.pause();
        } else {
            audio.currentTime = 0;
            audio.play();
        }
        isPlaying = !isPlaying;
    });
});













