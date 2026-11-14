import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { setImmediate } from "node:timers";
import * as model from "../src/pages/admin/InstrumentTransferModel.js";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const stripped = (path) =>
  read(path)
    .replace(/^import[\s\S]*?;\r?\n/gm, "")
    .replace(/^export default /gm, "");
const hash = "a".repeat(64);
const ready = () => ({
  protocol_version: 1,
  id: "job",
  state: "ready",
  publication_supported: true,
  preview_only: false,
  plan_sha256: hash,
  manifest_sha256: hash,
  expires_at: new Date(Date.now() + 60000).toISOString(),
  summary: {
    source_catalog_sha256: hash,
    package_files: 5,
    package_bytes: 2048,
    matching_files: 2,
    missing_files: 3,
    missing_bytes: 1024,
    conflict_files: 0,
    free_bytes: 4096,
    required_free_bytes: 2048,
    publication_state: "unchanged",
  },
});
const tick = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
function harness(overrides = {}, stored = null) {
  const saved = new Map(
    stored ? [["instrument-transfer:http://source:http://peer", stored]] : [],
  );
  const backend = {
    instrument_transfer_peers: async () => ({
      protocol_version: 1,
      peers: [{ peer: "http://peer" }],
    }),
    instrument_transfer_preview: async () => ready(),
    instrument_transfer_job: async () => ready(),
    ...overrides,
  };
  const prop = () => prop;
  prop.isRequired = prop;
  const Controller = runInNewContext(
    transformSync(stripped("../src/pages/admin/AdminInstrumentTransfer.jsx"), {
      loader: "jsx",
    }).code + ";AdminInstrumentTransfer",
    {
      ...model,
      Component: class {
        constructor(props) {
          this.props = props;
        }
        setState(next) {
          Object.assign(this.state, next);
        }
      },
      PropTypes: new Proxy({}, { get: () => prop }),
      AdminBackend: backend,
      AbortController,
      sessionStorage: {
        getItem: (k) => saved.get(k),
        setItem: (k, v) => saved.set(k, v),
        removeItem: (k) => saved.delete(k),
      },
      setInterval: () => 1,
      clearInterval: () => {},
    },
  );
  const component = new Controller({
    source_url: "http://source/",
    server_url: "http://peer/",
  });
  component.componentDidMount();
  return { component, saved };
}

test("apply requires an unexpired compatible preview with no conflicts", () => {
  assert.equal(model.transfer_can_apply(ready()), true);
  for (const patch of [
    { publication_supported: false },
    { preview_only: true },
    { state: "partial" },
    { plan_sha256: "bad" },
    { expires_at: new Date(0).toISOString() },
    { summary: { conflict_files: 1 } },
  ])
    assert.equal(model.transfer_can_apply({ ...ready(), ...patch }), false);
});
test("completion requires a matching publication receipt, never byte progress alone", () => {
  const job = { ...ready(), state: "completed" };
  job.summary.publication_state = "published";
  assert.equal(model.transfer_receipt_verified(job), false);
  job.receipt = {
    protocol_version: 1,
    manifest_sha256: hash,
    catalog_sha256: hash,
    files_verified: 5,
    bytes_verified: 2048,
    completed_at: new Date().toISOString(),
  };
  assert.equal(model.transfer_receipt_verified(job), true);
  for (const patch of [
    { manifest_sha256: "b".repeat(64) },
    { catalog_sha256: "b".repeat(64) },
    { files_verified: 4 },
    { bytes_verified: 2047 },
    { completed_at: "invalid" },
  ])
    assert.equal(
      model.transfer_receipt_verified({
        ...job,
        receipt: { ...job.receipt, ...patch },
      }),
      false,
    );
});
test("double clicks create one preview and persist the job per source and destination", async () => {
  const response = deferred();
  let calls = 0;
  const { component: c, saved } = harness({
    instrument_transfer_preview: () => {
      calls++;
      return response.promise;
    },
  });
  await tick();
  const first = c.preview();
  await c.preview();
  assert.equal(calls, 1);
  response.resolve(ready());
  await first;
  assert.equal(
    saved.get("instrument-transfer:http://source:http://peer"),
    "job",
  );
  c.componentWillUnmount();
  assert.equal(saved.size, 1);
});
test("remembered jobs disable actions while recovering, and missing jobs permit a fresh preview", async () => {
  const response = deferred();
  const { component: c, saved } = harness(
    { instrument_transfer_job: () => response.promise },
    "old",
  );
  assert.equal(c.state.uncertain, true);
  response.resolve({ ...ready(), id: "old", state: "transferring" });
  await tick();
  assert.equal(c.state.job.state, "transferring");
  assert.equal(c.state.uncertain, false);
  c.componentWillUnmount();
  const h = harness(
    {
      instrument_transfer_job: async () => {
        throw Object.assign(Error(), { status: 404 });
      },
    },
    "gone",
  );
  await tick();
  assert.equal(h.saved.size, 0);
  assert.equal(h.component.state.error, "error_missing");
  await h.component.preview();
  assert.equal(h.component.state.job.state, "ready");
  h.component.componentWillUnmount();
});
test("unconfigured addresses cannot preview and temporary poll errors retain the job", async () => {
  let previews = 0,
    broken = true;
  const h = harness({
    instrument_transfer_peers: async () => ({ protocol_version: 1, peers: [] }),
    instrument_transfer_preview: async () => {
      previews++;
      return ready();
    },
  });
  await tick();
  await h.component.preview();
  assert.equal(previews, 0);
  h.component.componentWillUnmount();
  const { component: c, saved } = harness(
    {
      instrument_transfer_job: async () => {
        if (broken) throw Error("offline");
        return { ...ready(), state: "transferring" };
      },
    },
    "job",
  );
  await tick();
  assert.equal(c.state.uncertain, true);
  assert.equal(saved.size, 1);
  broken = false;
  await c.refresh();
  assert.equal(c.state.uncertain, false);
  assert.equal(c.state.job.state, "transferring");
  c.componentWillUnmount();
});

