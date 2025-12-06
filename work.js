const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    direction: 'vertical',
    gestureDirection: 'vertical',
    smoothTouch: false,
});

function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}

requestAnimationFrame(raf);


function applyParallax(scrollPosition) {
    const parallaxElements = document.querySelectorAll('[data-speed]');

    parallaxElements.forEach(element => {
        const speed = parseFloat(element.getAttribute('data-speed'));
        const yOffset = scrollPosition * (1 - speed);

        let horizontalAdjustment = '';

        if (element.classList.contains('headline') || element.classList.contains('intro')) {
            horizontalAdjustment = 'translateX(-50%)';
        }

        element.style.transform = `${horizontalAdjustment} translateY(${yOffset}px)`;
    });
}

lenis.on('scroll', (event) => {
    applyParallax(event.scroll);
});

applyParallax(0);


const workItems = document.querySelectorAll('.work-item');
const previewImage = document.getElementById('preview-image');

workItems.forEach(item => {
    item.addEventListener('mouseenter', () => {
        const previewSrc = item.getAttribute('data-preview');
        previewImage.src = previewSrc;
        previewImage.style.opacity = 1;
    });

    item.addEventListener('mouseleave', () => {
        previewImage.style.opacity = 0;
    });
});
