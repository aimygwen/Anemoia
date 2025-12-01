document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('galleryVideo');
    const playerContainer = document.getElementById('videoPlayer');
    const counterDisplay = document.getElementById('videoCounter');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    // Liste Ihrer Videodateien (ersetzen Sie die Pfade)
    const videoSources = [
        './assets/video-1.mp4',
        './assets/video-2.mp4',
        './assets/video-3.mp4'
    ];
    let currentVideoIndex = 0;

    // Funktion zum Aktualisieren des Videos und des Zählers
    function updateVideo(index) {
        // Sicherstellen, dass der Index im gültigen Bereich bleibt
        if (index >= videoSources.length) {
            currentVideoIndex = 0; // Zurück zum ersten Video (Loop)
        } else if (index < 0) {
            currentVideoIndex = videoSources.length - 1; // Zum letzten Video
        } else {
            currentVideoIndex = index;
        }

        // 1. Video-Quelle ändern
        video.src = videoSources[currentVideoIndex];
        video.load(); // Lädt die neue Quelle
        video.play();

        // 2. Zähler aktualisieren (z.B. 01 / 03)
        const currentNum = String(currentVideoIndex + 1).padStart(2, '0');
        const totalNum = String(videoSources.length).padStart(2, '0');
        counterDisplay.textContent = `${currentNum} / ${totalNum}`;
    }

    // Funktion zum Starten/Stoppen des Jitter-Effekts
    function toggleJitter(start) {
        if (start) {
            playerContainer.classList.add('is-jittering');
        } else {
            // Optional: Nach einer kurzen Verzögerung stoppen
            setTimeout(() => {
                playerContainer.classList.remove('is-jittering');
            }, 100);
        }
    }


    // --- EVENT LISTENER ---

    nextBtn.addEventListener('click', () => {
        updateVideo(currentVideoIndex + 1);
        toggleJitter(true);
    });

    prevBtn.addEventListener('click', () => {
        updateVideo(currentVideoIndex - 1);
        toggleJitter(true);
    });

    // Stoppt den Jitter nach dem Video-Wechsel (für das nächste Video)
    video.addEventListener('loadeddata', () => {
        toggleJitter(false);
    });

    // Initialisierung beim Laden
    updateVideo(0);
});

// --- JavaScript Update ---

document.addEventListener('DOMContentLoaded', () => {
    // ... (Andere Konstanten) ...

    // NEU: Selektieren der beiden neuen Span-Elemente
    const currentVideo = document.getElementById('currentVideo');
    const totalVideos = document.getElementById('totalVideos');

    // ... (videoSources bleibt gleich) ...
    let currentIndex = 0;

    // --- A. HELFER FUNKTIONEN ---

    // Aktualisierte Formatierung
    const formatCounter = (index) => {
        const current = String(index + 1).padStart(2, '0');
        const total = String(videoSources.length).padStart(2, '0');
        return { current, total: ` / ${total}` }; // Gibt ein Objekt zurück
    };

    // Aktualisiert Videoquelle, Zähler und LINK-URL
    const updateGallery = (index) => {
        currentIndex = (index + videoSources.length) % videoSources.length;
        const currentAsset = videoSources[currentIndex];

        // ... (Video- und Link-Aktualisierung) ...

        // 3. Zähler aktualisieren
        const counterParts = formatCounter(currentIndex);
        currentVideo.textContent = counterParts.current;  // NEU: Setzt nur die aktuelle Zahl
        totalVideos.textContent = counterParts.total;    // NEU: Setzt '/ 03'

        // ... (Jitter-Effekt starten) ...
    };

    // Initialisierung beim Laden (Wichtig, um die Gesamtanzahl korrekt zu setzen)
    const initialParts = formatCounter(currentIndex);
    totalVideos.textContent = initialParts.total;
    updateGallery(currentIndex);

    // ... (Restliche Navigation und Jitter-Logik) ...
});