test("status requests do not start while an apply command is pending", async () => {
  const response = deferred();
  let polls = 0;
  const { component: c } = harness({
    instrument_transfer_apply: () => response.promise,
    instrument_transfer_job: async () => {
      polls++;
      return ready();
    },
  });
  await tick();
  await c.preview();
  const applying = c.apply();
  await c.refresh(true);
  assert.equal(polls, 0);
  response.resolve({ ...ready(), state: "transferring" });
  await applying;
  c.componentWillUnmount();
});

test("ambiguous apply polls authoritative status without ever reposting apply", async () => {
  let applies = 0,
    polls = 0;
  const { component: c } = harness({
    instrument_transfer_apply: async () => {
      applies++;
      throw Error("lost acknowledgement");
    },
    instrument_transfer_job: async () => {
      polls++;
      return { ...ready(), state: "transferring" };
    },
  });
  await tick();
  await c.preview();
  await c.apply();
  await tick();
  await c.refresh(true);
  await c.apply();
  assert.equal(applies, 1);
  assert.ok(polls >= 1);
  assert.equal(c.state.job.state, "transferring");
  c.componentWillUnmount();
});
test("late ready polls cannot overwrite a newer apply response", async () => {
  const stale = deferred();
  const { component: c } = harness({
    instrument_transfer_job: () => stale.promise,
    instrument_transfer_apply: async () => ({
      ...ready(),
      state: "transferring",
    }),
  });
  await tick();
  await c.preview();
  const poll = c.refresh(true);
  await c.apply();
  stale.resolve(ready());
  await poll;
  assert.equal(c.state.job.state, "transferring");
  c.componentWillUnmount();
});
test("rejected plans require a new preview and partial recovery does not autoapply", async () => {
  let applies = 0;
  const { component: c } = harness({
    instrument_transfer_apply: async () => {
      applies++;
      throw Object.assign(Error(), {
        status: 409,
        code: "instrument_transfer_snapshot_changed",
      });
    },
  });
  await tick();
  await c.preview();
  await c.apply();
  await c.apply();
  assert.equal(applies, 1);
  assert.equal(c.state.requires_preview, true);
  await c.preview();
  assert.equal(c.state.requires_preview, false);
  c.state.job = { ...ready(), state: "partial" };
  await c.preview();
  assert.equal(applies, 1);
  c.componentWillUnmount();
});
test("cancellation during publication keeps polling until the server settles", async () => {
  let cancels = 0;
  const { component: c } = harness({
    instrument_transfer_cancel: async () => {
      cancels++;
      return { ...ready(), state: "publishing" };
    },
    instrument_transfer_job: async () => ({ ...ready(), state: "cancelled" }),
  });
  await tick();
  await c.preview();
  c.state.job.state = "publishing";
  await c.cancel();
  await c.cancel();
  assert.equal(cancels, 1);
  assert.equal(c.state.cancel_requested, true);
  await c.refresh();
  assert.equal(c.state.job.state, "cancelled");
  c.componentWillUnmount();
});
test("unmount aborts local requests without cancelling the server job", async () => {
  const response = deferred();
  let signal;
  const { component: c } = harness({
    instrument_transfer_preview: (_peer, s) => {
      signal = s;
      return response.promise;
    },
  });
  await tick();
  const request = c.preview();
  c.componentWillUnmount();
  response.resolve(ready());
  await request;
  assert.equal(signal.aborted, true);
  assert.equal(c.state.job, null);
});

