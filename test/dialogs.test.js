"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../plugin/companion-hub.js"), "utf8");
function fixture() {
  const calls = [], handlers = {}, reviews = []; let answer;
  const state = { models: [], notes: [], goals: [], sources: [], workflows: [], connections: [], templates: [], runs: [] };
  const out = {}, message = { textContent: "", classList: { toggle() {} } };
  const host = { hidden: true, innerHTML: "", querySelector: selector => selector === ".hub-content" ? out : selector === ".hub-notice" ? message : null };
  const window = { KaiBrain: { render() {} }, KaiCompanionClient: { checked: async value => value }, kaiCompanionBridge: { async manage(action, input) { calls.push({ action, input }); return action === "status" ? state : {}; } }, kai: { dialogs: { confirm(message) { reviews.push(message); return new Promise(resolve => { answer = resolve; }); } } } };
  const context = { window, document: { getElementById: () => host, addEventListener(name, handler) { handlers[name] = handler; } }, KaiI18n: { html: (parts, ...values) => typeof parts === "string" ? parts : parts.reduce((out, part, i) => out + part + (values[i] ?? ""), "") }, setTimeout: () => 0, clearTimeout() {} };
  vm.runInNewContext(source, context);
  const button = { disabled: false, dataset: { hubAction: "deleteNote", id: "reviewed-id" }, closest: () => host };
  return { window, calls, reviews, button, answer: value => answer(value), click: () => handlers.click({ target: { closest: () => button } }) };
}
test("removing saved content waits for the styled decision and Cancel makes no change", async () => {
  const f = fixture(); await f.window.KaiCompanionHub.render("brain");
  const pending = f.click(); assert.equal(f.reviews.length, 1); assert.equal(f.button.disabled, true); assert.deepEqual(f.calls.map(c => c.action), ["status"]);
  f.answer(false); await pending; assert.deepEqual(f.calls.map(c => c.action), ["status"]); assert.equal(f.button.disabled, false);
  const approved = f.click(); assert.equal(f.calls.length, 1); f.answer(true); await approved;
  assert.deepEqual(f.calls.map(c => c.action), ["status", "remove", "status"]);
  assert.equal(f.calls[1].input.id, "reviewed-id"); assert.equal(f.calls[1].input.kind, "notes");
});
test("a second click cannot approve or remove another item while review is pending", async () => {
  const f = fixture(); await f.window.KaiCompanionHub.render("brain"); const pending = f.click();
  f.button.dataset.id = "another-id"; await f.click(); assert.equal(f.reviews.length, 1);
  f.answer(true); await pending; assert.equal(f.calls.find(c => c.action === "remove").input.id, "reviewed-id");
});

test("clearing Brain history waits for approval and refuses an obsolete view", async () => {
  const renderer = fs.readFileSync(path.join(__dirname, "../plugin/brain.js"), "utf8"), handlers = {}, calls = []; let answer;
  const state = { brain: { awareness: {} } }, out = {}, notice = { classList: { toggle() {} } };
  const host = { isConnected: true, innerHTML: "", addEventListener(name, handler) { handlers[name] = handler; }, querySelector(selector) { return selector === ".bn-main" ? out : selector === ".bn-notice" ? notice : null; } };
  const window = { kai: { dialogs: { confirm: () => new Promise(resolve => { answer = resolve; }) } } };
  vm.runInNewContext(renderer, { window, AbortController, KaiI18n: { html: (parts, ...values) => typeof parts === "string" ? parts : parts.reduce((out, part, i) => out + part + (values[i] ?? ""), "") } });
  window.KaiBrain.render(host, { state, section: "fixture", manage: async action => { calls.push(action); return state; } });
  const button = { dataset: { brain: "clearHistory" } }, click = () => handlers.click({ target: { closest: () => button } });
  const cancelled = click(); assert.equal(calls.length, 0); answer(false); await cancelled; assert.equal(calls.length, 0);
  const stale = click(); host.isConnected = false; answer(true); await stale; assert.equal(calls.length, 0);
  host.isConnected = true; const approved = click(); answer(true); await approved; assert.deepEqual(calls, ["brainClearHistory", "status"]);
});
