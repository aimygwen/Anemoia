document.addEventListener("DOMContentLoaded", () => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function bootLenis() {
    if (window.Polyglide) return window.Polyglide.boot();
    window.__lenis = null;
    return null;
  }

  function scrollToTarget(target, options = {}) {
    if (window.Polyglide) {
      window.Polyglide.to(target, {
        offset: options.offset ?? 0,
        duration: options.duration,
      });
      return;
    }
    if (typeof target === "number") {
      window.scrollTo({ top: target, behavior: reduced ? "auto" : "smooth" });
      return;
    }
    if (target && target.scrollIntoView) {
      target.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "start",
      });
    }
  }

  function fontsReady(budgetMs = 320) {
    const fontsOk =
      document.fonts && document.fonts.ready
        ? document.fonts.ready
        : Promise.resolve();
    const budget = new Promise((resolve) => setTimeout(resolve, budgetMs));
    return Promise.race([fontsOk, budget]);
  }

  function afterPaint(cb) {
    requestAnimationFrame(() => requestAnimationFrame(cb));
  }

  let revealObserver = null;

  function markReveal(el, { delay = 0, variant = "" } = {}) {
    if (!el) return;
    el.classList.add("imprint-reveal");
    if (variant) el.classList.add(`imprint-reveal--${variant}`);
    el.style.setProperty("--reveal-delay", `${delay}ms`);
    if (reduced) {
      el.classList.add("is-in");
      return;
    }
    if (revealObserver) revealObserver.observe(el);
  }

  function bootReveals() {
    const stage = document.querySelector(".imprint-stage");
    if (!stage) return;

    if (!reduced && "IntersectionObserver" in window) {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-in");
            revealObserver.unobserve(entry.target);
          });
        },
        {
          root: null,
          rootMargin: "0px 0px -8% 0px",
          threshold: 0.1,
        }
      );
    }

    markReveal(stage.querySelector(".pl-carousel"), { delay: 40, variant: "title" });
    markReveal(stage.querySelector(".imprint-foot"), {
      delay: 80,
      variant: "soft",
    });
  }

  function bootCarousel() {
    const root = document.querySelector("[data-pl-carousel]");
    const selector = document.querySelector("[data-pl-selector]");
    const rail = document.querySelector("[data-pl-rail]");
    const items = Array.from(document.querySelectorAll("[data-pl-item]"));
    const slides = Array.from(document.querySelectorAll(".pl-slide"));
    const prevBtn = document.querySelector("[data-pl-prev]");
    const nextBtn = document.querySelector("[data-pl-next]");
    if (!root || !selector || !rail || items.length < 2 || slides.length < 2) {
      return;
    }

    const ids = items.map((el) => el.dataset.id);
    let index = 0;
    let initialized = false;
    let ready = false;
    let layoutTween = null;
    let dragX = 0;

    function slotState(i) {
      const slot = i - index;

      if (slot === 0) {
        return {
          slot,
          xPercent: 0,
          opacity: 1,
          className: "is-active",
        };
      }
      if (slot === 1) {
        return {
          slot,
          xPercent: 0,
          opacity: 0,
          className: "is-next",
        };
      }
      if (slot === -1) {
        return {
          slot,
          xPercent: 0,
          opacity: 0,
          className: "is-prev",
        };
      }
      return {
        slot,
        xPercent: 0,
        opacity: 0,
        className: "is-far",
      };
    }

    function applySlotClasses() {
      items.forEach((el, i) => {
        const state = slotState(i);
        el.classList.remove("is-active", "is-prev", "is-next", "is-far");
        el.classList.add(state.className);
        el.setAttribute("aria-selected", state.slot === 0 ? "true" : "false");
        el.tabIndex = state.slot === 0 ? 0 : -1;
      });
    }

    function applyPositions(animate, direction) {
      const states = items.map((_, i) => slotState(i));
      const useGsap =
        ready &&
        animate &&
        !reduced &&
        typeof gsap !== "undefined";

      if (layoutTween) {
        layoutTween.kill();
        layoutTween = null;
      }
      if (typeof gsap !== "undefined") {
        items.forEach((el) => gsap.killTweensOf(el));
      }

      if (!useGsap) {
        items.forEach((el, i) => {
          const state = states[i];
          const isActive = state.slot === 0;
          el.style.position = isActive ? "relative" : "absolute";
          el.style.transform = isActive
            ? `translate3d(${dragX}px, 0, 0)`
            : "translate3d(0, 0, 0)";
          el.style.opacity = String(isActive ? 1 : 0);
          el.style.filter = "";
          el.style.clipPath = "";
        });
        return;
      }

      /* Hand off from CSS transforms to GSAP */
      items.forEach((el) => {
        el.style.transform = "";
      });

      layoutTween = gsap.timeline({ defaults: { overwrite: "auto" } });

      items.forEach((el, i) => {
        const state = states[i];
        const isActive = state.slot === 0;
        el.style.position = isActive ? "relative" : "absolute";

        layoutTween.to(
          el,
          {
            xPercent: 0,
            x: isActive ? dragX : 0,
            opacity: isActive ? 1 : 0,
            duration: isActive ? 0.48 : 0.28,
            ease: isActive ? "power3.out" : "power2.out",
          },
          0
        );

        if (isActive) {
          layoutTween.fromTo(
            el,
            {
              clipPath:
                direction > 0 ? "inset(0 16% 0 0)" : "inset(0 0 0 16%)",
              filter: "blur(5px)",
            },
            {
              clipPath: "inset(0 0 0 0)",
              filter: "blur(0px)",
              duration: 0.46,
              ease: "power3.out",
              clearProps: "clipPath,filter",
            },
            0
          );
        }
      });
    }

    function layoutTitles({ animate = true, direction = 1 } = {}) {
      applySlotClasses();
      applyPositions(animate, direction);
    }

    function setDragOffset(px) {
      dragX = px;
      selector.style.setProperty("--pl-drag-x", `${px}px`);
      if (typeof gsap !== "undefined" && ready && !reduced) {
        const active = items[index];
        if (active) gsap.set(active, { xPercent: 0, x: dragX });
        items.forEach((el, i) => {
          if (i === index) return;
          gsap.set(el, { xPercent: 0, x: 0, opacity: 0 });
        });
        return;
      }
      applyPositions(false, 1);
    }

    function clearDragOffset({ animate = true } = {}) {
      const from = dragX;
      dragX = 0;
      selector.style.setProperty("--pl-drag-x", "0px");

      if (!animate || reduced || typeof gsap === "undefined" || !ready) {
        layoutTitles({ animate: false });
        return;
      }

      const active = items[index];
      if (active) {
        gsap.fromTo(
          active,
          { x: from, xPercent: 0 },
          {
            x: 0,
            xPercent: 0,
            duration: 0.32,
            ease: "power3.out",
            overwrite: "auto",
          }
        );
      }
      items.forEach((el, i) => {
        if (i === index) return;
        gsap.set(el, { x: 0, xPercent: 0, opacity: 0 });
      });
    }

    function setIndex(next, { updateHash = true, animate = true } = {}) {
      const nextIndex = Math.max(0, Math.min(slides.length - 1, next));
      if (initialized && nextIndex === index) {
        if (dragX) clearDragOffset({ animate });
        return;
      }
      const direction = nextIndex >= index ? 1 : -1;
      index = nextIndex;
      dragX = 0;
      selector.style.setProperty("--pl-drag-x", "0px");

      slides.forEach((slide, i) => {
        const active = i === index;
        slide.classList.toggle("is-active", active);
        slide.setAttribute("aria-hidden", active ? "false" : "true");
      });

      const activeId = ids[index];
      layoutTitles({ animate: animate && ready, direction });

      if (prevBtn) prevBtn.disabled = index <= 0;
      if (nextBtn) nextBtn.disabled = index >= slides.length - 1;

      if (updateHash) {
        const url = new URL(window.location.href);
        if (activeId === "imprint") {
          history.replaceState(null, "", url.pathname + url.search);
        } else {
          history.replaceState(
            null,
            "",
            url.pathname + url.search + "#" + activeId
          );
        }
      }

      initialized = true;
    }

    function go(delta) {
      setIndex(index + delta);
    }

    /* —— Pointer drag / swipe —— */
    const DRAG_CLICK_PX = 10;
    const DRAG_FLIP_PX = 56;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let dragging = false;
    let moved = false;
    let suppressClick = false;

    function onPointerDown(e) {
      if (e.button != null && e.button !== 0) return;
      if (e.target.closest(".pl-nav")) return;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      dragging = false;
      moved = false;
      suppressClick = false;
      try {
        rail.setPointerCapture(pointerId);
      } catch (_) {
        /* ignore */
      }
    }

    function onPointerMove(e) {
      if (pointerId == null || e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!dragging) {
        if (Math.abs(dx) < DRAG_CLICK_PX && Math.abs(dy) < DRAG_CLICK_PX) {
          return;
        }
        if (Math.abs(dy) > Math.abs(dx)) {
          /* vertical scroll wins — abort drag */
          pointerId = null;
          return;
        }
        dragging = true;
        moved = true;
        selector.classList.add("is-dragging");
      }
      e.preventDefault();
      setDragOffset(dx);
    }

    function finishPointer(e) {
      if (pointerId == null || (e && e.pointerId !== pointerId)) return;
      const dx = dragX;
      const wasDragging = dragging;
      pointerId = null;
      selector.classList.remove("is-dragging");
      dragging = false;

      if (wasDragging && Math.abs(dx) >= DRAG_FLIP_PX) {
        suppressClick = true;
        const dir = dx < 0 ? 1 : -1;
        const next = index + dir;
        if (next >= 0 && next < slides.length) {
          setIndex(next);
        } else {
          clearDragOffset({ animate: true });
        }
      } else if (wasDragging) {
        suppressClick = true;
        clearDragOffset({ animate: true });
      }

      if (wasDragging || moved) {
        moved = false;
        setTimeout(() => {
          suppressClick = false;
        }, 40);
      }
    }

    rail.addEventListener("pointerdown", onPointerDown);
    rail.addEventListener("pointermove", onPointerMove);
    rail.addEventListener("pointerup", finishPointer);
    rail.addEventListener("pointercancel", finishPointer);
    rail.addEventListener("lostpointercapture", finishPointer);

    items.forEach((el, i) => {
      el.addEventListener("click", (e) => {
        if (suppressClick || moved) {
          e.preventDefault();
          moved = false;
          return;
        }
        if (i !== index) setIndex(i);
      });
    });

    if (prevBtn) prevBtn.addEventListener("click", () => go(-1));
    if (nextBtn) nextBtn.addEventListener("click", () => go(1));

    /* —— Horizontal wheel / trackpad over selector —— */
    let wheelLock = false;
    selector.addEventListener(
      "wheel",
      (e) => {
        const absX = Math.abs(e.deltaX);
        const absY = Math.abs(e.deltaY);
        const horizontal =
          absX > absY + 2 || (e.shiftKey && absY > 4);
        if (!horizontal) return;

        e.preventDefault();
        if (wheelLock) return;

        const delta = e.shiftKey && absX <= absY ? e.deltaY : e.deltaX;
        if (Math.abs(delta) < 6) return;

        wheelLock = true;
        go(delta > 0 ? 1 : -1);
        setTimeout(() => {
          wheelLock = false;
        }, reduced ? 120 : 420);
      },
      { passive: false }
    );

    window.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    });

    window.addEventListener("hashchange", () => {
      const id = window.location.hash.replace("#", "");
      const i = ids.indexOf(id);
      if (i >= 0) setIndex(i, { updateHash: false });
      else if (!id) setIndex(0, { updateHash: false });
    });

    window.addEventListener("resize", () => {
      if (!ready) return;
      layoutTitles({ animate: false });
    });

    const hash = window.location.hash.replace("#", "");
    const fromHash = ids.indexOf(hash);

    /* Initial CSS-safe state before fonts — only active visible */
    setIndex(fromHash >= 0 ? fromHash : 0, {
      updateHash: false,
      animate: false,
    });

    fontsReady().then(() => {
      afterPaint(() => {
        ready = true;
        selector.classList.add("is-ready");
        layoutTitles({ animate: false, direction: 1 });

        if (fromHash > 0) {
          setTimeout(
            () => scrollToTarget(root, { offset: -16, duration: 1.15 }),
            160
          );
        }
      });
    });
  }

  function bootTilt() {
    const carousel = document.querySelector("[data-pl-carousel]");
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (!carousel || reduced || !fine) return;

    const pointer = { x: 0, y: 0 };
    const rendered = { x: 0, y: 0 };
    let rafId = 0;

    window.addEventListener(
      "pointermove",
      (event) => {
        const w = window.innerWidth || 1;
        const h = window.innerHeight || 1;
        pointer.x = (event.clientX / w - 0.5) * 2;
        pointer.y = (event.clientY / h - 0.5) * 2;
      },
      { passive: true }
    );

    document.documentElement.addEventListener("pointerleave", () => {
      pointer.x = 0;
      pointer.y = 0;
    });

    function paint() {
      rendered.x += (pointer.x - rendered.x) * 0.08;
      rendered.y += (pointer.y - rendered.y) * 0.08;
      carousel.style.setProperty(
        "--tilt-rx",
        (rendered.y * -3.2).toFixed(2) + "deg"
      );
      carousel.style.setProperty(
        "--tilt-ry",
        (rendered.x * 4).toFixed(2) + "deg"
      );
      rafId = requestAnimationFrame(paint);
    }

    rafId = requestAnimationFrame(paint);

    window.addEventListener(
      "pagehide",
      () => {
        if (rafId) cancelAnimationFrame(rafId);
      },
      { once: true }
    );
  }

  bootLenis();
  bootReveals();
  bootCarousel();
  bootTilt();
});
