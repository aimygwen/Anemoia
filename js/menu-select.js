/**
 * menu-select.js
 * Tomb Raider–style 3D menu picker — GLB models on a turntable, titles below.
 *
 * Per-item sizing in ITEMS (all optional):
 *   scale: 1        — multiplier (0.8 = 80%, 1.2 = 120%)
 *   size: 0.36      — target height when normalize is true (defaults to MODEL_SIZE)
 *   normalize: true — set false to keep GLB export dimensions, then tune with scale
 *
 * Facing (Blockbench N/S/E/W empties in GLB, or +Z = South):
 *   Optional empties named N/n/North, S/s/South, E/e/East, W/w/West — face is always South.
 *   faceSouthYaw: 0 — extra radians around Y if a model needs manual trim
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

(function () {
  "use strict";

  /* Bump when swapping ./assets/polykroma/select/*.glb before deploy */
  var SELECT_TAG = "select-5";

  function isLocalDev() {
    var host = window.location.hostname;
    return host === "localhost" || host === "127.0.0.1";
  }

  function modelVersionTag() {
    if (isLocalDev()) {
      return "dev-" + String(Date.now());
    }
    return SELECT_TAG;
  }

  var MODEL_VERSION = modelVersionTag();

  var ITEMS = [
    {
      id: "work",
      label: "Work",
      href: "/work",
      model: "./assets/polykroma/select/archive.glb?v=" + MODEL_VERSION,
    },
    {
      id: "me",
      label: "Me",
      href: "./about.html",
      model: "./assets/polykroma/select/polaroid.glb?v=" + MODEL_VERSION,
      hitZoneScale: 0.9,
    },
    {
      id: "insights",
      label: "Insights",
      href: "/insights",
      model: "./assets/polykroma/select/insights.glb?v=" + MODEL_VERSION,
      hoverFlip: false,
      hitZoneScale: 0.9,
    },
  ];

  var TAU = Math.PI * 2;
  var COUNT = ITEMS.length;
  var THETA = TAU / COUNT;
  var RADIUS = 0.96;
  var MODEL_SIZE = 0.36;
  var CAMERA_FOV = 26;
  var FIT_PADDING = 1.62; /* legacy ref for model load sizing */
  var FRONT_SCALE = 1.06;
  var RING_TILT = 0.13;
  var RING_Y = 0.14;
  var RING_Y_MOBILE = 0.58;
  var MOBILE_LOOK_BIAS = -0.18;
  var DESKTOP_LOOK_BIAS = -0.11;
  var CAMERA_ELEV = 0.2;
  var PIVOT_Y = 0.18;
  var MOBILE_PAD = 1.26;
  var DESKTOP_PAD = 1.68;
  var DESKTOP_MODEL_SCALE = 0.82;
  var FIT_NDC_LIMIT = 0.84;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var section = null;
  var viewport = null;
  var canvas = null;
  var titleButtons = [];
  var hitButtons = [];
  var labelLayer = null;
  var labelPoint = null;
  var labelBox = null;

  var scene = null;
  var camera = null;
  var renderer = null;
  var carousel = null;
  var anchors = [];
  var pickables = [];
  var hoverTiltX = 0;
  var hoverTiltZ = 0;
  var hoverTiltTargetX = 0;
  var hoverTiltTargetZ = 0;
  var hoverTiltTargetY = 0;
  var hoverTiltY = 0;
  var raycaster = null;
  var pointerNdc = null;
  var pedestal = null;

  var index = 0;
  var rotationY = 0;
  var tween = null;
  var dragging = false;
  var dragStartX = 0;
  var dragStartY = 0;
  var dragStartRot = 0;
  var dragLastX = 0;
  var dragLastY = 0;
  var dragLastTs = 0;
  var dragVelocity = 0;
  var dragVelocityY = 0;
  var suppressClick = false;
  var animating = false;
  var visible = false;
  var rafId = 0;
  var ready = false;
  var booted = false;
  var wheelStepLocked = false;
  var wheelStepTimer = 0;
  var menuNavBound = false;
  var arrowPrevBtn = null;
  var arrowNextBtn = null;
  var arrowEngageTimers = { prev: 0, next: 0 };
  var revealActive = false;
  var revealOpening = false;
  var revealProgress = 1;
  var revealCameraLock = null;
  var revealTween = null;
  var pendingReveal = null;

  var DRAG_RATIO = 0.0052;
  var SNAP_MS = reduced ? 0 : 480;
  var KEY_SNAP_MS = reduced ? 0 : 340;
  var WHEEL_STEP_MS = reduced ? 0 : KEY_SNAP_MS;
  var ARROW_ENGAGE_MS = reduced ? 0 : 1100;
  var REVEAL_OPEN_MS = reduced ? 0 : 1080;
  var REVEAL_CLOSE_MS = reduced ? 0 : 580;
  var REVEAL_SWIRL = Math.PI * 1.42;
  var REVEAL_SCALE_MIN = 0.04;
  var IDLE_SPIN = reduced ? 0 : 0.62;
  var HOVER_FACE_MS = reduced ? 0 : 520;
  var IDLE_RETURN_MS = reduced ? 0 : 480;
  var HOVER_TILT_MS = reduced ? 0 : 0.12;
  var LABEL_GAP = 0.1;
  var LABEL_SLOT_X = [22, 50, 78];
  var LABEL_SLOT_X_SM = [18, 50, 82];
  var HOVER_STICKY_PAD = 28;
  var hitProbe = new THREE.Vector3();
  var faceSouthLocal = new THREE.Vector3(0, 0, 1);
  var faceSouthWorld = new THREE.Vector3();
  var faceSpinOrigin = new THREE.Vector3();
  var faceCamDir = new THREE.Vector3();
  var faceMarkerPos = new THREE.Vector3();
  var itemHitBox = new THREE.Box3();
  var ringBounds = new THREE.Box3();
  var ringCenter = new THREE.Vector3();
  var ringSize = new THREE.Vector3();
  var ringCorner = new THREE.Vector3();

  var hoveredIndex = -1;
  var hoverTween = null;

  function navigate(href) {
    if (window.__aimyCloseMenu) {
      window.__aimyCloseMenu({ restoreFocus: false });
    }
    if (window.AimySpa && typeof window.AimySpa.canHandle === "function" && window.AimySpa.canHandle(href)) {
      window.AimySpa.navigate(href);
      return;
    }
    if (window.AimyPageTransition && typeof window.AimyPageTransition.navigate === "function") {
      window.AimyPageTransition.navigate(href);
      return;
    }
    window.location.href = href;
  }

  function mod(n, m) {
    return ((n % m) + m) % m;
  }

  function rotationForIndex(i) {
    return -i * THETA;
  }

  function indexFromRotation(rot) {
    return mod(Math.round(-rot / THETA), COUNT);
  }

  function nearestRotation(current, targetIndex) {
    var base = rotationForIndex(targetIndex);
    var options = [base, base + TAU, base - TAU, base + TAU * 2, base - TAU * 2];
    var best = options[0];
    var bestDist = Math.abs(options[0] - current);
    var i;

    for (i = 1; i < options.length; i += 1) {
      var dist = Math.abs(options[i] - current);
      if (dist < bestDist) {
        best = options[i];
        bestDist = dist;
      }
    }

    return best;
  }

  function slideIndexForView(view) {
    var key = String(view || "start").toLowerCase();
    for (var i = 0; i < COUNT; i += 1) {
      if (ITEMS[i].id === key) return i;
    }
    return 0;
  }

  function menuIsOpen() {
    var shell = document.getElementById("pk-nav-shell");
    return !!(shell && shell.classList.contains("is-open"));
  }

  function canNavigateInput() {
    return ready && menuIsOpen() && !dragging && !animating && !revealActive && revealProgress > 0.96;
  }

  function killMenuReveal(clearLock) {
    if (revealTween) {
      revealTween.kill();
      revealTween = null;
    }
    revealActive = false;
    revealOpening = false;
    if (clearLock !== false) {
      revealCameraLock = null;
    }
  }

  function revealSmoothstep(t) {
    var x = Math.max(0, Math.min(1, t));
    return x * x * (3 - 2 * x);
  }

  function prepareMenuReveal() {
    if (!ready) return;
    var target = slideIndexForView(getCurrentView());
    var targetRot = nearestRotation(rotationY, target);
    applyRotation(targetRot, target, { skipPresence: true });
    settleRotation();

    revealOpening = true;
    applyRevealProgress(1, { silent: true });
    revealCameraLock = measureCamera();
    applyRevealProgress(0);
    applyMeasuredCamera(revealCameraLock);
  }

  function applyRevealProgress(t, opts) {
    opts = opts || {};
    revealProgress = t;
    if (!carousel || !ready) return;

    var i;
    var anchor;
    var spin;
    var ease = Math.max(0, Math.min(1, t));
    var radius;
    var angle;
    var restAngle;
    var dist;
    var blend;
    var scaleTarget;
    var scale;
    var opacity;
    var grow;
    var mobile = isMobileViewport();

    for (i = 0; i < COUNT; i += 1) {
      anchor = anchors[i];
      spin = anchor && anchor.userData.spin;
      if (!anchor || !spin) continue;

      restAngle = typeof anchor.userData.restAngle === "number" ? anchor.userData.restAngle : i * THETA;
      angle = restAngle + REVEAL_SWIRL * (1 - ease);
      radius = RADIUS * ease;

      anchor.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
      anchor.rotation.y = Math.PI - angle;

      dist = angularDistFromFront(i);
      blend = Math.min(dist, 1);
      scaleTarget = Math.max(mobile ? 0.34 : 0.5, FRONT_SCALE - blend * (mobile ? 0.48 : 0.36));

      if (revealOpening) {
        grow = revealSmoothstep(ease);
        scale = REVEAL_SCALE_MIN + (scaleTarget - REVEAL_SCALE_MIN) * grow;
        opacity = (1 - blend * (mobile ? 0.55 : 0.34)) * grow;
      } else {
        scale = REVEAL_SCALE_MIN + (scaleTarget - REVEAL_SCALE_MIN) * ease;
        opacity = (1 - blend * (mobile ? 0.55 : 0.34)) * ease;
      }

      spin.visible = ease > 0.02;
      spin.scale.setScalar(scale);

      spin.traverse(function (node) {
        if (!node.isMesh || !node.material) return;
        var mats = Array.isArray(node.material) ? node.material : [node.material];
        var m;

        for (m = 0; m < mats.length; m += 1) {
          applySlideOpacity(mats[m], opacity);
        }
      });
    }

    updateLabelPositions();
    if (!opts.silent && renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  function finishMenuReveal(open) {
    if (revealTween) {
      revealTween.kill();
      revealTween = null;
    }
    revealActive = false;
    revealProgress = open ? 1 : 0;
    if (section) section.classList.remove("is-revealing");

    if (open) {
      revealOpening = true;
      applyRevealProgress(1);
      revealOpening = false;
      assignIdleSpins(true);
      window.requestAnimationFrame(function () {
        captureAllRestHitScreens();
        revealCameraLock = null;
        renderFrame();
      });
      return;
    }

    revealCameraLock = null;
    revealOpening = false;
    applyRevealProgress(0);
  }

  function runMenuReveal(open, onComplete) {
    killMenuReveal(!open);
    if (section) section.classList.add("is-revealing");

    if (reduced || !window.gsap) {
      finishMenuReveal(open);
      if (onComplete) onComplete();
      return;
    }

    revealActive = true;
    revealOpening = open;
    if (!rafId) startLoop();

    var state = { t: open ? 0 : 1 };
    applyRevealProgress(state.t);

    revealTween = window.gsap.to(state, {
      t: open ? 1 : 0,
      duration: (open ? REVEAL_OPEN_MS : REVEAL_CLOSE_MS) / 1000,
      ease: open ? "sine.inOut" : "power2.inOut",
      onUpdate: function () {
        applyRevealProgress(state.t);
      },
      onComplete: function () {
        finishMenuReveal(open);
        if (onComplete) onComplete();
      },
    });
  }

  function playMenuReveal(open, onComplete) {
    if (!ready) {
      pendingReveal = { open: open, onComplete: onComplete };
      bootMenu();
      return;
    }

    pendingReveal = null;
    if (open) {
      prepareMenuReveal();
    }
    runMenuReveal(open, onComplete);
  }

  function wheelEventScale(e) {
    if (e.deltaMode === 1) return 16;
    if (e.deltaMode === 2) return window.innerHeight || 800;
    return 1;
  }

  function onMenuWheel(e) {
    if (!canNavigateInput()) return;

    var scale = wheelEventScale(e);
    var dx = e.deltaX * scale;
    var dy = e.deltaY * scale;

    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

    e.preventDefault();
    e.stopPropagation();

    if (wheelStepLocked) return;

    if (Math.abs(dx) >= Math.abs(dy)) {
      if (dx > 0) prev();
      else next();
    } else if (dy > 0) {
      next();
    } else {
      prev();
    }

    wheelStepLocked = true;
    window.clearTimeout(wheelStepTimer);
    wheelStepTimer = window.setTimeout(function () {
      wheelStepLocked = false;
    }, WHEEL_STEP_MS);
  }

  function clearArrowEngage() {
    if (arrowPrevBtn) arrowPrevBtn.classList.remove("is-engaged");
    if (arrowNextBtn) arrowNextBtn.classList.remove("is-engaged");
    window.clearTimeout(arrowEngageTimers.prev);
    window.clearTimeout(arrowEngageTimers.next);
    arrowEngageTimers.prev = 0;
    arrowEngageTimers.next = 0;
  }

  function engageArrow(direction) {
    if (reduced || !ARROW_ENGAGE_MS) return;
    var btn = direction === "prev" ? arrowPrevBtn : arrowNextBtn;
    if (!btn) return;
    btn.classList.add("is-engaged");
    window.clearTimeout(arrowEngageTimers[direction]);
    arrowEngageTimers[direction] = window.setTimeout(function () {
      btn.classList.remove("is-engaged");
      arrowEngageTimers[direction] = 0;
    }, ARROW_ENGAGE_MS);
  }

  function onMenuKeydown(e) {
    if (!ready || !menuIsOpen()) return;

    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (!canNavigateInput()) return;
      openCurrent();
      return;
    }

    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "ArrowUp" && e.key !== "ArrowDown") {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    if (!canNavigateInput()) return;

    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      engageArrow("prev");
      prev();
      return;
    }

    engageArrow("next");
    next();
  }

  function bindMenuNavigation() {
    if (menuNavBound) return;
    menuNavBound = true;
    document.addEventListener("wheel", onMenuWheel, { passive: false, capture: true });
    document.addEventListener("keydown", onMenuKeydown, true);
  }

  function clearWheelStepLock() {
    wheelStepLocked = false;
    window.clearTimeout(wheelStepTimer);
    wheelStepTimer = 0;
  }

  function setAnimating(on) {
    animating = on;
    if (section) section.classList.toggle("is-animating", on);
  }

  function updateChrome() {
    var i;

    for (i = 0; i < hitButtons.length; i += 1) {
      if (titleButtons[i]) {
        titleButtons[i].classList.toggle("is-active", i === index);
      }
      hitButtons[i].classList.toggle("is-active", i === index);
      hitButtons[i].setAttribute("aria-selected", i === index ? "true" : "false");
      hitButtons[i].tabIndex = i === index ? 0 : -1;
    }
  }

  function shouldRenderLoop() {
    if (revealActive || menuIsOpen() || dragging || animating || hoveredIndex >= 0) return true;
    var i;
    for (i = 0; i < COUNT; i += 1) {
      if (anchors[i] && anchors[i].userData.idleReturning) return true;
    }
    return false;
  }

  function settleRotation() {
    var settled = nearestRotation(rotationY, index);
    rotationY = settled;
    if (carousel) {
      carousel.rotation.x = RING_TILT;
      carousel.rotation.y = rotationY;
    }
  }

  function isMobileViewport() {
    var w = viewport ? viewport.clientWidth : window.innerWidth;
    return w < 768;
  }

  function fitPad() {
    return isMobileViewport() ? MOBILE_PAD : DESKTOP_PAD;
  }

  function ringY() {
    return isMobileViewport() ? RING_Y_MOBILE : RING_Y;
  }

  function applyRingPosition() {
    if (carousel) {
      carousel.position.y = ringY();
    }
  }

  function itemModelScale(item) {
    return typeof item.scale === "number" ? item.scale : 1;
  }

  function itemModelTargetSize(item) {
    var base = typeof item.size === "number" ? item.size : MODEL_SIZE;
    return base * itemModelScale(item);
  }

  function centerModelOnPedestal(root) {
    var box = new THREE.Box3().setFromObject(root);
    var center = box.getCenter(new THREE.Vector3());
    root.position.x -= center.x;
    root.position.z -= center.z;
    root.position.y -= box.min.y;
  }

  function stampModelFitMetrics(root) {
    var box = new THREE.Box3().setFromObject(root);
    var fitted = box.getSize(new THREE.Vector3());
    root.userData.fitHeight = fitted.y;
    root.userData.fitWidth = Math.max(fitted.x, fitted.z);
  }

  function boundsFromVisibleSpins() {
    var i;
    var spin;

    ringBounds.makeEmpty();
    carousel.updateWorldMatrix(true, true);

    for (i = 0; i < anchors.length; i += 1) {
      spin = anchors[i].userData.flip || anchors[i].userData.spin;
      if (!spin || !spin.visible) continue;
      ringBounds.expandByObject(spin);
    }

    if (ringBounds.isEmpty()) return false;

    ringBounds.getSize(ringSize);
    ringBounds.min.y -= ringSize.y * 0.3;
    ringBounds.max.y += ringSize.y * 0.05;
    return true;
  }

  var cameraLookY = PIVOT_Y;

  function activeFitMetrics() {
    var front = anchors[index];
    var root;

    if (front && front.userData.flip && front.userData.flip.children.length) {
      root = front.userData.flip.children[0];
      return {
        height: root.userData.fitHeight || MODEL_SIZE,
        width: root.userData.fitWidth || MODEL_SIZE,
      };
    }

    return { height: MODEL_SIZE, width: MODEL_SIZE };
  }

  function ensureBoundsFit(dist, pivotY, pivotZ, vFovRad, hFovRad, ndcLimit) {
    var safe = dist;
    var tries = 0;

    while (tries < 12) {
      if (ringProjectsInside(safe, pivotY, pivotZ, vFovRad, hFovRad, ndcLimit)) {
        return safe;
      }
      safe *= 1.04;
      tries += 1;
    }

    return safe;
  }

  function measureCamera() {
    applyRingPosition();

    var viewW = viewport.clientWidth;
    var viewH = viewport.clientHeight;
    var fit = activeFitMetrics();
    var pad = fitPad();
    var mobile = isMobileViewport();
    var labelPad = mobile ? 0.16 : 0.34;
    var fitH = fit.height * pad + fit.height * labelPad;
    var fitW = fit.width * pad;
    var aspect = viewW / Math.max(viewH, 1);
    var vFovRad = (CAMERA_FOV * Math.PI) / 180;
    var hFovRad = 2 * Math.atan(Math.tan(vFovRad * 0.5) * aspect);
    var distV = (fitH * 0.5) / Math.tan(vFovRad * 0.5);
    var distH = (fitW * 0.5) / Math.tan(hFovRad * 0.5);
    var dist = Math.max(distV, distH);
    var pivotY = PIVOT_Y;
    var pivotZ = 0;

    carousel.updateWorldMatrix(true, true);

    if (boundsFromVisibleSpins()) {
      ringBounds.getCenter(ringCenter);
      pivotY = ringCenter.y;
      pivotZ = ringCenter.z;
    }

    if (ready) {
      if (mobile) {
        if (boundsFromVisibleSpins()) {
          dist = ensureBoundsFit(dist, pivotY, pivotZ, vFovRad, hFovRad, FIT_NDC_LIMIT);
        }
      } else {
        dist = ensureRingFitsAllRotations(dist, pivotY, pivotZ, vFovRad, hFovRad, FIT_NDC_LIMIT);
        dist /= DESKTOP_MODEL_SCALE;
      }
    }

    var lookY = mobile ? pivotY + MOBILE_LOOK_BIAS : pivotY + DESKTOP_LOOK_BIAS;

    return {
      aspect: aspect,
      camY: pivotY + dist * Math.sin(CAMERA_ELEV),
      camZ: pivotZ + dist * Math.cos(CAMERA_ELEV),
      lookY: lookY,
      pivotZ: pivotZ,
    };
  }

  function applyMeasuredCamera(measured) {
    camera.fov = CAMERA_FOV;
    camera.aspect = measured.aspect;
    camera.position.set(0, measured.camY, measured.camZ);
    camera.lookAt(0, measured.lookY, measured.pivotZ);
    cameraLookY = measured.lookY;
    camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }

  function ringProjectsInside(dist, pivotY, pivotZ, vFovRad, hFovRad, ndcLimit) {
    var camY = pivotY + dist * Math.sin(CAMERA_ELEV);
    var camZ = pivotZ + dist * Math.cos(CAMERA_ELEV);
    var xs = ringBounds.min.x;
    var xe = ringBounds.max.x;
    var ys = ringBounds.min.y;
    var ye = ringBounds.max.y;
    var zs = ringBounds.min.z;
    var ze = ringBounds.max.z;
    var xi;
    var yi;
    var zi;

    camera.position.set(0, camY, camZ);
    camera.lookAt(0, pivotY, pivotZ);
    camera.updateProjectionMatrix();
    carousel.updateWorldMatrix(true, true);

    for (xi = 0; xi < 2; xi += 1) {
      for (yi = 0; yi < 2; yi += 1) {
        for (zi = 0; zi < 2; zi += 1) {
          ringCorner.set(xi ? xe : xs, yi ? ye : ys, zi ? ze : zs);
          ringCorner.project(camera);
          if (Math.abs(ringCorner.x) > ndcLimit || Math.abs(ringCorner.y) > ndcLimit || ringCorner.z > 1) {
            return false;
          }
        }
      }
    }

    return true;
  }

  function ensureRingFitsAllRotations(dist, pivotY, pivotZ, vFovRad, hFovRad, ndcLimit) {
    var savedRot = rotationY;
    var safe = dist;
    var tries = 0;
    var i;
    var ok;

    while (tries < 12) {
      ok = true;

      for (i = 0; i < COUNT; i += 1) {
        carousel.rotation.y = rotationForIndex(i);
        carousel.rotation.x = RING_TILT;
        if (!boundsFromVisibleSpins()) continue;
        if (!ringProjectsInside(safe, pivotY, pivotZ, vFovRad, hFovRad, ndcLimit)) {
          ok = false;
          break;
        }
      }

      if (ok) {
        carousel.rotation.y = savedRot;
        carousel.rotation.x = RING_TILT;
        carousel.updateWorldMatrix(true, true);
        return safe;
      }

      safe *= 1.04;
      tries += 1;
    }

    carousel.rotation.y = savedRot;
    carousel.rotation.x = RING_TILT;
    carousel.updateWorldMatrix(true, true);
    return safe;
  }

  function pointerToViewport(clientX, clientY) {
    var rect = viewport.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  function viewportRectMetrics() {
    if (!viewport) return null;
    var rect = viewport.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return null;
    return rect;
  }

  function projectWorldBoxToScreen(object, viewW, viewH) {
    itemHitBox.setFromObject(object);
    if (itemHitBox.isEmpty()) return null;

    var minPxX = Infinity;
    var minPxY = Infinity;
    var maxPxX = -Infinity;
    var maxPxY = -Infinity;
    var xi;
    var yi;
    var zi;
    var xs = [itemHitBox.min.x, itemHitBox.max.x];
    var ys = [itemHitBox.min.y, itemHitBox.max.y];
    var zs = [itemHitBox.min.z, itemHitBox.max.z];
    var px;
    var py;

    for (xi = 0; xi < 2; xi += 1) {
      for (yi = 0; yi < 2; yi += 1) {
        for (zi = 0; zi < 2; zi += 1) {
          hitProbe.set(xs[xi], ys[yi], zs[zi]);
          hitProbe.project(camera);
          px = (hitProbe.x * 0.5 + 0.5) * viewW;
          py = (-hitProbe.y * 0.5 + 0.5) * viewH;
          if (px < minPxX) minPxX = px;
          if (py < minPxY) minPxY = py;
          if (px > maxPxX) maxPxX = px;
          if (py > maxPxY) maxPxY = py;
        }
      }
    }

    var bw = maxPxX - minPxX;
    var bh = maxPxY - minPxY;
    if (!(bw > 0) || !(bh > 0)) return null;

    return {
      x: (minPxX + maxPxX) * 0.5,
      y: (minPxY + maxPxY) * 0.5,
      width: bw,
      height: bh,
    };
  }

  function clampHitScreenSize(bw, bh, fitW, fitH, viewW, viewH, mobile) {
    var aspect = fitW / Math.max(fitH, 0.001);
    var maxBw = bh * aspect * 1.18;
    if (bw > maxBw) bw = maxBw;

    bw = Math.min(bw, viewW * (mobile ? 0.46 : 0.38));
    bh = Math.min(bh, viewH * (mobile ? 0.52 : 0.46));
    bw = Math.max(bw, mobile ? 84 : 100);
    bh = Math.max(bh, mobile ? 100 : 120);

    return { width: bw, height: bh };
  }

  function captureRestHitScreen(i, viewW, viewH) {
    var anchor = anchors[i];
    var spin = anchor && anchor.userData.spin;
    var flip = anchor && anchor.userData.flip;
    var root = flip && flip.children[0];
    if (!anchor || !spin || !flip || !root || !carousel) return;

    var savedCarouselY = carousel.rotation.y;
    var savedSpinY = spin.rotation.y;
    var savedFlipX = flip.rotation.x;
    var savedFlipY = flip.rotation.y;
    var savedFlipZ = flip.rotation.z;
    var savedScale = spin.scale.x;

    carousel.rotation.y = rotationForIndex(i);
    spin.rotation.y = idleSpinYFor(i);
    flip.rotation.set(0, 0, 0);
    spin.scale.setScalar(FRONT_SCALE);
    carousel.updateWorldMatrix(true, true);
    spin.updateWorldMatrix(true, true);
    root.updateWorldMatrix(true, false);

    var screen = projectWorldBoxToScreen(root, viewW, viewH);
    var fitW = root.userData.fitWidth || MODEL_SIZE;
    var fitH = root.userData.fitHeight || MODEL_SIZE;
    var mobile = viewW < 768;

    carousel.rotation.y = savedCarouselY;
    spin.rotation.y = savedSpinY;
    flip.rotation.set(savedFlipX, savedFlipY, savedFlipZ);
    spin.scale.setScalar(savedScale);

    if (!screen) return;

    var clamped = clampHitScreenSize(screen.width, screen.height, fitW, fitH, viewW, viewH, mobile);
    anchor.userData.restHitScreenW = clamped.width;
    anchor.userData.restHitScreenH = clamped.height;
  }

  function captureAllRestHitScreens() {
    var rect = viewportRectMetrics();
    if (!ready || !rect || !camera) return;

    var pausedLoop = rafId !== 0;
    if (pausedLoop) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }

    var i;
    for (i = 0; i < COUNT; i += 1) {
      captureRestHitScreen(i, rect.width, rect.height);
    }

    if (pausedLoop && shouldRenderLoop()) {
      startLoop();
    }
  }

  function slotScaleForItem(i) {
    var dist = angularDistFromFront(i);
    var blend = Math.min(dist, 1);
    var mobile = isMobileViewport();
    return Math.max(mobile ? 0.34 : 0.5, FRONT_SCALE - blend * (mobile ? 0.48 : 0.36));
  }

  function projectItemHitZone(i) {
    if (!camera || !viewport || !anchors[i]) return null;

    var dist = angularDistFromFront(i);
    if (dist >= 0.85) return null;

    var anchor = anchors[i];
    var flip = anchor.userData.flip;
    var root = flip && flip.children[0];
    if (!flip || !root) return null;

    var rect = viewportRectMetrics();
    if (!rect) return null;

    var viewW = rect.width;
    var viewH = rect.height;
    var fitW = root.userData.fitWidth || MODEL_SIZE;
    var fitH = root.userData.fitHeight || MODEL_SIZE;
    var item = ITEMS[i];
    var zoneScale = typeof item.hitZoneScale === "number" ? item.hitZoneScale : 0.94;
    var mobile = isMobileViewport();
    var restW = anchor.userData.restHitScreenW;
    var restH = anchor.userData.restHitScreenH;

    carousel.updateWorldMatrix(true, true);
    root.updateWorldMatrix(true, false);
    itemHitBox.setFromObject(root);
    itemHitBox.getCenter(hitProbe);
    hitProbe.project(camera);

    var cx = (hitProbe.x * 0.5 + 0.5) * viewW;
    var cy = (-hitProbe.y * 0.5 + 0.5) * viewH;

    if (!(restW > 0) || !(restH > 0)) {
      var live = projectWorldBoxToScreen(root, viewW, viewH);
      if (!live) return null;
      restW = live.width;
      restH = live.height;
    }

    var bw = restW * slotScaleForItem(i) * zoneScale;
    var bh = restH * slotScaleForItem(i) * zoneScale;
    var clamped = clampHitScreenSize(bw, bh, fitW, fitH, viewW, viewH, mobile);
    bw = clamped.width;
    bh = clamped.height;

    return {
      x: cx,
      y: cy,
      width: bw,
      height: bh,
      minX: cx - bw * 0.5,
      maxX: cx + bw * 0.5,
      minY: cy - bh * 0.5,
      maxY: cy + bh * 0.5,
      active: true,
    };
  }

  function pointInHitZone(pt, zone, pad) {
    var inset = pad || 0;
    return (
      pt.x >= zone.minX - inset &&
      pt.x <= zone.maxX + inset &&
      pt.y >= zone.minY - inset &&
      pt.y <= zone.maxY + inset
    );
  }

  function getItemAngularOffset(i) {
    var offset = rotationY + i * THETA;
    offset = mod(offset + Math.PI, TAU) - Math.PI;
    return offset;
  }

  function labelXPercentForItem(i) {
    var offset = getItemAngularOffset(i);
    var slots = isMobileViewport() ? LABEL_SLOT_X_SM : LABEL_SLOT_X;
    var t = Math.max(-1, Math.min(1, offset / THETA));

    if (t >= 0) {
      return slots[1] + (slots[0] - slots[1]) * t;
    }

    return slots[1] + (slots[2] - slots[1]) * -t;
  }

  function labelStateForItem(i) {
    var dist = angularDistFromFront(i);
    var blend = Math.min(dist, 1);

    return {
      x: labelXPercentForItem(i),
      opacity: Math.max(0.28, 1 - blend * 0.34),
      visible: dist < 0.96,
    };
  }

  function pickSlotIndex(clientX, clientY) {
    var pt = pointerToViewport(clientX, clientY);
    var i;
    var zone;
    var best = -1;
    var bestDist = Infinity;

    if (hoveredIndex >= 0) {
      zone = projectItemHitZone(hoveredIndex);
      if (zone && pointInHitZone(pt, zone, HOVER_STICKY_PAD)) {
        return hoveredIndex;
      }
    }

    for (i = 0; i < COUNT; i += 1) {
      zone = projectItemHitZone(i);
      if (!zone || !zone.active) continue;
      if (!pointInHitZone(pt, zone, 0)) continue;
      var d = angularDistFromFront(i);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }

    return best;
  }

  function angularDistFromFront(i) {
    return Math.abs(getItemAngularOffset(i)) / THETA;
  }

  function clearModelHover() {
    if (hoverTween) {
      hoverTween.kill();
      hoverTween = null;
    }
    hoverTiltTargetX = 0;
    hoverTiltTargetZ = 0;
    hoverTiltTargetY = 0;
    if (hoveredIndex >= 0) {
      if (hitButtons[hoveredIndex]) hitButtons[hoveredIndex].classList.remove("is-hovered");
      setModelHover(hoveredIndex, false, true);
      hoveredIndex = -1;
    }
  }

  function resetHoverTilt(flip) {
    hoverTiltX = 0;
    hoverTiltZ = 0;
    hoverTiltY = 0;
    hoverTiltTargetX = 0;
    hoverTiltTargetZ = 0;
    hoverTiltTargetY = 0;
    if (flip) {
      flip.rotation.x = 0;
      flip.rotation.y = 0;
      flip.rotation.z = 0;
    }
  }

  function facingKey(name) {
    var key = (name || "").trim().toLowerCase();
    if (key === "n" || key === "north") return "n";
    if (key === "s" || key === "south") return "s";
    if (key === "e" || key === "east") return "e";
    if (key === "w" || key === "west") return "w";
    return "";
  }

  function captureModelFacing(root, item) {
    var markers = { n: null, s: null, e: null, w: null };
    var dir = new THREE.Vector3(0, 0, 1);

    root.traverse(function (node) {
      var key = facingKey(node.name);
      if (key) markers[key] = node;
    });

    if (markers.s) {
      root.updateWorldMatrix(true, false);
      markers.s.getWorldPosition(faceMarkerPos);
      root.getWorldPosition(faceSpinOrigin);
      dir.copy(faceMarkerPos).sub(faceSpinOrigin);
      root.worldToLocal(dir.add(faceSpinOrigin));
    } else if (markers.n) {
      root.updateWorldMatrix(true, false);
      markers.n.getWorldPosition(faceMarkerPos);
      root.getWorldPosition(faceSpinOrigin);
      dir.copy(faceSpinOrigin).sub(faceMarkerPos);
      root.worldToLocal(dir.add(faceSpinOrigin));
    } else if (markers.e) {
      dir.set(1, 0, 0);
    } else if (markers.w) {
      dir.set(-1, 0, 0);
    }

    if (dir.lengthSq() < 1e-8) {
      dir.set(0, 0, 1);
    }
    dir.normalize();

    if (typeof item.faceSouthYaw === "number") {
      dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), item.faceSouthYaw);
    }

    root.userData.faceSouthLocal = dir.clone();
  }

  function southWorldFromSpin(spin, root, spinY) {
    var local = root.userData.faceSouthLocal || faceSouthLocal;
    var savedY = spin.rotation.y;
    spin.rotation.y = spinY;
    spin.updateWorldMatrix(true, true);
    faceSouthWorld.copy(local).transformDirection(spin.matrixWorld);
    faceSouthWorld.y = 0;
    if (faceSouthWorld.lengthSq() < 1e-8) {
      faceSouthWorld.set(0, 0, 1);
    } else {
      faceSouthWorld.normalize();
    }
    spin.rotation.y = savedY;
    return faceSouthWorld;
  }

  function outwardDirXZForAnchor(i) {
    var anchor = anchors[i];
    if (!anchor || !carousel) {
      faceCamDir.set(0, 0, 1);
      return faceCamDir;
    }

    var restAngle =
      typeof anchor.userData.restAngle === "number" ? anchor.userData.restAngle : i * THETA;

    faceCamDir.set(Math.sin(restAngle), 0, Math.cos(restAngle));
    carousel.updateWorldMatrix(true, true);
    faceCamDir.transformDirection(carousel.matrixWorld);
    faceCamDir.y = 0;
    if (faceCamDir.lengthSq() < 1e-8) {
      faceCamDir.set(0, 0, 1);
    } else {
      faceCamDir.normalize();
    }
    return faceCamDir;
  }

  function computeOutwardIdleSpinY(i) {
    var spin = anchors[i] && anchors[i].userData.spin;
    var flip = anchors[i] && anchors[i].userData.flip;
    var root = flip && flip.children[0];
    if (!spin || !root) return 0;

    var outward = outwardDirXZForAnchor(i);
    var southAtZero = southWorldFromSpin(spin, root, 0);
    var angleSouth = Math.atan2(southAtZero.x, southAtZero.z);
    var angleOut = Math.atan2(outward.x, outward.z);
    var idleY = angleOut - angleSouth;
    idleY = mod(idleY + Math.PI, TAU) - Math.PI;
    return idleY;
  }

  function idleSpinYFor(i) {
    return computeOutwardIdleSpinY(i);
  }

  function nearestSpinY(currentY, targetY) {
    var delta = targetY - currentY;
    delta = mod(delta + Math.PI, TAU) - Math.PI;
    return currentY + delta;
  }

  function killIdleReturnTween(i) {
    var anchor = anchors[i];
    if (!anchor) return;
    if (anchor.userData.idleReturnTween) {
      anchor.userData.idleReturnTween.kill();
      anchor.userData.idleReturnTween = null;
    }
    anchor.userData.idleReturning = false;
  }

  function killAllIdleReturnTweens() {
    var i;
    for (i = 0; i < COUNT; i += 1) {
      killIdleReturnTween(i);
    }
  }

  function tweenSpinToIdle(i, immediate) {
    var anchor = anchors[i];
    var spin = anchor && anchor.userData.spin;
    if (!spin || hoveredIndex === i) return;

    var targetY = nearestSpinY(spin.rotation.y, idleSpinYFor(i));

    killIdleReturnTween(i);

    if (immediate || reduced || !window.gsap || Math.abs(spin.rotation.y - targetY) < 0.001) {
      spin.rotation.y = targetY;
      return;
    }

    var spinState = { y: spin.rotation.y };
    anchor.userData.idleReturning = true;
    anchor.userData.idleReturnTween = window.gsap.to(spinState, {
      y: targetY,
      duration: IDLE_RETURN_MS / 1000,
      ease: "power3.out",
      onUpdate: function () {
        spin.rotation.y = spinState.y;
      },
      onComplete: function () {
        spin.rotation.y = targetY;
        anchor.userData.idleReturning = false;
        anchor.userData.idleReturnTween = null;
      },
    });
  }

  function resetItemToIdlePose(i, immediate) {
    tweenSpinToIdle(i, immediate);
  }

  function applyIdleSpin(i, includeFront) {
    var anchor = anchors[i];
    var spin = anchor && anchor.userData.spin;
    if (!spin || hoveredIndex === i) return;
    if (!includeFront && i === index) return;
    if (anchor.userData.idleReturning) return;
    spin.rotation.y = idleSpinYFor(i);
  }

  function resetAllToIdlePose(immediate) {
    var i;
    for (i = 0; i < COUNT; i += 1) {
      if (i === hoveredIndex || i === index) continue;
      tweenSpinToIdle(i, immediate);
    }
  }

  function assignIdleSpins(includeFront) {
    var i;
    for (i = 0; i < COUNT; i += 1) {
      if (!anchors[i] || !anchors[i].userData.spin) continue;
      applyIdleSpin(i, includeFront);
    }
  }

  function maintainIdleSpins() {
    if (animating || dragging || revealActive || revealProgress < 0.98) return;
    var i;
    for (i = 0; i < COUNT; i += 1) {
      if (i === index) continue;
      applyIdleSpin(i, false);
    }
  }

  function setModelHover(i, on, immediate) {
    var spin = anchors[i] && anchors[i].userData.spin;
    var flip = anchors[i] && anchors[i].userData.flip;
    if (!spin || !flip) return;

    if (hoverTween) {
      hoverTween.kill();
      hoverTween = null;
    }
    killIdleReturnTween(i);

    if (on) {
      var targetY = idleSpinYFor(i);
      if (immediate || reduced || !window.gsap) {
        spin.rotation.y = targetY;
        return;
      }
      hoverTween = window.gsap.to(spin.rotation, {
        y: targetY,
        duration: HOVER_FACE_MS / 1000,
        ease: "power3.out",
      });
      return;
    }

    resetItemToIdlePose(i, immediate);
    resetHoverTilt(null);
    if (immediate || reduced || !window.gsap) {
      resetHoverTilt(flip);
      return;
    }
    hoverTween = window.gsap.to(flip.rotation, {
      y: 0,
      x: 0,
      z: 0,
      duration: HOVER_FACE_MS / 1000,
      ease: "power3.out",
    });
  }

  function updateModelHover(clientX, clientY) {
    if (!ready || dragging || animating) return;

    var picked = pickSlotIndex(clientX, clientY);
    updateHoverTilt(clientX, clientY);

    if (picked === hoveredIndex) return;

    if (hoveredIndex >= 0) {
      if (hitButtons[hoveredIndex]) hitButtons[hoveredIndex].classList.remove("is-hovered");
      setModelHover(hoveredIndex, false);
    }

    hoveredIndex = picked;

    if (hoveredIndex >= 0) {
      if (hitButtons[hoveredIndex]) hitButtons[hoveredIndex].classList.add("is-hovered");
      setModelHover(hoveredIndex, true);
    }
  }

  function updateHoverTilt(clientX, clientY) {
    if (hoveredIndex < 0) {
      hoverTiltTargetX = 0;
      hoverTiltTargetZ = 0;
      hoverTiltTargetY = 0;
      return;
    }

    var zone = projectItemHitZone(hoveredIndex);
    if (!zone || !zone.active) {
      hoverTiltTargetX = 0;
      hoverTiltTargetZ = 0;
      hoverTiltTargetY = 0;
      return;
    }

    var pt = pointerToViewport(clientX, clientY);
    var nx = (pt.x - zone.x) / Math.max(viewport.clientWidth * 0.18, 1);
    var ny = (pt.y - zone.y) / Math.max(viewport.clientHeight * 0.18, 1);
    nx = Math.max(-1, Math.min(1, nx));
    ny = Math.max(-1, Math.min(1, ny));

    hoverTiltTargetX = ny * -0.14;
    hoverTiltTargetZ = nx * 0.1;
    hoverTiltTargetY = nx * 0.06;
  }

  function applyRotation(rotValue, forcedIndex, opts) {
    rotationY = rotValue;
    if (carousel) {
      carousel.rotation.x = RING_TILT;
      carousel.rotation.y = rotationY;
    }
    if (typeof forcedIndex === "number") {
      index = mod(forcedIndex, COUNT);
    } else {
      index = indexFromRotation(rotationY);
    }
    updateChrome();
    if (!opts || opts.skipPresence !== true) {
      updateSlidePresence();
    }
  }

  function updateSlidePresence() {
    var i;
    var spin;
    var dist;
    var opacity;
    var scale;
    var blend;
    var mobile = isMobileViewport();
    for (i = 0; i < anchors.length; i += 1) {
      spin = anchors[i].userData.spin;
      if (!spin) continue;
      dist = angularDistFromFront(i);
      blend = Math.min(dist, 1);

      spin.visible = true;
      scale = FRONT_SCALE - blend * (mobile ? 0.48 : 0.36);
      opacity = 1 - blend * (mobile ? 0.55 : 0.34);
      spin.scale.setScalar(Math.max(mobile ? 0.34 : 0.5, scale));

      spin.traverse(function (node) {
        if (!node.isMesh || !node.material) return;
        var mats = Array.isArray(node.material) ? node.material : [node.material];
        var m;

        for (m = 0; m < mats.length; m += 1) {
          applySlideOpacity(mats[m], opacity);
        }
      });
    }
  }

  function frameCamera() {
    if (!camera || !viewport || !carousel) return;

    var viewW = viewport.clientWidth;
    var viewH = viewport.clientHeight;
    if (viewW <= 8 || viewH <= 8) return;

    carousel.updateWorldMatrix(true, true);
    if (revealCameraLock && revealProgress < 0.999) {
      applyMeasuredCamera(revealCameraLock);
      return;
    }
    applyMeasuredCamera(measureCamera());
  }

  function updateLabelPositions() {
    if (!ready || !hitButtons.length) return;

    var i;
    var label;
    var btn;

    for (i = 0; i < anchors.length; i += 1) {
      btn = hitButtons[i];
      if (!btn) continue;

      label = labelStateForItem(i);

      btn.style.left = label.x + "%";
      btn.style.top = "auto";
      btn.style.width = "auto";
      btn.style.height = "auto";
      btn.style.transform = "translateX(-50%)";

      if (!label.visible) {
        btn.style.opacity = "0";
        btn.style.visibility = "hidden";
        btn.style.pointerEvents = "none";
        continue;
      }

      btn.style.visibility = "visible";
      btn.style.opacity = String(label.opacity * Math.max(0, Math.min(1, revealProgress)));
      btn.style.pointerEvents =
        label.opacity * revealProgress > 0.42 && revealProgress > 0.72 ? "auto" : "none";
    }
  }

  function animateRotation(targetRot, targetIndex, onComplete) {
    if (tween) {
      tween.kill();
      tween = null;
      setAnimating(false);
    }

    killAllIdleReturnTweens();

    var current = rotationY;
    var resolvedIndex =
      typeof targetIndex === "number" ? mod(targetIndex, COUNT) : indexFromRotation(targetRot);

    if (reduced || !window.gsap) {
      applyRotation(targetRot, resolvedIndex);
      settleRotation();
      if (onComplete) onComplete();
      return;
    }

    if (Math.abs(current - targetRot) < 0.001) {
      applyRotation(targetRot, resolvedIndex);
      settleRotation();
      if (onComplete) onComplete();
      return;
    }

    setAnimating(true);
    clearModelHover();
    var state = { rot: current };

    tween = window.gsap.to(state, {
      rot: targetRot,
      duration: SNAP_MS / 1000,
      ease: "power3.inOut",
      onUpdate: function () {
        applyRotation(state.rot);
      },
      onComplete: function () {
        applyRotation(targetRot, resolvedIndex);
        settleRotation();
        setAnimating(false);
        tween = null;
        if (onComplete) onComplete();
      },
    });
  }

  function goTo(nextIndex, animate) {
    if (!ready) return;
    var target = mod(nextIndex, COUNT);
    var targetRot = nearestRotation(rotationY, target);
    if (animate === false) {
      applyRotation(targetRot, target);
      settleRotation();
      frameCamera();
      resetAllToIdlePose(true);
      return;
    }
    animateRotation(targetRot, target, resetAllToIdlePose);
  }

  function next() {
    goTo(index + 1, true);
  }

  function prev() {
    goTo(index - 1, true);
  }

  function openCurrent() {
    if (!ready) return;
    navigate(ITEMS[index].href);
  }

  function syncToView(view) {
    if (!ready) return;
    goTo(slideIndexForView(view), false);
    renderFrame();
  }

  function resumeMenu(opts) {
    opts = opts || {};
    visible = menuIsOpen();
    if (!ready) return;

    killAllIdleReturnTweens();

    function reflow() {
      resize();
      if (!opts.revealing && !revealActive && revealProgress >= 0.999) {
        assignIdleSpins(true);
      }
      if (!opts.revealing && !revealActive) {
        captureAllRestHitScreens();
      }
      renderFrame();
    }

    reflow();
    window.requestAnimationFrame(reflow);
    if (!rafId) startLoop();
  }

  function pauseMenu() {
    visible = false;
    clearModelHover();
    clearWheelStepLock();
    clearArrowEngage();
    killMenuReveal();
    window.cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function normalizeModel(root, item) {
    var useNormalize = item.normalize !== false;
    var itemScale = itemModelScale(item);

    if (!useNormalize) {
      centerModelOnPedestal(root);
      if (itemScale !== 1) {
        root.scale.multiplyScalar(itemScale);
        centerModelOnPedestal(root);
      }
      stampModelFitMetrics(root);
      return;
    }

    var box = new THREE.Box3().setFromObject(root);
    var size = box.getSize(new THREE.Vector3());
    var targetSize = itemModelTargetSize(item);
    var fit = targetSize * 0.9;
    var scaleY = fit / Math.max(size.y, 0.001);
    var scaleXZ = fit / Math.max(size.x, size.z, 0.001);
    var scale = Math.min(scaleY, scaleXZ);

    root.scale.setScalar(scale);
    centerModelOnPedestal(root);
    stampModelFitMetrics(root);
  }

  function captureGltfMaterialState(mat) {
    if (mat.userData.menuGltfCaptured) return;
    mat.userData.menuGltfCaptured = true;
    mat.userData.menuGltfTransparent = !!mat.transparent;
    mat.userData.menuGltfOpacity = typeof mat.opacity === "number" ? mat.opacity : 1;
    mat.userData.menuGltfAlphaTest = typeof mat.alphaTest === "number" ? mat.alphaTest : 0;
  }

  function isShellMaterial(node, mat) {
    if (mat.userData.menuGltfTransparent && mat.userData.menuGltfOpacity < 0.985) return true;
    if (mat.userData.menuGltfAlphaTest > 0) return false;

    var label = ((node.name || "") + " " + (mat.name || "")).toLowerCase();
    if (/inner|core|art|label|photo|card_body|chip|pcb/.test(label)) return false;
    if (/shell|glass|cover|outer|frame|window|face|plastic|lid/.test(label)) return true;
    return false;
  }

  function stampMaterialBase(mat) {
    mat.userData.menuBaseOpacity = typeof mat.opacity === "number" ? mat.opacity : 1;
    mat.userData.menuBaseTransparent = !!mat.transparent;
    mat.userData.menuBaseDepthWrite = mat.depthWrite !== false;
  }

  function applySlideOpacity(mat, slideOpacity) {
    var baseOpacity =
      mat.userData.menuBaseOpacity != null ? mat.userData.menuBaseOpacity : 1;
    var finalOpacity = slideOpacity * baseOpacity;
    var baseTransparent = !!mat.userData.menuBaseTransparent;

    mat.opacity = finalOpacity;
    mat.transparent = baseTransparent || finalOpacity < 0.999;

    if (baseTransparent) {
      mat.depthWrite = false;
    } else {
      mat.depthWrite = finalOpacity > 0.65;
    }
  }

  function configureInsightsTransparency(root) {
    var meshes = [];

    root.traverse(function (node) {
      if (!node.isMesh || !node.material) return;
      var mats = Array.isArray(node.material) ? node.material : [node.material];
      var i;

      for (i = 0; i < mats.length; i += 1) {
        var mat = mats[i];
        captureGltfMaterialState(mat);

        if (isShellMaterial(node, mat)) {
          mat.transparent = true;
          mat.depthWrite = false;
          mat.side = THREE.FrontSide;
        } else {
          mat.transparent = !!mat.userData.menuGltfTransparent;
          mat.depthWrite = !mat.transparent;
          mat.opacity = mat.userData.menuGltfOpacity;
          mat.alphaTest = mat.userData.menuGltfAlphaTest;
          mat.side = mat.userData.menuGltfSide || THREE.FrontSide;
        }

        mat.needsUpdate = true;
      }

      meshes.push(node);
    });

    meshes.sort(function (a, b) {
      var boxA = new THREE.Box3().setFromObject(a);
      var boxB = new THREE.Box3().setFromObject(b);
      return (
        boxA.getSize(new THREE.Vector3()).lengthSq() -
        boxB.getSize(new THREE.Vector3()).lengthSq()
      );
    });

    meshes.forEach(function (mesh, idx) {
      mesh.renderOrder = idx;
    });
  }
  function prepareModelMaterials(root, itemId) {
    root.traverse(function (node) {
      if (!node.isMesh || !node.material) return;
      var mats = Array.isArray(node.material) ? node.material : [node.material];
      var i;

      for (i = 0; i < mats.length; i += 1) {
        var mat = mats[i];
        captureGltfMaterialState(mat);

        if (mat.color) mat.color.multiplyScalar(1.14);
        if (mat.emissive && mat.emissive.isColor && mat.color) {
          mat.emissive.copy(mat.color).multiplyScalar(0.04);
        }
        if (typeof mat.roughness === "number") {
          mat.roughness = Math.min(mat.roughness, 0.72);
        }
        if (typeof mat.metalness === "number") {
          mat.metalness = Math.min(mat.metalness, 0.35);
        }

        if (itemId !== "insights") {
          mat.transparent = !!mat.userData.menuGltfTransparent;
          mat.depthWrite = !mat.transparent;
          mat.side = THREE.FrontSide;
        }

        stampMaterialBase(mat);
        mat.needsUpdate = true;
      }
    });

    if (itemId === "insights") {
      configureInsightsTransparency(root);
      root.traverse(function (node) {
        if (!node.isMesh || !node.material) return;
        var mats = Array.isArray(node.material) ? node.material : [node.material];
        var i;
        for (i = 0; i < mats.length; i += 1) {
          stampMaterialBase(mats[i]);
        }
      });
    }
  }

  function addLights() {
    var ambient = new THREE.AmbientLight(0xf6f4fc, 0.92);
    var hemi = new THREE.HemisphereLight(0xfff6ff, 0xb8a8c8, 0.48);
    var key = new THREE.DirectionalLight(0xffffff, 0.72);
    key.position.set(0.8, 5.2, 4.8);
    var fill = new THREE.DirectionalLight(0xf0e8ff, 0.38);
    fill.position.set(-2.8, 3.2, 3.4);
    scene.add(ambient, hemi, key, fill);

    var camLight = new THREE.PointLight(0xffffff, 1.55, 24, 1.4);
    camLight.position.set(0, 0.2, 0.45);
    camera.add(camLight);
  }

  function addPedestal() {
    /* floor shadow only — no visible box */
  }

  function createAnchors() {
    var i;
    var angle;

    for (i = 0; i < COUNT; i += 1) {
      angle = i * THETA;
      var anchor = new THREE.Group();
      anchor.position.set(Math.sin(angle) * RADIUS, 0, Math.cos(angle) * RADIUS);
      anchor.rotation.y = Math.PI - angle;
      anchor.userData.restAngle = angle;
      anchor.userData.index = i;
      carousel.add(anchor);
      anchors.push(anchor);
    }
  }

  function loadModels() {
    var loader = new GLTFLoader();
    return Promise.all(
      ITEMS.map(function (item, i) {
        return new Promise(function (resolve, reject) {
          loader.load(
            item.model,
            function (gltf) {
              var root = gltf.scene;
              normalizeModel(root, item);
              captureModelFacing(root, item);
              prepareModelMaterials(root, item.id);
              root.traverse(function (node) {
                if (node.isMesh) {
                  node.userData.index = i;
                  pickables.push(node);
                }
              });
              var spin = new THREE.Group();
              var flip = new THREE.Group();
              anchors[i].add(spin);
              spin.add(flip);
              flip.add(root);
              anchors[i].userData.spin = spin;
              anchors[i].userData.flip = flip;
              resolve();
            },
            undefined,
            reject
          );
        });
      })
    );
  }

  function setupThree() {
    canvas = section.querySelector("[data-menu-select-canvas]");
    if (!canvas || !viewport) return false;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 50);

    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.sortObjects = true;

    raycaster = new THREE.Raycaster();
    pointerNdc = new THREE.Vector2();

    carousel = new THREE.Group();
    carousel.rotation.x = RING_TILT;
    carousel.position.y = ringY();
    scene.add(carousel);

    addLights();
    addPedestal();
    createAnchors();
    frameCamera();

    return true;
  }

  function resize() {
    if (!renderer || !viewport) return;

    var w = viewport.clientWidth;
    var h = viewport.clientHeight;
    if (w <= 0 || h <= 0) return;

    renderer.setSize(w, h, false);
    frameCamera();
    if (!revealActive) {
      captureAllRestHitScreens();
    }
    updateLabelPositions();
  }

  function renderFrame() {
    if (!ready || !shouldRenderLoop()) return;

    maintainIdleSpins();

    if (IDLE_SPIN && !dragging && !animating && !revealActive && revealProgress > 0.96 && hoveredIndex < 0) {
      var front = anchors[index];
      if (front && front.userData.spin && !front.userData.idleReturning) {
        front.userData.spin.rotation.y += IDLE_SPIN * 0.009;
      }
    }

    if (hoveredIndex >= 0) {
      var hoveredFlip = anchors[hoveredIndex] && anchors[hoveredIndex].userData.flip;
      if (hoveredFlip) {
        hoverTiltX += (hoverTiltTargetX - hoverTiltX) * HOVER_TILT_MS;
        hoverTiltZ += (hoverTiltTargetZ - hoverTiltZ) * HOVER_TILT_MS;
        hoverTiltY += (hoverTiltTargetY - hoverTiltY) * HOVER_TILT_MS;
        hoveredFlip.rotation.x = hoverTiltX;
        hoveredFlip.rotation.z = hoverTiltZ;
        hoveredFlip.rotation.y = hoverTiltY;
      }
    }

    updateLabelPositions();
    renderer.render(scene, camera);
  }

  function startLoop() {
    window.cancelAnimationFrame(rafId);
    function loop() {
      renderFrame();
      if (shouldRenderLoop()) {
        rafId = window.requestAnimationFrame(loop);
      } else {
        rafId = 0;
      }
    }
    loop();
  }

  function bindDrag() {
    if (!viewport) return;

    viewport.addEventListener(
      "pointerdown",
      function (e) {
        if (e.button !== 0 || !ready || !menuIsOpen()) return;
        if (e.target.closest("[data-menu-select-prev], [data-menu-select-next], [data-menu-select-hit]")) {
          return;
        }
        clearModelHover();
        dragging = true;
        suppressClick = false;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragLastX = e.clientX;
        dragLastY = e.clientY;
        dragLastTs = performance.now();
        dragVelocity = 0;
        dragVelocityY = 0;
        dragStartRot = rotationY;
        viewport.classList.add("is-dragging");
        section.classList.add("is-dragging");
        viewport.setPointerCapture(e.pointerId);
        if (tween) {
          tween.kill();
          tween = null;
        }
        setAnimating(false);
      },
      { passive: true }
    );

    viewport.addEventListener(
      "pointermove",
      function (e) {
        if (dragging) {
          var now = performance.now();
          var dx = e.clientX - dragStartX;
          var dy = e.clientY - dragStartY;
          var dt = Math.max(8, now - dragLastTs);

          dragVelocity = (e.clientX - dragLastX) / dt;
          dragVelocityY = (e.clientY - dragLastY) / dt;
          dragLastX = e.clientX;
          dragLastY = e.clientY;
          dragLastTs = now;

          if (Math.abs(dx) >= Math.abs(dy)) {
            applyRotation(dragStartRot + dx * DRAG_RATIO);
          } else {
            applyRotation(dragStartRot - dy * DRAG_RATIO);
          }
          return;
        }
        updateModelHover(e.clientX, e.clientY);
      },
      { passive: true }
    );

    viewport.addEventListener(
      "pointerleave",
      function () {
        clearModelHover();
      },
      { passive: true }
    );

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      viewport.classList.remove("is-dragging");
      section.classList.remove("is-dragging");
      try {
        viewport.releasePointerCapture(e.pointerId);
      } catch (err) {}

      var dx = e.clientX - dragStartX;
      var dy = e.clientY - dragStartY;

      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        suppressClick = true;
      }

      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
        if (dy > 0) next();
        else prev();
        return;
      }

      var flick = dragVelocity * 0.34;
      var projected = rotationY + flick;
      var targetIndex = indexFromRotation(projected);
      goTo(targetIndex, true);
    }

    viewport.addEventListener("pointerup", endDrag, { passive: true });
    viewport.addEventListener("pointercancel", endDrag, { passive: true });

    viewport.addEventListener(
      "click",
      function (e) {
        if (suppressClick || !ready) {
          suppressClick = false;
          return;
        }
        e.stopPropagation();
        var picked = pickSlotIndex(e.clientX, e.clientY);
        if (picked < 0) return;
        if (picked === index) {
          openCurrent();
          return;
        }
        goTo(picked, true);
      },
      false
    );
  }

  function bindControls() {
    arrowPrevBtn = section.querySelector("[data-menu-select-prev]");
    arrowNextBtn = section.querySelector("[data-menu-select-next]");

    if (arrowPrevBtn) {
      arrowPrevBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        prev();
      });
    }
    if (arrowNextBtn) {
      arrowNextBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        next();
      });
    }

    hitButtons = Array.prototype.slice.call(section.querySelectorAll("[data-menu-select-hit]"));
    titleButtons = Array.prototype.slice.call(section.querySelectorAll("[data-menu-select-title]"));
    hitButtons.forEach(function (btn, i) {
      btn.addEventListener("pointerenter", function () {
        var item = ITEMS[i];
        if (!item || !window.AimySpaPrefetch || typeof window.AimySpaPrefetch.warmView !== "function") return;
        if (item.id === "work" || item.id === "insights") {
          window.AimySpaPrefetch.warmView(item.id);
        }
      });
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (i === index) {
          openCurrent();
          return;
        }
        goTo(i, true);
      });
    });

    section.addEventListener("keydown", function (e) {
      if (!ready || !menuIsOpen()) return;
      if (e.key === "Enter" || e.key === " ") {
        if (document.activeElement === hitButtons[index]) {
          e.preventDefault();
          openCurrent();
        }
      }
    });
  }

  function bootSection(target) {
    section = target;
    if (!section) return false;

    viewport = section.querySelector("[data-menu-select-viewport]");
    labelLayer = section.querySelector("[data-menu-select-labels]");
    hitButtons = Array.prototype.slice.call(section.querySelectorAll("[data-menu-select-hit]"));
    titleButtons = Array.prototype.slice.call(section.querySelectorAll("[data-menu-select-title]"));
    if (!setupThree()) return false;

    bindDrag();
    bindControls();
    bindMenuNavigation();
    resize();
    window.addEventListener("resize", resize, { passive: true });

    if (window.ResizeObserver && viewport) {
      var viewportObserver = new ResizeObserver(function () {
        resize();
      });
      viewportObserver.observe(viewport);
    }

    loadModels()
      .then(function () {
        ready = true;
        section.classList.add("is-ready");
        frameCamera();
        resize();
        captureAllRestHitScreens();
        goTo(slideIndexForView(getCurrentView()), false);
        assignIdleSpins(true);
        renderFrame();
        startLoop();
        visible = menuIsOpen();

        if (pendingReveal) {
          var queued = pendingReveal;
          pendingReveal = null;
          if (queued.open) {
            prepareMenuReveal();
          }
          runMenuReveal(queued.open, queued.onComplete);
        } else if (!menuIsOpen()) {
          applyRevealProgress(1);
        }

        window.requestAnimationFrame(function () {
          resize();
          assignIdleSpins(true);
          renderFrame();
        });
        window.setTimeout(function () {
          resize();
          assignIdleSpins(true);
          renderFrame();
        }, 160);
      })
      .catch(function (err) {
        console.error("[menu-select] GLB load failed:", err);
        section.classList.add("is-error");
      });

    return true;
  }

  function getCurrentView() {
    if (typeof window.__aimyPageKey === "function") {
      return window.__aimyPageKey();
    }
    if (
      window.AimySpa &&
      typeof window.AimySpa.isHost === "function" &&
      window.AimySpa.isHost() &&
      typeof window.AimySpa.getView === "function"
    ) {
      return window.AimySpa.getView();
    }

    var params = new URLSearchParams(window.location.search || "");
    var qView = params.get("view");
    if (qView) return qView;

    var path = (window.location.pathname || "").toLowerCase();
    if (path.match(/\/work\/?$/)) return "work";
    if (path.match(/\/insights\/?$/)) return "insights";
    if (path.match(/\/me\/?$/)) return "me";
    if (path.indexOf("about") !== -1) return "me";
    if (path.indexOf("insights") !== -1) return "insights";
    if (path.indexOf("lowpoly") !== -1) return "work";
    if (path.indexOf("gallery") !== -1) return "work";
    return "start";
  }

  function bootMenu() {
    if (ready) return;
    var target = document.querySelector("[data-pk-menu-select]");
    if (!target) return;
    if (booted) return;
    if (!bootSection(target)) return;
    booted = true;
  }

  window.AimyMenuSelect = {
    bootMenu: bootMenu,
    goTo: goTo,
    next: next,
    prev: prev,
    syncToView: syncToView,
    resumeMenu: resumeMenu,
    pauseMenu: pauseMenu,
    resize: resize,
    playMenuReveal: playMenuReveal,
  };
})();
