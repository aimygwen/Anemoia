/**
 * spa-transitions.js
 * View enter/leave — single soft crossfade on the SPA host.
 */
(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof window.gsap !== "undefined";

  function setViewVisibility(viewEl, active) {
    if (!viewEl) return;
    viewEl.hidden = !active;
    viewEl.classList.toggle("spa-view--active", active);
    viewEl.setAttribute("aria-hidden", active ? "false" : "true");
  }

  function transition(fromEl, toEl) {
    if (!toEl) return Promise.resolve();

    if (reducedMotion || !hasGsap) {
      if (fromEl && fromEl !== toEl) setViewVisibility(fromEl, false);
      setViewVisibility(toEl, true);
      return Promise.resolve();
    }

    return new Promise(function (resolve) {
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        if (fromEl && fromEl !== toEl) {
          setViewVisibility(fromEl, false);
          gsap.set(fromEl, { clearProps: "opacity,transform" });
        }
        gsap.set(toEl, { clearProps: "opacity,transform" });
        resolve();
      }

      var safety = window.setTimeout(finish, 520);

      if (fromEl && fromEl !== toEl) {
        gsap.to(fromEl, {
          opacity: 0,
          y: -8,
          duration: 0.22,
          ease: "power2.in",
        });
      }

      setViewVisibility(toEl, true);
      gsap.fromTo(
        toEl,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.34,
          ease: "power2.out",
          onComplete: function () {
            window.clearTimeout(safety);
            finish();
          },
        }
      );
    });
  }

  window.AimySpaTransitions = {
    setViewVisibility: setViewVisibility,
    transition: transition,
  };
})();
