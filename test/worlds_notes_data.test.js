import assert from "node:assert/strict";
import test from "node:test";
import {
  discard_legacy_note_cache,
  save_world_note,
} from "../src/pages/games/WorldsNotesData.js";
test("obsolete notes are removed without reading them or touching other settings", () => {
  const removed = [];
  discard_legacy_note_cache({
    removeItem: (key) => removed.push(key),
    getItem() {
      throw Error("must never read old notes");
    },
  });
  assert.deepEqual(removed, [
    "games/world_notes",
    "games/world_name_notes_version",
  ]);
  assert.doesNotThrow(() =>
    discard_legacy_note_cache({
      removeItem() {
        throw Error("blocked");
      },
    }),
  );
});
test("edits save notes with their server baseline and validate the saved row", async () => {
  const calls = [];
  const saved = await save_world_note(
    1,
    "without Firstlight",
    "with Firstlight",
    async (...args) => {
      calls.push(args);
      return { result: { cardinality: 1, notes: "without Firstlight" } };
    },
  );
  assert.deepEqual(calls, [[1, "without Firstlight", "with Firstlight"]]);
  assert.equal(saved.notes, "without Firstlight");
  await assert.rejects(() =>
    save_world_note(1, "new", "old", async () => ({
      result: { cardinality: 2, notes: "new" },
    })),
  );
  await assert.rejects(
    () =>
      save_world_note(1, "new", "old", async () => {
        throw Error("conflict");
      }),
    /conflict/,
  );
});

test("actual data hook ignores stale browser notes, refreshes on focus and rejects stale reads after a save",async()=>{
 const {readFile}=await import("node:fs/promises");
 const vm=await import("node:vm");
 const {index_world_mappings}=await import("../src/pages/games/WorldsDatabase.js");
 const source=await readFile(new URL("../src/pages/games/useWorldsData.js",import.meta.url),"utf8");
 const code=source.slice(source.indexOf("export default function")).replace("export default ","");
 const slots=[],effects=[],listeners=new Map(),removed=[];let cursor=0,initial=true,pending=null;
 let stored="World name suggestions (unapproved):\n- Cogito: kept";
 const row=notes=>({cardinality:1,synset_id:"00001740",word:"existence",world_name:"world 1",definition:"being",gloss:"being",notes});
 const context=vm.createContext({
  useState:initialValue=>{const index=cursor++;if(!(index in slots))slots[index]=typeof initialValue==="function"?initialValue():initialValue;return [slots[index],value=>{slots[index]=typeof value==="function"?value(slots[index]):value;}];},
  useRef:value=>{const index=cursor++;if(!(index in slots))slots[index]={current:value};return slots[index];},
  useEffect:effect=>{if(initial)effects.push(effect);},
  AbortController,
  window:{localStorage:{removeItem:key=>removed.push(key),getItem(){throw Error("stale Firstlight notes must never be read");}},addEventListener:(key,value)=>listeners.set(key,value),removeEventListener:key=>listeners.delete(key)},
  document:{visibilityState:"visible",addEventListener:(key,value)=>listeners.set(key,value),removeEventListener:key=>listeners.delete(key)},
  DataBackend:{get_wordnet_mappings:async()=>pending?await pending:{result:[row(stored)]},save_world_notes:async(card,notes,expected)=>{assert.equal(card,1);assert.equal(expected,stored);stored=notes;return {result:row(notes)};}},
  index_world_mappings,discard_legacy_note_cache,save_world_note,
 });
 vm.runInContext(code,context);
 const render=()=>{cursor=0;const result=context.useWorldsData();initial=false;return result;};
 render();const cleanup=effects[0]();
 const flush=()=>new Promise(resolve=>setImmediate(resolve));await flush();
 let data=render();assert.ok(!data.data.notes[1].includes("Firstlight"));assert.deepEqual(removed,["games/world_notes","games/world_name_notes_version"]);
 stored="changed by curl";listeners.get("focus")();await flush();data=render();assert.equal(data.data.notes[1],stored);
 let resolveRead;pending=new Promise(resolve=>{resolveRead=resolve;});listeners.get("focus")();
 await data.save_note(1,"saved on blur",stored);
 resolveRead({result:[row("stale read")]});await flush();data=render();assert.equal(data.data.notes[1],"saved on blur");
 cleanup();assert.equal(listeners.size,0);
});
