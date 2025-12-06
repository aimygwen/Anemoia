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


    const body = document.body;

    pond.onclick = function (e) {
        body.classList.toggle('no-scroll');

        haze.classList.toggle("active");
        mark.classList.toggle("active");

        tl.reversed(!tl.reversed());
    };
}

revealnavi();

function revealnaviitems() {
    const power4 = "power4.inOut";
    const naviLinks = ".main-container a, .side-container a";

    gsap.set(naviLinks, {
        filter: 'blur(10px)',
        opacity: 0,
        y: 50,
        scale: 1.8,
        display: 'inline-block',
        transformOrigin: 'center center',
        willChange: 'transform, opacity'
    });

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

    tl.to(
        naviLinks,
        1.25,
        {
            y: 0,
            filter: 'blur(0px)',
            opacity: 1,
            scale: 1,
            ease: "power3.out",
            stagger: {
                amount: 0.8,
                from: "start"
            },
        },
        "-=1"
    ).reverse();
}










const brandingTl = gsap.timeline({ paused: true });

function revealbrandingnavi() {
    revealbrandingContent();

    const haze = document.querySelector('.haze');
    const pond = document.getElementById("brand");
    const body = document.body;

    pond.onclick = function (e) {
        body.classList.toggle('no-scroll');
        haze.classList.toggle("active");
        pond.classList.toggle("active");

        if (brandingTl.reversed()) {
            body.classList.add('overlay-active');
        } else {
            setTimeout(() => {
                body.classList.remove('overlay-active');
            }, 1500);
        }

        brandingTl.reversed(!brandingTl.reversed());
    };
}

revealbrandingnavi();

function revealbrandingContent() {
    const contentElements = [
        '.branding-name',
        '.branding .signature',
        '.branding-info',
        '.branding-rights',
        '.branding-year'
    ];

    const portrait = '.branding .portrait';

    gsap.set(contentElements, {
        filter: 'blur(10px)',
        opacity: 0,
        y: 30,
        willChange: 'transform, opacity, filter'
    });

    gsap.set(portrait, {
        opacity: 0,
        y: 100,
        willChange: 'transform, opacity'
    });


    brandingTl.to(".branding", 0.01, { visibility: "visible" });

    brandingTl.to(
        portrait,
        0.8,
        {
            opacity: 1,
            y: 0,
            ease: "expo.out",
        },
        "<"
    );

    brandingTl.to(
        [
            '.branding-name',
            '.branding .signature',
            '.branding-info'
        ],
        0.7,
        {
            filter: 'blur(0px)',
            opacity: 1,
            y: 0,
            ease: "power3.out",
            stagger: 0.1
        },
        "-=0.5"
    );

    brandingTl.to(
        [
            '.branding-rights',
            '.branding-year'
        ],
        0.5,
        {
            filter: 'blur(0px)',
            opacity: 1,
            y: 0,
            ease: "power2.out",
        },
        "-=0.3"
    ).reverse();
}










//Cursor//

const dot = document.querySelector('.drip-drop');
const outline = document.querySelector('.drip-echo');


