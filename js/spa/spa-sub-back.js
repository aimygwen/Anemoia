/**
 * spa-sub-back.js — shared sub-page Back control in header chrome.
 */
(function () {
  "use strict";

  var backEl = null;
  var clickHandler = null;

  function ensure() {
    if (backEl && document.body.contains(backEl)) return backEl;

    var header = document.querySelector(".site-header[data-aimy-chrome]");
    if (!header) return null;

    backEl = document.createElement("button");
    backEl.type = "button";
    backEl.className = "spa-sub-back";
    backEl.setAttribute("data-spa-sub-back", "");
    backEl.setAttribute("aria-label", "Return");
    backEl.innerHTML =
      '<span class="spa-sub-back__arrow" aria-hidden="true">\u2190</span>' +
      '<span class="spa-sub-back__label">RETURN</span>';
    backEl.hidden = true;
    backEl.addEventListener("click", function (e) {
      e.preventDefault();
      if (typeof clickHandler === "function") clickHandler(e);
    });
    header.appendChild(backEl);
    return backEl;
  }

  function show(options) {
    options = options || {};
    var el = ensure();
    if (!el) return;

    clickHandler = typeof options.onClick === "function" ? options.onClick : null;
    el.hidden = false;
    el.classList.add("is-visible");
    el.setAttribute("aria-hidden", "false");

    if (options.tone === "light") {
      el.setAttribute("data-spa-sub-back-tone", "light");
    } else {
      el.removeAttribute("data-spa-sub-back-tone");
    }
  }

  function hide() {
    if (!backEl) return;
    backEl.hidden = true;
    backEl.classList.remove("is-visible");
    backEl.setAttribute("aria-hidden", "true");
    backEl.removeAttribute("data-spa-sub-back-tone");
    clickHandler = null;
  }

  window.AimySpaSubBack = {
    ensure: ensure,
    show: show,
    hide: hide,
  };
})();
