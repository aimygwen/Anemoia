(function () {
    var QUOTES = [
        "The art of creation thrives on the boundaries it fights to break.",
    ];

    var FONT_FAMILY = "Jelek";
    var INK = "#ececea";

    var reveal = document.getElementById("reveal");
    var inkCanvas = document.getElementById("reveal-ink");
    var srText = document.getElementById("reveal-quote-sr");
    var startBtn = document.getElementById("reveal-start");
    var demoMain = document.getElementById("demo-main");
    var resetBtn = document.getElementById("reveal-reset");

    if (!reveal || !inkCanvas) return;

    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var inkCtx = null;
    var activeFontSize = 48;
    var activeLayout = null;
    var currentQuote = "";
    var isWriting = false;
    var writeGeneration = 0;
    var resizeTimer = null;

    function pickQuote() {
        return QUOTES[Math.floor(Math.random() * QUOTES.length)];
    }

    function sleep(ms) {
        return new Promise(function (resolve) {
            setTimeout(resolve, ms);
        });
    }

    function hashSeed(str) {
        var h = 2166136261;
        for (var i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    function mulberry32(a) {
        return function () {
            a |= 0;
            a = (a + 0x6d2b79f5) | 0;
            var t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function fontString(size) {
        return size + 'px "' + FONT_FAMILY + '", monospace';
    }

    function getViewportLayout() {
        var vw = window.innerWidth;
        var vh = window.innerHeight;
        var vmin = Math.min(vw, vh);
        var cssW = Math.min(vw * (vw < 480 ? 0.9 : 0.94), 1400);
        var maxLineWidth = cssW * 0.96;
        var maxHeight = vh * (vw < 480 ? 0.62 : 0.68);
        var minSize = vw < 380 ? 18 : 22;
        var maxSize = Math.min(120, Math.max(minSize, Math.round(vmin * (vw < 480 ? 0.1 : 0.12))));

        return {
            cssW: cssW,
            maxLineWidth: maxLineWidth,
            maxHeight: maxHeight,
            maxSize: maxSize,
            minSize: minSize,
        };
    }

    async function ensureJelekLoaded(size) {
        if (!document.fonts) return;
        try {
            await document.fonts.load("16px " + FONT_FAMILY);
            await document.fonts.load(fontString(size));
            await document.fonts.ready;
        } catch (e) {
            /* continue — canvas will use fallback if needed */
        }
    }

    function measureLines(text, fontSize, maxWidth) {
        var probe = document.createElement("canvas").getContext("2d");
        probe.imageSmoothingEnabled = false;
        probe.font = fontString(fontSize);

        var lines = [];
        var words = text.split(" ");
        var line = [];
        var lineW = 0;
        var letterSpacing = fontSize * 0.1;
        var longest = 0;

        words.forEach(function (word, wi) {
            var wordW = 0;
            var chars = [];
            for (var i = 0; i < word.length; i++) {
                var ch = word[i];
                var w = Math.max(probe.measureText(ch).width, fontSize * 0.35) + letterSpacing;
                wordW += w;
                chars.push({ char: ch, width: w });
            }
            var gap = line.length ? letterSpacing * 2.2 : 0;
            var spaceW = Math.max(probe.measureText(" ").width, fontSize * 0.22) + letterSpacing;
            var addSpace = wi > 0 && line.length;
            var addW = lineW + gap + (addSpace ? spaceW : 0) + wordW;
            if (line.length && addW > maxWidth) {
                longest = Math.max(longest, lineW);
                lines.push(line);
                line = [];
                lineW = 0;
                gap = 0;
                addSpace = false;
            }
            if (addSpace) {
                line.push({ char: " ", width: spaceW });
                lineW += spaceW;
            } else if (line.length) {
                lineW += gap;
            }
            chars.forEach(function (c) {
                line.push(c);
                lineW += c.width;
            });
        });
        if (line.length) {
            longest = Math.max(longest, lineW);
            lines.push(line);
        }

        var lineHeight = fontSize * 1.38;
        return {
            lines: lines,
            lineHeight: lineHeight,
            height: lines.length * lineHeight + fontSize * 0.85,
            fontSize: fontSize,
            longest: longest,
        };
    }

    function fitFontSize(text, maxWidth, maxHeight, minSize, maxSize) {
        var lo = minSize;
        var hi = maxSize;
        var best = lo;

        while (lo <= hi) {
            var mid = Math.floor((lo + hi) / 2);
            var layout = measureLines(text, mid, maxWidth);
            if (layout.longest <= maxWidth && layout.height <= maxHeight) {
                best = mid;
                lo = mid + 1;
            } else {
                hi = mid - 1;
            }
        }
        return best;
    }

    function buildLayout(text) {
        var vp = getViewportLayout();
        var fontSize = fitFontSize(text, vp.maxLineWidth, vp.maxHeight, vp.minSize, vp.maxSize);
        var layout = measureLines(text, fontSize, vp.maxLineWidth);

        while ((layout.longest > vp.maxLineWidth || layout.height > vp.maxHeight) && fontSize > vp.minSize) {
            fontSize -= 1;
            layout = measureLines(text, fontSize, vp.maxLineWidth);
        }

        layout.cssW = vp.cssW;
        return layout;
    }

    function setupInkCanvas(layout) {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var cssW = layout.cssW;
        var cssH = layout.height;
        inkCanvas.width = Math.round(cssW * dpr);
        inkCanvas.height = Math.round(cssH * dpr);
        inkCanvas.style.width = cssW + "px";
        inkCanvas.style.height = cssH + "px";
        inkCtx = inkCanvas.getContext("2d");
        inkCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        inkCtx.clearRect(0, 0, cssW, cssH);
        inkCtx.imageSmoothingEnabled = false;
        inkCtx.font = fontString(layout.fontSize);
        inkCtx.textBaseline = "alphabetic";
        inkCtx.fillStyle = INK;
        activeFontSize = layout.fontSize;
        activeLayout = layout;
        return layout;
    }

    function drawJelekLetter(ch, x, y, seed, progress) {
        var rng = mulberry32(seed);
        var wobbleX = (rng() - 0.5) * 2.2;
        var wobbleY = (rng() - 0.5) * 1.6;
        var w = Math.max(inkCtx.measureText(ch).width, activeFontSize * 0.35);
        var clipH = activeFontSize * 1.4;

        inkCtx.save();
        inkCtx.beginPath();
        inkCtx.rect(x - 2, y - activeFontSize * 0.95, (w + 4) * progress, clipH);
        inkCtx.clip();

        inkCtx.globalAlpha = 0.2;
        inkCtx.fillText(ch, x + wobbleX + 0.8, y + wobbleY + 0.5);
        inkCtx.globalAlpha = 0.38;
        inkCtx.fillText(ch, x + wobbleX - 0.6, y + wobbleY - 0.4);
        inkCtx.globalAlpha = 0.95;
        inkCtx.fillText(ch, x + wobbleX * 0.35, y + wobbleY * 0.25);

        inkCtx.restore();
    }

    function drawFullQuote(text, layout) {
        var y = layout.fontSize * 1.05;
        layout.lines.forEach(function (line) {
            var lineW = line.reduce(function (s, c) { return s + c.width; }, 0);
            var x = (layout.cssW - lineW) / 2;
            line.forEach(function (entry) {
                if (entry.char !== " ") {
                    inkCtx.fillText(entry.char, x, y);
                }
                x += entry.width;
            });
            y += layout.lineHeight;
        });
    }

    function animateLetter(ch, x, y, seed) {
        return new Promise(function (resolve) {
            var duration = Math.max(22, Math.min(58, 28 + (ch.charCodeAt(0) % 18)));
            var start = performance.now();

            function frame(now) {
                var t = Math.min(1, (now - start) / duration);
                var eased = 1 - Math.pow(1 - t, 2.4);
                drawJelekLetter(ch, x, y, seed, eased);
                if (t < 1) requestAnimationFrame(frame);
                else resolve();
            }

            requestAnimationFrame(frame);
        });
    }

    function pauseAfter(ch) {
        if (ch === ".") return 35 + Math.random() * 20;
        if (ch === ",") return 16 + Math.random() * 10;
        return 0;
    }

    async function writeQuote(text, generation) {
        if (srText) srText.textContent = text;
        currentQuote = text;

        var vp = getViewportLayout();
        await ensureJelekLoaded(vp.maxSize);

        var layout = buildLayout(text);
        await ensureJelekLoaded(layout.fontSize);
        setupInkCanvas(layout);

        if (reducedMotion) {
            drawFullQuote(text, layout);
            return;
        }

        var y = layout.fontSize * 1.05;
        var charIndex = 0;

        for (var li = 0; li < layout.lines.length; li++) {
            if (generation !== writeGeneration) return;
            var line = layout.lines[li];
            var lineW = line.reduce(function (s, c) { return s + c.width; }, 0);
            var x = (layout.cssW - lineW) / 2;

            for (var ci = 0; ci < line.length; ci++) {
                if (generation !== writeGeneration) return;
                var entry = line[ci];
                if (entry.char === " ") {
                    x += entry.width;
                    charIndex++;
                    continue;
                }
                var seed = hashSeed(text + charIndex);
                await animateLetter(entry.char, x, y, seed);
                x += entry.width;
                charIndex++;
                await sleep(pauseAfter(entry.char));
            }

            y += layout.lineHeight;
        }
    }

    function showStartButton() {
        if (!startBtn) return;
        startBtn.setAttribute("aria-hidden", "false");
        requestAnimationFrame(function () {
            startBtn.classList.add("is-visible");
        });
    }

    function hideStartButton() {
        if (!startBtn) return;
        startBtn.setAttribute("aria-hidden", "true");
        startBtn.classList.remove("is-visible");
    }

    async function reflowQuote() {
        if (!currentQuote || isWriting || reveal.hidden) return;

        var layout = buildLayout(currentQuote);
        await ensureJelekLoaded(layout.fontSize);
        setupInkCanvas(layout);
        drawFullQuote(currentQuote, layout);
    }

    function scheduleReflow() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(reflowQuote, 180);
    }

    async function runReveal() {
        writeGeneration += 1;
        var generation = writeGeneration;
        isWriting = true;

        document.body.classList.add("reveal-locked");
        reveal.classList.remove("is-exiting");
        reveal.hidden = false;
        demoMain.hidden = true;
        demoMain.classList.remove("is-visible");
        hideStartButton();

        await sleep(reducedMotion ? 80 : 350);
        await writeQuote(pickQuote(), generation);

        if (generation !== writeGeneration) return;

        isWriting = false;
        await sleep(reducedMotion ? 120 : 220);
        showStartButton();
    }

    function exitReveal() {
        reveal.classList.add("is-exiting");
        document.body.classList.remove("reveal-locked");
        setTimeout(function () {
            reveal.hidden = true;
            demoMain.hidden = false;
            requestAnimationFrame(function () {
                demoMain.classList.add("is-visible");
            });
        }, 1150);
    }

    if (startBtn) startBtn.addEventListener("click", exitReveal);
    if (resetBtn) {
        resetBtn.addEventListener("click", function () {
            demoMain.classList.remove("is-visible");
            setTimeout(runReveal, 300);
        });
    }

    window.addEventListener("resize", scheduleReflow);
    window.addEventListener("DOMContentLoaded", runReveal);
})();
