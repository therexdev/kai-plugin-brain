# KAI Brain plugin

The original KAI Brain workspace, installed separately and opened in its own window. The original renderer, navigation, styles and offline language catalogs are retained from `therexdev/kaiapp` commit `34d17faa0526213b8fc0ac7a65aa7f2c186c6547`.

The eight original sections are Overview, Memory graph, Memories, Goals & tasks, Sources, Sync & changes, Awareness, and Orchestration. They use the original Brain, Sources and Awareness services: memory editing and search, goals and tasks, folder/conversation/web/RSS/GitHub/connected-app sources, source syncing, change history, checkpoints, insights, briefings, custom background checks, Markdown vault export, and delegation to reviewed workflows.

Existing encrypted Brain data is opened in place. Core retains credentials, the shared store, native file dialogs, model execution and approvals. Each UI action is a separately scoped private broker method; this plugin has no unrestricted filesystem, network or IPC access. Workflow delegation is declared separately as `brain.workflow`. Closing the window retains enabled background work; disabling the plugin or quitting Core stops its services.

`plugin/original-ui.json` records hashes of the original assets. `npm test` checks those assets, the packaged entry and the scoped bridge. Core's `scripts/core/brain-connections-parity-smoke.js` exercises the real Electron renderer and original companion action handlers on a synthetic profile; it does not claim to test a user's OS keychain or external accounts.
