document.addEventListener('DOMContentLoaded', () => {
    // 1. Fade-in page content on load
    const content = document.getElementById("legal-page-content");
    if (content) {
        setTimeout(() => {
            content.classList.add("active");
        }, 100);
    }

    // 2. Interactive Legal Sections Switcher
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

        // Update header link highlights based on open section
        const activeSection = document.querySelector('.legal-section.active');
        document.querySelectorAll("#primary-nav .filter-link").forEach(link => {
            const filterVal = link.getAttribute("data-filter");
            if (activeSection && activeSection.id === filterVal) {
                link.classList.add("active");
            } else if (!activeSection && filterVal === "imprint") {
                link.classList.add("active");
            } else {
                link.classList.remove("active");
            }
        });
    };

    // 3. Back to Top Scrolling
    window.scrollToTop = function () {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });

        // Close all sections
        const sections = document.querySelectorAll('.legal-section');
        sections.forEach(section => section.classList.remove('active'));

        // Reset highlight to imprint
        document.querySelectorAll("#primary-nav .filter-link").forEach(link => {
            const filterVal = link.getAttribute("data-filter");
            if (filterVal === "imprint") {
                link.classList.add("active");
            } else {
                link.classList.remove("active");
            }
        });
    };

    // 4. Auto-open based on URL hash
    const hash = window.location.hash.substring(1);
    if (hash === 'terms' || hash === 'policy') {
        setTimeout(() => {
            toggleLegal(hash);
        }, 300);
    }
});