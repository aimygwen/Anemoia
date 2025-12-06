document.addEventListener('DOMContentLoaded', () => {

    const video = document.getElementById('galleryVideo');
    const playerContainer = document.getElementById('videoPlayer');
    const currentVideoContainer = document.getElementById('currentVideo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    const videoSources = [
        './films/mov1.mp4',
        './films/mov2.mp4',
        './films/mov3.mp4',
    ];
    let currentVideoIndex = 0;

    function toggleJitter(start) {
        if (start) {
            playerContainer.classList.add('is-jittering');
            playerContainer.classList.add('is-active');
        } else {
            setTimeout(() => {
                playerContainer.classList.remove('is-jittering');
                playerContainer.classList.remove('is-active');
            }, 300);
        }
    }

    const createDigitStrip = (initialValue) => {
        const animatedSpan = document.createElement('span');
        animatedSpan.className = 'animated-num';

        let digitsHtml = '';
        for (let i = 0; i <= 9; i++) {
            digitsHtml += `<div style="height: 1em; display: flex; align-items: center; justify-content: center;">${i}</div>`;
        }
        animatedSpan.innerHTML = digitsHtml;

        animatedSpan.style.transform = `translateY(${-initialValue}em)`;

        return animatedSpan;
    };

    function rollDigit(element, newDigit) {
        const digitIndex = parseInt(newDigit, 10);
        const newY = -digitIndex;

        element.style.transform = `translateY(${newY}em)`;
    }

    function updateVideo(index) {
        if (index >= videoSources.length) {
            currentVideoIndex = 0;
        } else if (index < 0) {
            currentVideoIndex = videoSources.length - 1;
        } else {
            currentVideoIndex = index;
        }

        const newNumString = String(currentVideoIndex + 1).padStart(2, '0');
        toggleJitter(true);

        const digitWrappers = currentVideoContainer.querySelectorAll('.digit-wrapper .animated-num');
        for (let i = 0; i < newNumString.length; i++) {
            const digit = newNumString[i];
            const animatedElement = digitWrappers[i];

            if (animatedElement) {
                rollDigit(animatedElement, digit);
            }
        }

        setTimeout(() => {
            video.src = videoSources[currentVideoIndex];
            video.load();
        }, 150);
    }

    video.addEventListener('loadeddata', () => {
        video.play();
        toggleJitter(false);
    });

    prevBtn.addEventListener('click', () => updateVideo(currentVideoIndex - 1));
    nextBtn.addEventListener('click', () => updateVideo(currentVideoIndex + 1));


    const initialNumString = String(currentVideoIndex + 1).padStart(2, '0');
    currentVideoContainer.innerHTML = '';

    for (let i = 0; i < initialNumString.length; i++) {
        const digitValue = initialNumString[i];

        const wrapperSpan = document.createElement('span');
        wrapperSpan.className = 'digit-wrapper';

        const strip = createDigitStrip(parseInt(digitValue, 10));
        wrapperSpan.appendChild(strip);
        currentVideoContainer.appendChild(wrapperSpan);
    }

    const totalNum = String(videoSources.length).padStart(2, '0');
    document.getElementById('totalVideos').textContent = ` /${totalNum}`;

    video.src = videoSources[currentVideoIndex];
    video.load();
    video.play();
});
