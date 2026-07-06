document.addEventListener('DOMContentLoaded', () => {
    if (window.Site) Site.initPageFadeIn("legal-page-content", 100);
    window.toggleLegal = function (id) {
        const sections = document.querySelectorAll('.legal-section');
        const targetSection = document.getElementById(id);

        if (!targetSection) return;

        // Hide other active sections
        sections.forEach(section => {
            if (section.id !== id) {
                section.classList.remove('active');
            }
        });

        // Toggle selected section
        const isCurrentlyActive = targetSection.classList.contains('active');
        if (isCurrentlyActive) {
            targetSection.classList.remove('active');
        } else {
            targetSection.classList.add('active');
            
            // Wait slightly for the animation/layout to settle, then scroll to section
            setTimeout(() => {
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }

        }
    };

    // 3. Back to Top Scrolling
    window.scrollToTop = function () {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });

        document.querySelectorAll('.legal-section').forEach(section => section.classList.remove('active'));
    };

    // 4. Auto-open based on URL hash
    const hash = window.location.hash.substring(1);
    if (hash === 'terms' || hash === 'policy') {
        setTimeout(() => {
            toggleLegal(hash);
        }, 300);
    }
});