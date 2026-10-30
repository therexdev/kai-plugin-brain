"use strict";
const $ = id => document.getElementById(id), call = (method, input) => window.kai.call(method, input);
const banner = window.KaiPluginNotice.attach($("message"), { focusTarget: () => $("editor").hidden ? $("create").hidden ? $("import") : $("create") : $("editor-close") });
let tab = "memories", selected = null, rows = [], dirty = false, serial = 0, metrics = {}, limited = false, editorGeneration = 0, editVersion = 0;
const headings = {
  memories: ["Your memories", "Search exact source text and your saved knowledge."],
  goals: ["What matters, and what comes next", "Keep your long-term priorities in one place."],
  sources: ["Choose what KAI can learn from", "Review the sources and saved text in your Brain."],
};
function message(value, error = false) { banner.show(value, { error, force: true }); }
async function act(button, fn) { if (button) button.disabled = true; try { return await fn(); } catch (e) { message(e.message, true); } finally { if (button) button.disabled = false; } }
function canLeave() { return !dirty || window.confirm("Discard your unsaved changes?"); }
function reset() {
  selected = null; dirty = false; editorGeneration++; $("editor").hidden = true; $("library").hidden = false;
  for (const id of ["note-form", "goal-form", "source-detail", "empty"]) $(id).hidden = true;
}
function node(tag, content, className = "") { const el = document.createElement(tag); if (content !== undefined) el.textContent = content; if (className) el.className = className; return el; }
function date(value) { return Number.isFinite(Number(value)) && Number(value) > 0 ? new Date(Number(value)).toLocaleDateString([], { dateStyle: "medium" }) : ""; }
function updateMetrics() {
  $("metrics").replaceChildren();
  for (const [key, label] of [["notes", "memories"], ["goals", "goals"], ["sources", "sources"]]) if (Number.isFinite(metrics[key])) $("metrics").append(node("span", `${metrics[key]} ${label}`));
}
function updateFilters() {
  for (const [id, placeholder, values] of [
    ["filter-source", "All sources", rows.map(row => [row.sourceId || "personal", row.source || "Your notes"])],
    ["filter-category", "All categories", rows.map(row => [row.category || "notes", row.category || "notes"])],
  ]) {
    const field = $(id), previous = field.value, options = new Map(values);
    field.replaceChildren(); const first = node("option", placeholder); first.value = ""; field.append(first);
    for (const [value, label] of options) { const option = node("option", label); option.value = value; field.append(option); }
    field.value = options.has(previous) ? previous : "";
  }
}
async function openRow(row) {
  if (!canLeave()) return;
  const wantedTab = tab, request = serial;
  const record = tab === "memories" ? await call("brain.get", { id: row.id }) : row;
  if (wantedTab !== tab || request !== serial) return;
  selected = record; dirty = false; showSelected(); drawList();
}
function itemCard(row) {
  const card = node("article", undefined, "hub-card"), top = node("div", undefined, "hub-card-top");
  card.classList.toggle("selected", row.id === selected?.id);
  top.append(node("span", tab === "memories" ? `${row.category || "notes"}${row.pinned ? " · Pinned" : ""}` : tab === "goals" ? row.priority === "high" ? "High priority" : "Goal" : ({ file: "Imported file", folder: "Local folder", chats: "Conversations", connection: "Connected app", web: "Website", rss: "Feed", github: "GitHub" }[row.kind] || row.kind), "badge"));
  if (tab === "memories") top.append(node("small", row.source || "You"));
  card.append(top, node("h3", row.title || row.name));
  card.append(node("p", tab === "memories" ? row.excerpt : tab === "goals" ? row.detail || "" : `${row.chunks} saved sections`, "excerpt"));
  const stamp = date(tab === "sources" ? row.lastSync : row.updatedAt); if (stamp) card.append(node("small", `${tab === "sources" ? "Saved " : "Updated "}${stamp}`));
  if (row.error) card.append(node("p", row.error, "danger"));
  const actions = node("div", undefined, "actions"), edit = node("button", tab === "memories" ? row.sourceId ? "Read source text" : "Edit memory" : tab === "goals" ? "Edit" : "View source");
  edit.type = "button"; edit.onclick = () => act(edit, () => openRow(row)); actions.append(edit);
  if (tab === "goals" && row.status !== "done") {
    const complete = node("button", "Complete"); complete.type = "button";
    complete.onclick = () => act(complete, async () => { await call("brain.goalSave", { id: row.id, revision: row.revision, title: row.title, detail: row.detail || "", priority: row.priority, status: "done" }); await load(); message("Goal completed."); });
    actions.append(complete);
  }
  card.append(actions); return card;
}
function drawList() {
  const box = $("list"); box.replaceChildren(); box.classList.toggle("goal-board", tab === "goals");
  let found = rows;
  if (tab === "memories") {
    const source = $("filter-source").value, category = $("filter-category").value, since = $("filter-since").value;
    found = rows.filter(row => (!source || (row.sourceId || "personal") === source) && (!category || (row.category || "notes") === category) && (!since || row.updatedAt >= new Date(since).getTime()));
  }
  $("result-count").textContent = tab === "memories" ? `${found.length} matching memor${found.length === 1 ? "y" : "ies"}${limited ? " · Refine your search to find more saved memories." : ""}` : "";
  if (tab === "goals") {
    for (const [status, label] of [["active", "In focus"], ["paused", "On hold"], ["done", "Completed"]]) {
      const column = node("section", undefined, "goal-column"); column.append(node("h3", label));
      const goals = found.filter(row => row.status === status);
      for (const row of goals) column.append(itemCard(row));
      if (!goals.length) column.append(node("p", "No goals here yet.")); box.append(column);
    }
    return;
  }
  if (!found.length) {
    const empty = node("div", undefined, "hub-empty");
    empty.append(node("strong", tab === "memories" ? "No matching memories" : "Start with one useful source"), node("p", tab === "memories" ? "Choose another filter or add material to your Brain." : "Import a text file or a folder snapshot to keep its context here.")); box.append(empty); return;
  }
  for (const row of found) box.append(itemCard(row));
}
function showSelected() {
  editorGeneration++;
  $("library").hidden = true; $("editor").hidden = false;
  for (const id of ["empty", "note-form", "goal-form", "source-detail"]) $(id).hidden = true;
  $("editor-title").textContent = tab === "memories" ? selected.sourceId ? "Source content" : "Memory" : tab === "goals" ? "Goal" : "Source";
  if (tab === "memories") {
    $("note-form").hidden = false; $("note-title").value = selected.title || ""; $("note-text").value = selected.text || "";
    $("category").value = selected.category || "notes"; $("tags").value = (selected.tags || []).join(", "); $("pinned").checked = !!selected.pinned;
    const imported = !!selected.sourceId;
    for (const id of ["note-title", "note-text", "category", "tags", "pinned"]) $(id).disabled = imported;
    $("save-note").hidden = imported; $("delete-note").hidden = !selected.id || imported;
    $("note-source").textContent = imported ? `Imported from ${selected.source}. Manage this under Sources.` : "Personal memory · encrypted in your existing Brain"; $("dirty-note").textContent = "";
  } else if (tab === "goals") {
    $("goal-form").hidden = false; $("goal-title").value = selected.title || ""; $("goal-detail").value = selected.detail || "";
    $("goal-status").value = selected.status || "active"; $("goal-priority").value = selected.priority || "normal"; $("delete-goal").hidden = !selected.id;
  } else {
    $("source-detail").hidden = false; $("source-name").textContent = selected.name;
    $("source-info").textContent = `${selected.kind} source · ${selected.chunks} sections${selected.lastSync ? " · Saved " + new Date(selected.lastSync).toLocaleString() : ""}${selected.error ? " · " + selected.error : ""}`;
  }
}
async function load() {
  const run = ++serial, result = await call(tab === "memories" ? "brain.list" : tab === "goals" ? "brain.goals" : "brain.sources", tab === "memories" ? { query: $("search").value } : {});
  if (run !== serial) return; rows = result.notes || result.goals || result.sources; limited = !!result.limited;
  if (result.metrics) metrics = result.metrics; else metrics[tab] = rows.length;
  updateMetrics(); if (tab === "memories") updateFilters(); drawList();
}
for (const button of document.querySelectorAll("[data-tab]")) button.onclick = () => act(button, async () => {
  if (!canLeave()) return; tab = button.dataset.tab; banner.clear();
  document.querySelectorAll("[data-tab]").forEach(n => { const active = n === button; n.classList.toggle("active", active); n.setAttribute("aria-current", active ? "page" : "false"); });
  $("section-title").textContent = headings[tab][0]; $("section-detail").textContent = headings[tab][1];
  $("filters").hidden = tab !== "memories"; $("create").hidden = tab === "sources"; $("import").hidden = tab === "goals"; $("import-folder").hidden = tab !== "sources";
  $("create").textContent = tab === "goals" ? "Add a goal" : "Add memory"; reset(); await load();
});
$("create").onclick = () => { if (!canLeave()) return; selected = {}; dirty = false; showSelected(); $(tab === "goals" ? "goal-title" : "note-title").focus(); };
$("editor-close").onclick = () => { if (canLeave()) { reset(); drawList(); } };
let searchTimer; $("search").oninput = () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => act(null, load), 200); };
for (const id of ["filter-source", "filter-category", "filter-since"]) $(id).onchange = drawList;
for (const form of [$("note-form"), $("goal-form")]) form.oninput = () => { dirty = true; editVersion++; $("dirty-note").textContent = "Unsaved changes"; };
async function saveEditor(method, payload, button, label) {
  const generation = editorGeneration, version = editVersion;
  await act(button, async () => {
    const saved = await call(method, payload);
    if (generation === editorGeneration) {
      selected = saved;
      if (version === editVersion) { reset(); message(`${label} saved.`); }
      else message(`Saved the submitted version. Your newer edits are still unsaved.`);
    }
    await load();
  });
}
$("note-form").onsubmit = e => { e.preventDefault();
  void saveEditor("brain.save", window.BrainModel.notePayload(selected, { title: $("note-title").value, text: $("note-text").value, category: $("category").value, tags: $("tags").value, pinned: $("pinned").checked }), e.submitter, "Memory");
};
$("goal-form").onsubmit = e => { e.preventDefault();
  void saveEditor("brain.goalSave", { id: selected.id, revision: selected.revision, title: $("goal-title").value, detail: $("goal-detail").value, status: $("goal-status").value, priority: $("goal-priority").value }, e.submitter, "Goal");
};
for (const [id, method] of [["delete-note", "brain.remove"], ["delete-goal", "brain.goalRemove"], ["delete-source", "brain.sourceRemove"]]) $(id).onclick = e => act(e.currentTarget, async () => { const r = await call(method, { id: selected.id, revision: selected.revision }); if (r.cancelled) return; reset(); await load(); message("Removed from Brain."); });
$("import").onclick = e => act(e.currentTarget, async () => { const r = await call("brain.sourceImport", {}); if (!r.cancelled) { await load(); message(`Imported ${r.name}: ${r.added} sections.`); } });
$("import-folder").onclick = e => act(e.currentTarget, async () => { const r = await call("brain.sourceImport", { kind: "folder" }); if (!r.cancelled) { await load(); message(`Imported ${r.name}: ${r.added} sections.`); } });
$("export").onclick = e => act(e.currentTarget, async () => { const r = await call("brain.export", {}); if (!r.cancelled) message(`Exported ${r.name}. This Markdown copy is not encrypted.`); });
void act(null, load);
