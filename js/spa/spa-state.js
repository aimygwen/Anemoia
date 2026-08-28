/**
 * spa-state.js
 * Shared SPA session state — view id, work category, scroll restore, in-app back stack.
 */
(function () {
  "use strict";

  var state = {
    view: "start",
    query: {},
    scrollY: {},
    ready: false,
  };

  var stack = [];

  function cloneRoute(route) {
    route = route || {};
    return {
      view: route.view || "start",
      query: Object.assign({}, route.query || {}),
    };
  }

  function routeSig(route) {
    route = cloneRoute(route);
    return route.view + "\0" + JSON.stringify(route.query);
  }

  function routesSame(a, b) {
    return routeSig(a) === routeSig(b);
  }

  window.AimySpaState = {
    get: function () {
      return cloneRoute(state);
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
    resetStack: function (route) {
      stack = [cloneRoute(route)];
    },
    pushRoute: function (route) {
      route = cloneRoute(route);
      if (stack.length && routesSame(stack[stack.length - 1], route)) return;
      stack.push(route);
    },
    replaceRoute: function (route) {
      route = cloneRoute(route);
      if (!stack.length) {
        stack.push(route);
        return;
      }
      stack[stack.length - 1] = route;
    },
    syncStackTop: function (route) {
      route = cloneRoute(route);
      if (!stack.length) {
        stack.push(route);
        return;
      }
      stack[stack.length - 1] = route;
    },
    trimStackTo: function (route) {
      route = cloneRoute(route);
      var target = routeSig(route);
      var i;
      for (i = stack.length - 1; i >= 0; i--) {
        if (routeSig(stack[i]) === target) {
          stack = stack.slice(0, i + 1);
          return cloneRoute(stack[i]);
        }
      }
      stack.push(route);
      return route;
    },
    popRoute: function () {
      if (stack.length <= 1) return null;
      stack.pop();
      return cloneRoute(stack[stack.length - 1]);
    },
    peekPrevious: function () {
      if (stack.length < 2) return null;
      return cloneRoute(stack[stack.length - 2]);
    },
    stackDepth: function () {
      return stack.length;
    },
  };
})();
