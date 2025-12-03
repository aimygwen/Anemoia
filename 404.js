document.addEventListener("DOMContentLoaded", () => {
    const buttons = document.querySelectorAll(".next-button");
    // Stellen Sie sicher, dass dies der Dauer der CSS-Animation entspricht (0.4s = 400ms)
    const GLITCH_DURATION_MS = 400;

    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            const currentPage = btn.closest(".labyrinth-page");
            const nextPageNumber = btn.dataset.next;
            const nextPage = document.querySelector(`.labyrinth-page[data-page="${nextPageNumber}"]`);

            if (!nextPage || currentPage.classList.contains('glitching')) return;

            // Verhindert mehrfache Klicks während der Animation
            currentPage.classList.add('glitching');

            // 1. ALTE SEITE GLITCHT HERAUS
            currentPage.classList.add("glitch-out");

            // 2. WARTEN SIE AUF DAS ENDE DER GLITCH-OUT-ANIMATION
            setTimeout(() => {

                // Entfernen Sie die alte Seite
                currentPage.classList.remove("active");
                currentPage.classList.remove("glitch-out");
                currentPage.classList.remove("glitching"); // Freigabe für zukünftige Klicks

                // 3. NEUE SEITE GLITCHT HINEIN
                nextPage.classList.add("active");

                // Da die neue Seite die Klasse "active" erhält, löst sie die glitchIn-Animation aus
                // Fügen Sie hier einen Timer hinzu, um sicherzustellen, dass die neue Seite nicht sofort wieder glitchen kann
                setTimeout(() => {
                    nextPage.classList.remove('glitching');
                }, GLITCH_DURATION_MS);

            }, GLITCH_DURATION_MS);
        });
    });
});