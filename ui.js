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

gsap.set(".branding", { visibility: "hidden" });

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
    const naviContent = ".branding-content";


    gsap.set(naviContent, {
        filter: 'blur(10px)',
        opacity: 0,
        scale: 1.05,
        y: 20,
        willChange: 'transform, opacity, filter'
    });


    brandingTl.to(".branding", 0.01, { visibility: "visible" });

    brandingTl.to(
        naviContent,
        0.8,
        {
            filter: 'blur(0px)',
            y: 0,
            opacity: 1,
            scale: 1,
            ease: "expo.out",
        },
        "<"
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
            ctx.shadowColor = "#ffffff";


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
        ctx.strokeStyle = "#333333";
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













