document.addEventListener("DOMContentLoaded", () => {
    const buttons = document.querySelectorAll(".next-button");
    const GLITCH_DURATION_MS = 450;

    // PROCEDURAL AUDIO SYNTHESIS: Glitch Static Hum/Crackle
    function playGlitchSound(isFinal = false) {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;
            
            const audioCtx = new AudioContextClass();
            const duration = isFinal ? 1.2 : 0.25; // longer sound for final shutdown
            const sampleRate = audioCtx.sampleRate;
            const bufferSize = sampleRate * duration;
            const buffer = audioCtx.createBuffer(1, bufferSize, sampleRate);
            const data = buffer.getChannelData(0);
            
            // 1. Generate Raw White Noise
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            
            // 2. Bandpass Filter for Analog/Radio Static Feel
            const filter = audioCtx.createBiquadFilter();
            filter.type = "bandpass";
            
            // 3. Dynamic Gain Envelope
            const gainNode = audioCtx.createGain();
            
            if (isFinal) {
                // Final Shutdown: Sweep filter frequency down and fade out slowly
                filter.frequency.setValueAtTime(1500, audioCtx.currentTime);
                filter.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + duration - 0.2);
                filter.Q.setValueAtTime(4, audioCtx.currentTime);
                
                gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
            } else {
                // Standard transition: Quick crackle burst
                filter.frequency.value = 1000 + Math.random() * 800; // randomized frequency
                filter.Q.value = 3;
                
                gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
            }
            
            source.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            source.start();
        } catch (err) {
            console.warn("Audio Context blocked or failed to initialize:", err);
        }
    }

    // TRANSITION LOGIC
    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            const currentPage = btn.closest(".labyrinth-page");
            const nextPageNumber = btn.dataset.next;
            
            if (!currentPage || currentPage.classList.contains("glitching")) return;
            
            currentPage.classList.add("glitching");

            // Handle Final Shutdown (Exit)
            if (nextPageNumber === "exit") {
                playGlitchSound(true);
                
                // Add fullscreen white-out overlay dynamically for a flash effect
                const whiteout = document.createElement("div");
                whiteout.style.position = "fixed";
                whiteout.style.inset = "0";
                whiteout.style.background = "#ffffff";
                whiteout.style.zIndex = "9999999";
                whiteout.style.opacity = "0";
                whiteout.style.pointerEvents = "none";
                whiteout.style.transition = "opacity 0.2s steps(2), background-color 0.8s ease-out";
                document.body.appendChild(whiteout);
                
                // Trigger flash and fade to black
                setTimeout(() => {
                    whiteout.style.opacity = "1";
                }, 50);

                setTimeout(() => {
                    whiteout.style.background = "#000000";
                }, 400);

                // Redirect to homepage after the sound completes
                setTimeout(() => {
                    window.location.href = "../index.html";
                }, 1200);
                
                return;
            }

            // Standard Page Transition
            const nextPage = document.querySelector(`.labyrinth-page[data-page="${nextPageNumber}"]`);
            if (!nextPage) {
                currentPage.classList.remove("glitching");
                return;
            }

            // Play transition static crackle
            playGlitchSound(false);

            // Glitch current page out
            currentPage.classList.add("glitch-out");

            setTimeout(() => {
                // Remove old page active classes
                currentPage.classList.remove("active", "glitch-out", "glitching");
                
                // Active and show the new page
                nextPage.classList.add("active");
                
                // Prevent immediate multi-clicks on next page
                nextPage.classList.add("glitching");
                setTimeout(() => {
                    nextPage.classList.remove("glitching");
                }, GLITCH_DURATION_MS);

            }, GLITCH_DURATION_MS);
        });
    });
});