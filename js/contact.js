/**
 * Contact chat-room — one bubble at a time, back-and-forth with typing.
 */
(function () {
  "use strict";

  var root = document.querySelector(".chat");
  if (!root) return;

  var thread = document.getElementById("chat-thread");
  var threadInner = root.querySelector(".chat__thread-inner");
  var statusEl = document.getElementById("chat-status");
  var typingRow = root.querySelector("[data-chat-typing]");
  var messages = Array.prototype.slice.call(root.querySelectorAll("[data-chat-msg]"));
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealTween = null;
  var paraTargetX = 0;
  var paraTargetY = 0;
  var paraX = 0;
  var paraY = 0;
  var paraRaf = 0;
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  var parallaxBound = false;

  function bootLenis() {
    if (window.Polyglide) return window.Polyglide.boot();
    window.__lenis = null;
    return null;
  }

  function setStatus(text) {
    /* Status line is hidden in the open layout — keep text for failsafe/debug only */
    if (statusEl) statusEl.textContent = text;
  }

  function showTyping(on) {
    if (!typingRow) return;
    if (on) {
      typingRow.hidden = false;
      typingRow.setAttribute("aria-hidden", "false");
      if (typeof gsap !== "undefined") {
        gsap.set(typingRow, { opacity: 1, y: 0, scale: 1 });
      } else {
        typingRow.style.opacity = "1";
      }
    } else {
      typingRow.hidden = true;
      typingRow.setAttribute("aria-hidden", "true");
    }
  }

  function showAll() {
    root.classList.add("is-ready");
    showTyping(false);
    setStatus("online · usually replies cute");
    messages.forEach(function (el) {
      el.classList.add("is-in");
      el.style.opacity = "1";
      el.style.transform = "none";
    });
    if (typeof gsap !== "undefined") {
      gsap.set(messages, { clearProps: "opacity,transform,y,scale" });
    }
    scrollThreadBottom();
  }

  function scrollThreadBottom() {
    if (!thread) return;
    thread.scrollTop = thread.scrollHeight;
  }

  function reveal() {
    if (revealTween && typeof revealTween.kill === "function") {
      revealTween.kill();
      revealTween = null;
    }

    if (reduced || typeof gsap === "undefined" || !messages.length) {
      showAll();
      return;
    }

    root.classList.remove("is-ready");
    messages.forEach(function (el) {
      el.classList.remove("is-in");
    });
    gsap.set(messages, { opacity: 0, y: 18, scale: 0.96 });
    showTyping(false);
    setStatus("online · usually replies cute");

    var tl = gsap.timeline({
      defaults: { ease: "back.out(1.6)" },
      onComplete: function () {
        root.classList.add("is-ready");
        showTyping(false);
        setStatus("online · usually replies cute");
        revealTween = null;
        scrollThreadBottom();
      },
      onUpdate: scrollThreadBottom,
    });

    var cursor = 0.4;

    messages.forEach(function (msg, i) {
      var speaker = msg.getAttribute("data-speaker") || "them";
      var prev = i > 0 ? messages[i - 1].getAttribute("data-speaker") : null;
      var isThem = speaker === "them";
      var switched = prev && prev !== speaker;

      /* Pause longer when the speaker flips — feels like a real chat */
      var gap = switched ? 0.65 : 0.32;
      if (i === 0) gap = 0.25;

      cursor += gap;

      if (isThem) {
        tl.call(
          function () {
            setStatus("typing…");
            showTyping(true);
            scrollThreadBottom();
          },
          null,
          cursor
        );
        cursor += switched ? 0.85 : 0.55;
        tl.call(
          function () {
            showTyping(false);
          },
          null,
          cursor
        );
      } else {
        tl.call(
          function () {
            setStatus("online · usually replies cute");
            showTyping(false);
          },
          null,
          cursor
        );
        cursor += 0.25;
      }

      tl.call(
        function () {
          msg.classList.add("is-in");
          if (isThem) setStatus("online · usually replies cute");
          scrollThreadBottom();
        },
        null,
        cursor
      );

      tl.fromTo(
        msg,
        { opacity: 0, y: 18, scale: 0.96 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.42,
          onStart: scrollThreadBottom,
        },
        cursor
      );

      cursor += 0.4;
    });

    tl.call(function () {
      showTyping(false);
      setStatus("online · usually replies cute");
    }, null, cursor);

    revealTween = tl;

    /* Failsafe — never leave mid-conversation forever */
    window.setTimeout(function () {
      if (!revealTween) return;
      try {
        revealTween.progress(1);
      } catch (e) {}
      showAll();
    }, 18000);
  }

  function setParallaxVars(x, y) {
    if (!threadInner) return;
    threadInner.style.setProperty("--px", x.toFixed(4));
    threadInner.style.setProperty("--py", y.toFixed(4));
  }

  function tickParallax() {
    paraRaf = 0;
    paraX += (paraTargetX - paraX) * 0.08;
    paraY += (paraTargetY - paraY) * 0.08;
    if (Math.abs(paraTargetX - paraX) < 0.001 && Math.abs(paraTargetY - paraY) < 0.001) {
      paraX = paraTargetX;
      paraY = paraTargetY;
      setParallaxVars(paraX, paraY);
      return;
    }
    setParallaxVars(paraX, paraY);
    paraRaf = requestAnimationFrame(tickParallax);
  }

  function requestParallaxTick() {
    if (!paraRaf) paraRaf = requestAnimationFrame(tickParallax);
  }

  function bootParallax() {
    if (reduced || !finePointer || !threadInner || parallaxBound) return;
    parallaxBound = true;

    window.addEventListener(
      "pointermove",
      function (event) {
        var w = window.innerWidth || 1;
        var h = window.innerHeight || 1;
        paraTargetX = (event.clientX / w - 0.5) * 2;
        paraTargetY = (event.clientY / h - 0.5) * 2;
        requestParallaxTick();
      },
      { passive: true }
    );
  }

  function boot() {
    bootLenis();
    bootParallax();
    reveal();
  }

  function whenReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  whenReady(boot);

  window.addEventListener("pageshow", function (event) {
    if (event.persisted) {
      showAll();
      boot();
    }
  });
})();
