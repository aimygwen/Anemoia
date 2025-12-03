document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENT SELECTIONS ---
    const video = document.getElementById('galleryVideo');
    const playerContainer = document.getElementById('videoPlayer'); // Needed for jitter class
    const currentVideoContainer = document.getElementById('currentVideo'); // Counter container
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    // --- DATA ---
    const videoSources = [
        './assets/video-1.mp4',
        './assets/video-2.mp4',
        './assets/video-3.mp4',
    ];
    let currentVideoIndex = 0; // Start at the first video (index 0)

    // ----------------------------------------------------
    // 1. HELPER FUNCTIONS: Jitter & Roll
    // ----------------------------------------------------

    // Function to start/stop the Jitter-Effekts (based on previous discussion)
    function toggleJitter(start) {
        if (start) {
            playerContainer.classList.add('is-jittering');
            playerContainer.classList.add('is-active');
        } else {
            // Stop the jitter after a short delay to cover the transition
            setTimeout(() => {
                playerContainer.classList.remove('is-jittering');
                playerContainer.classList.remove('is-active');
            }, 300);
        }
    }

    // Function to create the inner animated strip element (vertical stack of 0-9)
    const createDigitStrip = (initialValue) => {
        const animatedSpan = document.createElement('span');
        animatedSpan.className = 'animated-num';

        let digitsHtml = '';
        for (let i = 0; i <= 9; i++) {
            // IMPORTANT: The CSS relies on these inner divs to be 1em high
            digitsHtml += `<div style="height: 1em; display: flex; align-items: center; justify-content: center;">${i}</div>`;
        }
        animatedSpan.innerHTML = digitsHtml;

        // Position it to show the initial value
        // The Y translation must be in 'em' to match the digit height
        animatedSpan.style.transform = `translateY(${-initialValue}em)`;

        return animatedSpan;
    };

    // The rollDigit function: Calculates and applies the CSS transform
    function rollDigit(element, newDigit) {
        const digitIndex = parseInt(newDigit, 10);
        // Translate up by 1em per number (negative value)
        const newY = -digitIndex;

        element.style.transform = `translateY(${newY}em)`;
    }


    // ----------------------------------------------------
    // 2. MAIN FUNCTION: Update Video & Counter
    // ----------------------------------------------------
    function updateVideo(index) {
        // 1. Wrap index
        if (index >= videoSources.length) {
            currentVideoIndex = 0;
        } else if (index < 0) {
            currentVideoIndex = videoSources.length - 1;
        } else {
            currentVideoIndex = index;
        }

        const newNumString = String(currentVideoIndex + 1).padStart(2, '0');

        // 2. Start Glitch/Jitter (BEFORE changing the video source)
        toggleJitter(true);

        // 3. Update the Counter with the Roll Animation
        const digitWrappers = currentVideoContainer.querySelectorAll('.digit-wrapper .animated-num');

        // Iterate over the digits and trigger the roll
        for (let i = 0; i < newNumString.length; i++) {
            const digit = newNumString[i];
            const animatedElement = digitWrappers[i];

            if (animatedElement) {
                rollDigit(animatedElement, digit);
            }
        }

        // 4. Change the Video Source AFTER a short delay (during the glitch)
        setTimeout(() => {
            video.src = videoSources[currentVideoIndex];
            video.load();
        }, 150);
    }

    // ----------------------------------------------------
    // 3. EVENT LISTENERS
    // ----------------------------------------------------

    // Stoppt den Jitter und startet die Wiedergabe, sobald die neue Videoquelle geladen ist
    video.addEventListener('loadeddata', () => {
        video.play();
        toggleJitter(false); // Stop the glitch effect
    });

    // Navigation Button Handlers
    prevBtn.addEventListener('click', () => updateVideo(currentVideoIndex - 1));
    nextBtn.addEventListener('click', () => updateVideo(currentVideoIndex + 1));


    // ----------------------------------------------------
    // 4. INITIALIZATION (Runs once on page load)
    // ----------------------------------------------------

    const initialNumString = String(currentVideoIndex + 1).padStart(2, '0');
    currentVideoContainer.innerHTML = ''; // Clear existing content (essential)

    // Build the initial digit structure (e.g., '0' and '1' for video 1)
    for (let i = 0; i < initialNumString.length; i++) {
        const digitValue = initialNumString[i];

        const wrapperSpan = document.createElement('span');
        wrapperSpan.className = 'digit-wrapper';

        const strip = createDigitStrip(parseInt(digitValue, 10));
        wrapperSpan.appendChild(strip);
        currentVideoContainer.appendChild(wrapperSpan);
    }

    // Set the total count display
    const totalNum = String(videoSources.length).padStart(2, '0');
    document.getElementById('totalVideos').textContent = ` /${totalNum}`;

    // Initial load of the first video
    video.src = videoSources[currentVideoIndex];
    video.load();
    video.play();
});