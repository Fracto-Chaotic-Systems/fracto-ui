import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { randomUUID } from "node:crypto";
import {
  create_component_document,
  component_document_json,
} from "@fracto/sdk/FractoComponentDocument.js";
import { apply_component_commands } from "@fracto/sdk/FractoComponentTools.js";
import * as proposals from "../src/pages/games/ComponentProposal.js";
import * as construction_memory from "@fracto/sdk/FractoConstructionMemory.js";
import { construction_builds } from "@fracto/sdk/testing/ConstructionBuilds.js";
import { component_document_reducer as reduce } from "../src/pages/games/ComponentDocumentState.js";

function plan(document) {
  const commands = [
    {
      type: "set-floor",
      floor: { asset: null, size: [4, 12], texture_repeat: [1, 1] },
    },
  ];
  return {
    contract_version: 1,
    planner_version: "construction-planner-v1",
    proposal_id: randomUUID(),
    applied: false,
    status: "proposal",
    base: {
      document_id: document.id,
      document_hash: proposals.component_document_hash(document),
    },
    summary: "A floor",
    questions: [],
    assumptions: [],
    information_needed: [],
    catalog_matches: [],
    commands,
    preview: {
      document_hash: proposals.component_document_hash(
        apply_component_commands(document, commands, {}),
      ),
      total_instances: 0,
    },
  };
}
function harness(options = {}) {
  const slots = [],
    effects = [],
    cleanups = [];
  let cursor = 0,
    dirty = false;
  const document =
    options.document || create_component_document(randomUUID(), "Path");
  let state = reduce({}, { type: "open", document, revision: 1 }),
    hook;
  const context = {
    module: { exports: {} },
    structuredClone,
    AbortController,
    TextEncoder,
    component_document_json,
    ...proposals,
    ...construction_memory,
    request_component_plan: async (brief, base) => plan(base),
    resolve_component_references: async () => ({}),
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [
        slots[i],
        (value) => {
          const next = typeof value === "function" ? value(slots[i]) : value;
          if (!Object.is(slots[i], next)) {
            slots[i] = next;
            dirty = true;
          }
        },
      ];
    },
    useRef(value) {
      const i = cursor++;
      return (slots[i] ||= { current: value });
    },
    useEffect(callback, deps) {
      const i = cursor++;
      if (
        !slots[i] ||
        deps.some((value, j) => !Object.is(value, slots[i][j]))
      ) {
        slots[i] = deps;
        effects.push(() => {
          cleanups[i]?.();
          cleanups[i] = callback();
        });
      }
    },
  };
  const source = readFileSync(
    new URL("../src/pages/games/useComponentPlanner.js", import.meta.url),
    "utf8",
  )
    .replace(/^import[\s\S]*?;\r?\n/gm, "")
    .replace(
      "export default function useComponentPlanner",
      "function useComponentPlanner",
    );
  context.useLayoutEffect = context.useEffect;
  runInNewContext(`${source}\nmodule.exports=useComponentPlanner;`, context);
  function render() {
    let rounds = 0;
    do {
      if (++rounds > 10) throw new Error("hook render loop");
      dirty = false;
      cursor = 0;
      hook = context.module.exports(
        {
          ...state,
          busy: false,
          apply_proposal: (proposal, materials) => {
            state = reduce(state, {
              type: "apply-proposal",
              plan: proposal,
              materials,
            });
          },
        },
        options,
      );
      effects.splice(0).forEach((effect) => effect());
    } while (dirty);
    return hook;
  }
  return {
    render,
    get state() {
      return state;
    },
    edit(name) {
      state = reduce(state, {
        type: "edit",
        document: { ...state.history.present, name },
      });
      render();
    },
    dispose() {
      cleanups.forEach((cleanup) => cleanup?.());
    },
  };
}
test("conversation prepares a separate preview, combines clarifications and acknowledges one atomic Apply", async () => {
  const briefs = [];
  const h = harness({
    request: async (brief, base) => {
      briefs.push(brief);
      return plan(base);
    },
  });
  await h.render().submit("A plain floor");
  let hook = h.render();
  assert.equal(hook.previewing, true);
  assert.equal(h.state.history.present.floor, null);
  await hook.submit("Make it 4 by 12 meters");
  hook = h.render();
  assert.match(briefs[1], /A plain floor\nFollow-up: Make it 4 by 12 meters/);
  await hook.apply();
  hook = h.render();
  assert.equal(h.state.history.past.length, 1);
  assert.equal(hook.proposal, null);
  assert.equal(hook.entries.at(-1).text, "planner_applied");
  await hook.submit("A new request");
  h.render();
  assert.equal(briefs[2], "A new request");
  h.dispose();
});
test("Cancel ignores a late model response and allows a subsequent request", async () => {
  let finish, signal;
  const h = harness({
    request: (brief, base, received) => {
      signal = received;
      return new Promise((resolve) => (finish = () => resolve(plan(base))));
    },
  });
  const pending = h.render().submit("A floor");
  h.render().cancel();
  assert.equal(signal.aborted, true);
  finish();
  await pending;
  const hook = h.render();
  assert.equal(hook.proposal, null);
  assert.equal(hook.phase, "idle");
  assert.equal(hook.error, "planner_cancelled");
  assert.equal(h.state.history.present.floor, null);
  h.dispose();
});
test("draft edits during planning discard the response, and edits during Apply reject the commit", async () => {
  let finish;
  const h = harness({
    request: (brief, base) =>
      new Promise((resolve) => (finish = () => resolve(plan(base)))),
  });
  const pending = h.render().submit("A floor");
  h.edit("New draft");
  finish();
  await pending;
  assert.equal(h.render().error, "proposal_stale");
  assert.equal(h.render().proposal, null);
  h.dispose();
  let release,
    reads = 0;
  const applying = harness({
    resolve: async () => {
      if (++reads === 2) await new Promise((resolve) => (release = resolve));
      return {};
    },
  });
  await applying.render().submit("A floor");
  const result = applying.render().apply();
  applying.edit("Changed while rechecking");
  release();
  await result;
  assert.equal(applying.render().error, "proposal_stale");
  assert.equal(applying.state.history.present.floor, null);
  assert.equal(applying.state.history.past.length, 1);
  applying.dispose();
});
test("Apply re-resolves material pins and retains the proposal on revision failure", async () => {
  let reads = 0;
  const h = harness({
    resolve: async () => {
      if (++reads === 2) throw new Error("material_revision_changed");
      return {};
    },
  });
  await h.render().submit("A floor");
  await h.render().apply();
  const hook = h.render();
  assert.equal(reads, 2);
  assert.equal(hook.error, "material_revision_changed");
  assert.ok(hook.proposal);
  assert.equal(h.state.history.present.floor, null);
  assert.equal(h.state.history.past.length, 0);
  h.dispose();
});
test("Cancel during preview preparation ignores a late catalog resolution", async () => {
  let release, started;
  const entered = new Promise((resolve) => (started = resolve));
  const h = harness({
    resolve: () =>
      new Promise((resolve) => {
        release = () => resolve({});
        started();
      }),
  });
  const pending = h.render().submit("A floor");
  await entered;
  h.render().cancel();
  release();
  await pending;
  assert.equal(h.render().proposal, null);
  assert.equal(h.state.history.present.floor, null);
  h.dispose();
});
test("explicit matching guidance is projected without local IDs, and deleting memory invalidates its proposal", async () => {
  const pattern = {
    id: randomUUID(),
    revision: 1,
    kind: "preference",
    title: "Path width",
    instructions: "Use a clear 2 meter corridor.",
    keywords: ["path"],
    enabled: true,
  };
  const options = {
    memory: { schema_version: 1, patterns: [pattern] },
    request: async (brief, base, signal, guidance) => {
      assert.deepEqual(guidance, [
        { kind: "preference", instructions: pattern.instructions },
      ]);
      return plan(base);
    },
  };
  const h = harness(options);
  await h.render().submit("A wooded path");
  assert.equal(h.render().proposal.patterns[0].title, pattern.title);
  options.memory = { schema_version: 1, patterns: [] };
  assert.equal(h.render().proposal, null);
  assert.equal(h.render().error, "memory_changed");
  assert.equal(h.state.history.present.floor, null);
  h.dispose();
});
test("deleting memory during a request aborts and ignores late model output", async () => {
  let release, received;
  const options = {
    memory: { schema_version: 1, patterns: [] },
    request: (brief, base, signal) => {
      received = signal;
      return new Promise((resolve) => (release = () => resolve(plan(base))));
    },
  };
  const h = harness(options),
    pending = h.render().submit("A floor");
  options.memory = {
    schema_version: 1,
    patterns: [
      {
        id: randomUUID(),
        revision: 1,
        kind: "preference",
        title: "Clear",
        instructions: "Keep paths clear",
        keywords: [],
        enabled: true,
      },
    ],
  };
  h.render();
  assert.equal(received.aborted, true);
  release();
  await pending;
  assert.equal(h.render().proposal, null);
  h.dispose();
});
test("unavailable inference or catalog preparation retains a representative populated draft and history", async () => {
  const { materials, builds } = construction_builds(randomUUID),
    build = builds.find((item) => item.id === "wooded-path");
  const document = apply_component_commands(
      build.base,
      build.commands,
      materials,
    ),
    before = component_document_json(document);
  for (const failure of ["inference", "catalog"]) {
    const h = harness({
      document,
      ...(failure === "inference"
        ? {
            request: async () => {
              throw new Error("planner_unavailable");
            },
          }
        : {
            resolve: async () => {
              throw new Error("material_load_error");
            },
          }),
    });
    await h.render().submit("Replace only the floor with a plain floor.");
    assert.equal(component_document_json(h.state.history.present), before);
    assert.equal(h.state.history.past.length, 0);
    assert.equal(h.state.revision, 1);
    assert.equal(h.render().proposal, null);
    assert.equal(h.render().phase, "idle");
    h.dispose();
  }
});