if (dot && outline) {
    let mouseX = 0, mouseY = 0;
    let outlineX = 0, outlineY = 0;
    let lastX = 0, lastY = 0;

    const delay = 0.12;

    let currentSpeed = 0;
    const speedLerpFactor = 0.15;
    const speedThreshold = 40;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        dot.style.top = mouseY + 'px';
        dot.style.left = mouseX + 'px';
    });



    document.addEventListener('mousedown', () => {
        dot.classList.add('is-clicked');
        outline.classList.add('is-clicked');
    });

    document.addEventListener('mouseup', () => {
        dot.classList.remove('is-clicked');
        outline.classList.remove('is-clicked');
    });


    function animate() {
        outlineX += (mouseX - outlineX) * delay;
        outlineY += (mouseY - outlineY) * delay;

        outline.style.top = outlineY + 'px';
        outline.style.left = outlineX + 'px';

        const dx = outlineX - lastX;
        const dy = outlineY - lastY;
        const speed = Math.sqrt(dx*dx + dy*dy);

        currentSpeed += (speed - currentSpeed) * speedLerpFactor;

        const angle = Math.atan2(dy, dx);

        const maxStretch = 0.5;
        const maxCompress = 0.2;

        const stretch = 1 + Math.min(currentSpeed / speedThreshold, maxStretch);
        const compress = 1 - Math.min(currentSpeed / speedThreshold, maxCompress);

        const scaleX = stretch;
        const scaleY = compress;

        outline.style.transform = `translate(-50%, -50%) rotate(${angle}rad) scale(${scaleX}, ${scaleY})`;

        lastX = outlineX;
        lastY = outlineY;

        requestAnimationFrame(animate);
    }

    animate();

    const hoverableElements = document.querySelectorAll(
        'a, button, input[type="submit"], input[type="button"], input[type="reset"], [role="button"], [onclick], [tabindex]:not([tabindex="-1"]), .sound-button'
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

    function hexToRgb(hex) {
        const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });

        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    const rootStyles = getComputedStyle(document.documentElement);

    const WAVE_COLOR_DEFAULT_HEX = rootStyles.getPropertyValue('--ui').trim() || "#333333";
    const WAVE_COLOR_HOVER_HEX = rootStyles.getPropertyValue('--hover').trim() || "#FF00FF";
    const SHADOW_COLOR = rootStyles.getPropertyValue('--uifade').trim() || "#FFF";

    const DEFAULT_RGB = hexToRgb(WAVE_COLOR_DEFAULT_HEX);
    const HOVER_RGB = hexToRgb(WAVE_COLOR_HOVER_HEX);

    let colorState = { ...DEFAULT_RGB };
    let targetColorRGB = DEFAULT_RGB;

    const COLOR_EASE_RATE = 0.08;

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
        colorState.r += (targetColorRGB.r - colorState.r) * COLOR_EASE_RATE;
        colorState.g += (targetColorRGB.g - colorState.g) * COLOR_EASE_RATE;
        colorState.b += (targetColorRGB.b - colorState.b) * COLOR_EASE_RATE;

        const interpolatedColor = `rgb(${Math.round(colorState.r)}, ${Math.round(colorState.g)}, ${Math.round(colorState.b)})`;

        ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

        const w = canvas.offsetWidth;
        const h = canvas.offsetHeight;
        const midY = h / 2;

        targetAmplitude = isPlaying ? ACTIVE_AMPLITUDE : INACTIVE_AMPLITUDE;
        const easeRate = 0.05;
        currentAmplitude += (targetAmplitude - currentAmplitude) * easeRate;

        const points = 200;
        const frequency = 0.05;
        const speed = 0.05;

        const maxOpacity = 0.2;
        const opacity = Math.min(maxOpacity, (currentAmplitude - INACTIVE_AMPLITUDE) / (ACTIVE_AMPLITUDE - INACTIVE_AMPLITUDE) * maxOpacity * 2);

        ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;

        if (opacity > 0.01) {
            ctx.shadowBlur = 8;
            ctx.shadowColor = SHADOW_COLOR;

            const backgroundAmplitude = currentAmplitude * 0.2;
            const offset = 0.5;
            const backgroundSpeed = speed * 0.75;

            ctx.beginPath();
            for (let i = 0; i <= points; i++) {
                const x = (w / points) * i;
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

        ctx.shadowBlur = 0;
        ctx.strokeStyle = interpolatedColor;
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
            const x = (w / points) * i;
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

    button.addEventListener("mouseenter", () => {
        targetColorRGB = HOVER_RGB;
    });

    button.addEventListener("mouseleave", () => {
        targetColorRGB = DEFAULT_RGB;
    });

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













