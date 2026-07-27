/**
 * Logo edge specular — PAUSED.
 *
 * Goal: white shine on the lit edge of each SVG part, following the cursor.
 *
 * What worked in browser testing (resume from here):
 * - Unique SVG filter per `.brand-layer[data-spec-edge]` (shared filter IDs fail)
 * - feFlood white → composite into SourceAlpha → feOffset away from light →
 *   white OUT offset = crescent → composite back onto SourceGraphic
 * - Clip/mask clones were unreliable (empty clip / invisible)
 *
 * Re-enable by removing the early return below and restoring the filter boot.
 */
(function () {
  "use strict";
  return; // paused — continue later
})();
