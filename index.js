const title = document.querySelector(".title-name");

const text = title.textContent.trim();
const style = getComputedStyle(title);

const canvas = document.createElement("canvas");
canvas.className = "pixel-canvas";

const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

title.parentElement.appendChild(canvas);

// Match font exactly
const fontSize = parseFloat(style.fontSize);
const fontFamily = style.fontFamily;
const fontWeight = style.fontWeight;

ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

// Measure text
const metrics = ctx.measureText(text);
const padding = 40;

canvas.width = metrics.width + padding;
canvas.height = fontSize * 1.2 + padding;

// Position canvas
canvas.style.width = canvas.width + "px";
canvas.style.height = canvas.height + "px";

let pixelScale = 14;
const minScale = 1;
const speed = 0.4;

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const w = canvas.width / pixelScale;
    const h = canvas.height / pixelScale;

    ctx.save();
    ctx.scale(1 / pixelScale, 1 / pixelScale);

    ctx.fillStyle = style.color || "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

    ctx.fillText(text, w / 2, h / 2);
    ctx.restore();

    if (pixelScale > minScale) {
        pixelScale -= speed;
        requestAnimationFrame(draw);
    } else {
        // Reveal real text, remove canvas
        title.style.color = style.color || "#fff";
        canvas.remove();
    }
}

draw();
