// ===================================
// 1. LENIS SMOOTH SCROLLING
// ===================================
const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    direction: 'vertical',
    gestureDirection: 'vertical',
    smoothTouch: true,
});

function raf(time) {
    lenis.raf(time);

    // 🔥 CRITICAL FIX: Ensure GSAP ScrollTrigger updates on every frame
    // to sync with the smooth scrolling library (Lenis).
    if (window.ScrollTrigger) {
        ScrollTrigger.update();
    }

    requestAnimationFrame(raf);
}

requestAnimationFrame(raf);

// ===================================
// 2. UNIFIED PARALLAX LOGIC (Linked to Lenis)
// ===================================
const parallaxElements = document.querySelectorAll('[data-speed]');

// This function receives the current scroll position from Lenis
function applyParallax(scrollPosition) {

    parallaxElements.forEach(element => {
        const speedAttr = element.getAttribute('data-speed');
        if (!speedAttr) return; // Skip if somehow data-speed is missing

        // const speed = parseFloat(speedAttr); // <-- Original speed calculation is ignored for the test

        // 🎯 DEBUGGING CHANGE: Use a fixed, obvious parallax speed (0.5)
        // to clearly see if the transform is applied.
        const speed = 0.5;

        // Calculate the vertical movement (yOffset)
        const yOffset = scrollPosition * (1 - speed);

        let transformString = `translateY(${yOffset}px)`;

        // Check for elements that require horizontal centering (translateX(-50%))
        if (element.classList.contains('signature') || element.classList.contains('headline')) {
            transformString = `translateX(-50%) translateY(${yOffset}px)`;
        }

        // Apply the transformation
        element.style.transform = transformString;

        // 🚨 DEBUGGING CHANGE: Add a visible red border to confirm element selection
        element.style.border = '2px solid red';
    });
}

// CRITICAL: Hook the parallax function directly into the Lenis scroll event
lenis.on('scroll', (event) => {
    // Pass the current scroll position (event.scroll) to the parallax function
    applyParallax(event.scroll);
});

// Führe Parallax einmal beim Laden aus (Scroll-Position 0)
applyParallax(0);

// ===================================
// 3. GSAP/SCROLLTRIGGER FOR QUOTE IMAGE (.quotes)
// ===================================
// Ensure this runs only after GSAP is loaded
if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    // Setup the parallax for the fixed quote image (.quotes)
    gsap.to(".quotes", {
        // Move the image up by 15% of the viewport height during the scroll
        y: "-15vh",
        ease: "none",
        scrollTrigger: {
            trigger: ".quote-wrapper", // The container that defines the start/end of the movement
            start: "top bottom",       // Start when the trigger enters the viewport from the bottom
            end: "bottom top",         // End when the trigger leaves the viewport at the top
            scrub: 1,                  // Links the animation smoothly to the scrollbar (1 second delay)
        }
    });
}


// ===================================
// 4. HOVER LOGIK (Work Items)
// ===================================
// NOTE: I am assuming you have an element with ID="preview-image" in your HTML
// if this functionality is still desired, otherwise this section can be removed.
const workItems = document.querySelectorAll('.work-item');
const previewImage = document.getElementById('preview-image');

workItems.forEach(item => {
    item.addEventListener('mouseenter', () => {
        if (previewImage) {
            const previewSrc = item.getAttribute('data-preview');
            // Assuming data-preview is used, if not, adjust the source.
            if (previewSrc) {
                previewImage.src = previewSrc;
                previewImage.style.opacity = 1;
            }
        }
    });

    item.addEventListener('mouseleave', () => {
        if (previewImage) {
            previewImage.style.opacity = 0;
        }
    });
});


