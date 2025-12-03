// ===================================
// 1. LENIS SMOOTH SCROLLING
// ===================================
const lenis = new Lenis({
    duration: 1.2,     // Wie langsam/smooth das Scrolling ist
    easing: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t), // Sanfte Easing-Funktion
    direction: 'vertical',
    gestureDirection: 'vertical',
    smoothTouch: false,
});

function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}

requestAnimationFrame(raf);


// ===================================
// 2. PARALLAX LOGIK (Jetzt auf Lenis basierend)
// ===================================
function applyParallax(scrollPosition) {
    const parallaxElements = document.querySelectorAll('[data-speed]');

    parallaxElements.forEach(element => {
        const speed = parseFloat(element.getAttribute('data-speed'));
        const yOffset = scrollPosition * (1 - speed);

        // Horizontale Zentrierung nur für die entsprechenden Elemente
        let horizontalAdjustment = '';

        // KORREKTUR: Die 'signature'-Klasse wurde entfernt, da sie in den CSS-Stilen
        // NICHT links: 50% und somit NICHT translateX(-50%) benötigt.
        if (element.classList.contains('headline') || element.classList.contains('intro')) {
            horizontalAdjustment = 'translateX(-50%)';
        }

        element.style.transform = `${horizontalAdjustment} translateY(${yOffset}px)`;
    });
}

// Ersetzt den window.addEventListener('scroll', ...)
lenis.on('scroll', (event) => {
    // Ruft applyParallax mit der Lenis-Scroll-Position auf
    applyParallax(event.scroll);
});

// Führe Parallax einmal beim Laden aus (Scroll-Position 0)
applyParallax(0);


// ===================================
// 3. HOVER LOGIK (Work Items)
// ===================================
const workItems = document.querySelectorAll('.work-item');
const previewImage = document.getElementById('preview-image');

workItems.forEach(item => {
    item.addEventListener('mouseenter', () => {
        const previewSrc = item.getAttribute('data-preview');
        previewImage.src = previewSrc;
        previewImage.style.opacity = 1; // Vorschau-Bild einblenden
    });

    item.addEventListener('mouseleave', () => {
        previewImage.style.opacity = 0; // Vorschau-Bild ausblenden
        // previewImage.src = 'placeholder.jpg'; // Optionale Rückkehr zum Default-Bild
    });
});