test("browser API sends versioned JSON through the admin service and preserves structured errors", async () => {
  const calls = [];
  const Backend = runInNewContext(
    transformSync(
      stripped("../src/backend/AdminBackend.jsx")
        .replace("export class", "class")
        .replace(/export default AdminBackend;/, ""),
      { loader: "jsx" },
    ).code + ";AdminBackend",
    {
      service_origin: () => "http://admin",
      request_json: (url, opts) => calls.push({ url, opts }),
    },
  );
  Backend.instrument_transfer_peers();
  Backend.instrument_transfer_preview("http://peer");
  Backend.instrument_transfer_job("a/b");
  Backend.instrument_transfer_apply("job", hash);
  Backend.instrument_transfer_cancel("job");
  assert.equal(calls[2].url, "http://admin/instrument-transfer/jobs/a%2Fb");
  assert.deepEqual(JSON.parse(calls[1].opts.body), {
    protocol_version: 1,
    peer: "http://peer",
  });
  assert.deepEqual(JSON.parse(calls[3].opts.body), {
    protocol_version: 1,
    plan_sha256: hash,
  });
  assert.deepEqual(JSON.parse(calls[4].opts.body), { protocol_version: 1 });
  const request = runInNewContext(
    read("../src/backend/BackendUtils.jsx").replace(/^export /gm, "") +
      ";request_json",
    {
      fetch: async (_url, options) => {
        assert.equal(options.credentials, "include");
        return {
          ok: false,
          status: 409,
          json: async () => ({
            error: { code: "instrument_transfer_snapshot_changed" },
          }),
        };
      },
    },
  );
  await assert.rejects(
    request("/test"),
    (e) =>
      e.status === 409 && e.code === "instrument_transfer_snapshot_changed",
  );
});

test("view shows direction, disables older receivers, and rejects incomplete receipts", () => {
  const catalogs = runInNewContext(
    read("../src/text/AdminText.jsx").replace(/^export /gm, "") +
      ";({ INSTRUMENT_TRANSFER_TEXT, APP_ADMIN_TEXT })",
  );
  const View = runInNewContext(
    transformSync(stripped("../src/pages/admin/InstrumentTransferView.jsx"), {
      loader: "jsx",
    }).code + ";InstrumentTransferView",
    {
      ...model,
      ...catalogs,
      React,
      Fragment: React.Fragment,
      AppText: { get: (key) => catalogs.APP_ADMIN_TEXT[key] },
      TransferPanel: "section",
      TransferActions: "div",
      TransferTable: "table",
      TransferStatus: "div",
      TransferError: "p",
    },
  );
  const render = (job) =>
    renderToStaticMarkup(
      React.createElement(View, {
        source_url: "http://source",
        server_url: "http://peer",
        configured: true,
        job,
      }),
    );
  const old = render({ ...ready(), publication_supported: false });
  assert.match(old, /http:\/\/source/);
  assert.match(old, /http:\/\/peer/);
  assert.match(old, /data-primary="true" disabled/);
  assert.match(old, /support on both servers/);
  const bad = render({ ...ready(), state: "completed" });
  assert.doesNotMatch(bad, /Export complete\./);
  assert.match(bad, /Publication could not be confirmed/);
  assert.doesNotMatch(
    render({
      ...ready(),
      state: "failed",
      error: { code: "secret disk path" },
    }),
    /secret disk path/,
  );
});
