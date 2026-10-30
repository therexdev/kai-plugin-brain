"use strict";
const fs=require("node:fs"),path=require("node:path");
const {CompanionError}=require("./companion-store");
async function manage(service,ctx,action,input={}){if(action==="status")return service.status();service.store.requireStorage();switch(action){
      case "note": return service.store.note(input);
      case "goal": return service.store.goal(input);
      case "remove": { const chatSource=input.kind==="sources"&&service.store.data.sources.some(s=>s.id===input.id&&s.kind==="chats");service.awareness.cancel();if(input.kind==="sources")service.sourceControllers.get(input.id)?.abort();const result=service.store.remove(input.kind,input.id);if(chatSource)await service.restrictChats(ctx.signal);return result; }
      case "brainSearch": return service.brain.search(input);
      case "brainTask": return service.brain.task(input);
      case "removeBrainTask": return service.store.change(d => { d.brain.tasks = d.brain.tasks.filter(t => t.id !== input.id); });
      case "brainCheckpoint": return service.brain.checkpoint(input.name);
      case "brainClearHistory": return service.store.change(d => { d.brain.changes = []; d.brain.activity = []; d.brain.checkpoints = []; d.brain.readAt = Date.now(); });
      case "brainReview": {
        const insight = service.store.data.brain.insights.find(i => i.id === input.id);
        if (!insight) throw new CompanionError("Insight no longer exists.");
        if (input.decision !== "dismiss" && !await ctx.confirm(input.decision === "task" ? "Create a task" : "Remember this insight", { title: insight.title, text: insight.text })) throw new CompanionError("Insight kept for review.");
        return service.brain.review(input);
      }
      case "awarenessSettings": return service.awareness.settings(input);
      case "awarenessTask": return service.awareness.customTask(input);
      case "awarenessRun": { const job = service.awareness.enqueue(input.kind || "reflection", true); void service.awareness.tick().catch(() => {}); return job; }
      case "awarenessStop": return service.awareness.cancel(input.id);
      case "awarenessRetry": return service.awareness.retry(input.id);
      case "brainChats": return service.sources.chatList();
      case "brainSource": {
        let folder;
        if (input.kind === "folder") {
          const result = await ctx.dialog.showOpenDialog(ctx.window, { title: "Choose the text folder KAI may read", properties: ["openDirectory"] });
          ctx.signal.throwIfAborted(); if (result.canceled || !result.filePaths[0]) return null; folder = result.filePaths[0];
        }
        return service.sources.save(input, folder);
      }
      case "exportBrainVault": {
        const result = await ctx.dialog.showOpenDialog(ctx.window, { title: "Export a new plain Markdown Brain folder here", properties: ["openDirectory", "createDirectory"] });
        ctx.signal.throwIfAborted(); if (result.canceled || !result.filePaths[0]) return null;
        return service.brain.exportVault(result.filePaths[0]);
      }
      case "recall": return service.store.change(d => { d.settings.recall = input.enabled === true; });
      case "import": {
        const result = await ctx.dialog.showOpenDialog(ctx.window, { title: "Add a source to KAI Brain", properties: ["openFile"], filters: [{ name: "Text and Markdown", extensions: ["txt", "md", "csv", "json"] }] });
        ctx.signal.throwIfAborted(); if (result.canceled || !result.filePaths[0]) return null;
        const file = result.filePaths[0]; if (fs.statSync(file).size > 200000) throw new CompanionError("Choose a text file smaller than 200 KB.");
        return service.importText(path.basename(file).slice(0, 100), fs.readFileSync(file, "utf8"));
      }
      case "exportBrain": {
        const result = await ctx.dialog.showSaveDialog(ctx.window, { title: "Export KAI Brain", defaultPath: "KAI-Brain.md", filters: [{ name: "Markdown", extensions: ["md"] }] });
        ctx.signal.throwIfAborted(); if (!result.canceled && result.filePath) fs.writeFileSync(result.filePath, service.store.markdown(), { mode: 0o600 }); return !result.canceled;
      }
      case "source": return service.source(input);
      case "sync": return service.sync(input.id, ctx.signal);

 case "run":return service.api.services.call("kai.workflows","run",input,{signal:ctx.signal});
 case "sourceToggle":{const s=service.store.data.sources.find(x=>x.id===input.id);if(!s||s.kind==="file")throw Error("Source unavailable.");if(s.kind==="connection"&&input.enabled){const c=await service.api.services.call("kai.connections","get",{id:s.connectionId},{signal:ctx.signal});if(!c?.allowSync)throw Error("Enable background reads in Connections first.");}return service.store.change(d=>{const source=d.sources.find(x=>x.id===input.id);source.autoSync=input.enabled===true;source.nextSync=Date.now()+(source.intervalMinutes||20)*60000;});}
 default:throw new CompanionError("Unknown Brain action.");}}

module.exports={manage};
