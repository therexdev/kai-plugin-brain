"use strict";
const STOP = new Set(
  "a an and are as at be but by for from has have i in is it its me my of on or our so that the their them they this to was we what when where which who will with you your".split(" ")
);

function tokens(text) {
  return String(text)
    .toLowerCase()
    .replace(/[’']/g, "")
    .split(/[^a-z0-9]+/)
    // Normalize common family plurals/possessives, not arbitrary names.
    .map(w => /^(?:daughter|son|wife|husband|child|mother|father|sister|brother|dog|cat)s$/.test(w) ? w.slice(0, -1) : w)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

module.exports={tokens};
