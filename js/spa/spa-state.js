/**
 * spa-state.js
 * Shared SPA session state — view id, work category, scroll restore.
 */
(function () {
  "use strict";

  var state = {
    view: "start",
    query: {},
    scrollY: {},
    ready: false,
  };

  window.AimySpaState = {
    get: function () {
      return {
        view: state.view,
        query: Object.assign({}, state.query),
      };
    },
    setView: function (view, query) {
      state.view = view || "start";
      state.query = query ? Object.assign({}, query) : {};
    },
    rememberScroll: function (view) {
      if (!view) return;
      state.scrollY[view] = window.scrollY || 0;
    },
    restoreScroll: function (view) {
      var y = state.scrollY[view] || 0;
      window.scrollTo(0, y);
    },
    setReady: function (v) {
      state.ready = !!v;
    },
    isReady: function () {
      return state.ready;
    },
  };
})();
