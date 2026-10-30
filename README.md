# KAI Brain plugin

Private Brain workspace for KAI Core 0.2.0. Reuses the existing encrypted `companion-hub.json` profile, including memories, goals, and sources created in Alpha/Test. It does not create another Brain or expose account credentials.

## Available now

The separate window keeps the original Brain section rail, memory and source cards, and goal board, with the same light workspace styling as KAI Core.

- Search, read, create, revise, pin, categorize, and forget personal memories.
- Create, update, complete, pause, and remove goals.
- View existing sources and the memories imported from them.
- Import a native-picker-selected text file or a bounded, non-recursive folder snapshot.
- Export a native-picker-selected plain Markdown copy.
- Revision checks prevent stale edits and approval-time changes from overwriting newer records.

Imported memories remain read-only; forgetting a source removes its imported memories while preserving its external files/accounts. Existing sources are shown as saved snapshots. This plugin does **not** start background sync, access connected account tokens, enable awareness jobs, or browse the web. OS-protected Brain storage must be available; unreadable records are preserved and rejected rather than reset.

## Installation and permissions

Install the signed `.kaiplugin` release through KAI Core. The reviewed publisher pin is required for the private `brain.read`, `brain.write`, `brain.import`, and `brain.export` host capabilities. Ordinary third-party plugins cannot request this access. Source code and renderer assets never receive Node, filesystem paths, OS credentials, or a general account API.

Run `npm test` for the renderer model tests. Broker integration tests live in `kai-core/core/test-core/private-data-services.test.js`. Signing and release packaging are managed from the Core workspace; publisher private keys must never enter this repository.
