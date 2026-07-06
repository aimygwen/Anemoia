document.addEventListener('DOMContentLoaded', () => {
    if (window.Site) Site.initPageFadeIn("legal-page-content", 100);

    const tabs = document.querySelectorAll('.legal-tab');
    const panels = document.querySelectorAll('.legal-panel');

    function syncTabs(activeId) {
        tabs.forEach((tab) => {
            const isActive = tab.dataset.legal === activeId;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
    }

    function clearPanels() {
        panels.forEach((panel) => panel.classList.remove('active'));
        tabs.forEach((tab) => {
            tab.classList.remove('active');
            tab.setAttribute('aria-selected', 'false');
        });
    }

    window.toggleLegal = function (id) {
        const targetPanel = document.getElementById(id);
        if (!targetPanel) return;

        const isOpen = targetPanel.classList.contains('active');
        if (isOpen) {
            clearPanels();
            return;
        }

        panels.forEach((panel) => panel.classList.remove('active'));
        targetPanel.classList.add('active');
        syncTabs(id);

        setTimeout(() => {
            targetPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => toggleLegal(tab.dataset.legal));
    });

    window.scrollToTop = function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        clearPanels();
    };

    const hash = window.location.hash.substring(1);
    if (hash === 'terms' || hash === 'policy') {
        setTimeout(() => toggleLegal(hash), 300);
    }
});
