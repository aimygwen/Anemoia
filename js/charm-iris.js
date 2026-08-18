/**
 * Charm iris — pupils look toward the cursor, clamped inside each eye socket.
 * Iris clipped to charm-base.svg eye sockets (charm-glass.js).
 * Supports marks added later (e.g. Insights logo-focus fly clone).
 */
(function () {
  "use strict";

  var MAX_SCREEN_X = 3.4;
  var MAX_SCREEN_UP = 2.8;
  var MAX_SCREEN_DOWN = 3.8;
  var LOOK_GAIN = 0.048;
  var EASE = 0.18;
  var RESET_EASE = 0.11;

  var pupils = [];
  var pointerX = null;
  var pointerY = null;
  var active = false;
  var raf = 0;
  var booted = false;
  var listenersAttached = false;

  function measureRest(p) {
    p.el.removeAttribute("transform");
    var r = p.el.getBoundingClientRect();
    p.restX = r.left + r.width * 0.5;
    p.restY = r.top + r.height * 0.5;
  }

  function markVisible(svg) {
    var pin = svg.closest(".lp-logo-pin-inner, .ins-logo-pin-inner, .lp-logo-pin, .ins-logo-pin");
    if (pin) {
      var section = pin.closest(".lp-logo-focus, .ins-logo-focus, [data-ins-logo-focus]");
      return !!(section && section.classList.contains("is-logo-in"));
    }
    var brand = svg.closest(".brand");
    if (brand && brand.classList.contains("is-logo-blurred")) return false;
    return true;
  }

  function collectFromMark(svg) {
    if (!svg || svg.__aimyEyesBound) return;
    var nodes = svg.querySelectorAll(".brand-layer--charm-iris .iris-pupil[data-iris]");
    if (!nodes.length) return;
    svg.__aimyEyesBound = true;
    nodes.forEach(function (el) {
      var p = {
        svg: svg,
        el: el,
        parent: el.parentNode,
        tx: 0,
        ty: 0,
        cx: 0,
        cy: 0,
        restX: 0,
        restY: 0,
      };
      measureRest(p);
      pupils.push(p);
    });
  }

  function clearMarkBindings() {
    document
      .querySelectorAll(
        ".brand .brand-mark, .lp-logo-pin .brand-mark, .ins-logo-pin .brand-mark"
      )
      .forEach(function (svg) {
        delete svg.__aimyEyesBound;
      });
  }

  function scan() {
    document
      .querySelectorAll(".brand .brand-mark, .lp-logo-pin .brand-mark, .ins-logo-pin .brand-mark")
      .forEach(collectFromMark);
  }

  function rescan() {
    pupils = pupils.filter(function (p) {
      return p.el && p.el.isConnected;
    });
    clearMarkBindings();
    scan();
    remeasure();
    attachListeners();
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function attachListeners() {
    if (listenersAttached) return;
    listenersAttached = true;
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave, {
      passive: true,
    });
    window.addEventListener("resize", remeasure, { passive: true });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) onLeave();
    });
  }

  function remeasure() {
    for (var i = 0; i < pupils.length; i++) measureRest(pupils[i]);
  }

  function toLocalDelta(p, screenDx, screenDy) {
    var ctm = p.parent.getScreenCTM && p.parent.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    var inv = ctm.inverse();
    var a = p.svg.createSVGPoint();
    a.x = p.restX;
    a.y = p.restY;
    var b = p.svg.createSVGPoint();
    b.x = p.restX + screenDx;
    b.y = p.restY + screenDy;
    var la = a.matrixTransform(inv);
    var lb = b.matrixTransform(inv);
    return { x: lb.x - la.x, y: lb.y - la.y };
  }

  function onMove(e) {
    pointerX = e.clientX;
    pointerY = e.clientY;
    active = true;
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function onLeave() {
    active = false;
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function tick() {
    raf = 0;
    var moving = false;

    for (var i = 0; i < pupils.length; i++) {
      var p = pupils[i];
      if (!markVisible(p.svg)) continue;

      /* Keep rest points fresh while the logo scales / flies */
      measureRest(p);

      var ease = active ? EASE : RESET_EASE;

      if (active && pointerX != null) {
        var dx = pointerX - p.restX;
        var dy = pointerY - p.restY;
        var dist = Math.hypot(dx, dy) || 1;
        var pull = dist * LOOK_GAIN;
        var sx = (dx / dist) * pull;
        var sy = (dy / dist) * pull;
        if (sx > MAX_SCREEN_X) sx = MAX_SCREEN_X;
        if (sx < -MAX_SCREEN_X) sx = -MAX_SCREEN_X;
        if (sy > MAX_SCREEN_DOWN) sy = MAX_SCREEN_DOWN;
        if (sy < -MAX_SCREEN_UP) sy = -MAX_SCREEN_UP;
        var local = toLocalDelta(p, sx, sy);
        p.tx = local.x;
        p.ty = local.y;
      } else {
        p.tx = 0;
        p.ty = 0;
      }

      p.cx += (p.tx - p.cx) * ease;
      p.cy += (p.ty - p.cy) * ease;

      if (Math.abs(p.tx - p.cx) > 0.02 || Math.abs(p.ty - p.cy) > 0.02) {
        moving = true;
      } else {
        p.cx = p.tx;
        p.cy = p.ty;
      }

      p.el.setAttribute(
        "transform",
        "translate(" + p.cx.toFixed(2) + " " + p.cy.toFixed(2) + ")"
      );
    }

    if (moving || active) {
      raf = requestAnimationFrame(tick);
    }
  }

  function boot() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    booted = true;
    attachListeners();
    if (window.AimyCharmMark && window.AimyCharmMark.ready) {
      window.AimyCharmMark.ready.then(rescan);
      return;
    }
    rescan();
  }

  window.AimyBrandEyes = {
    boot: boot,
    scan: scan,
    rescan: rescan,
    register: collectFromMark,
    remeasure: remeasure,
    nudge: function () {
      if (!raf) raf = requestAnimationFrame(tick);
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
