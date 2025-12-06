document.addEventListener("DOMContentLoaded", () => {
    const buttons = document.querySelectorAll(".next-button");
    const GLITCH_DURATION_MS = 400;

    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            const currentPage = btn.closest(".labyrinth-page");
            const nextPageNumber = btn.dataset.next;
            const nextPage = document.querySelector(`.labyrinth-page[data-page="${nextPageNumber}"]`);

            if (!nextPage || currentPage.classList.contains('glitching')) return;

            currentPage.classList.add('glitching');

            currentPage.classList.add("glitch-out");

            setTimeout(() => {

                currentPage.classList.remove("active");
                currentPage.classList.remove("glitch-out");
                currentPage.classList.remove("glitching");

                nextPage.classList.add("active");

                setTimeout(() => {
                    nextPage.classList.remove('glitching');
                }, GLITCH_DURATION_MS);

            }, GLITCH_DURATION_MS);
        });
    });
});
