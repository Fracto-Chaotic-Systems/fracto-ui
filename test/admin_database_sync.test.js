import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";

function harness(backend, stored = null) {
  const source = readFileSync(
    new URL("../src/pages/admin/AdminDatabaseSync.jsx", import.meta.url),
    "utf8",
  )
    .replace(/^import[\s\S]*?;\r?\n/gm, "")
    .replace(
      "export default class AdminDatabaseSync",
      "class AdminDatabaseSync",
    );
  const prop = () => prop;
  prop.isRequired = prop;
  const saved = new Map(stored ? [["database-sync:http://peer", stored]] : []);
  const Sync = runInNewContext(
    transformSync(source, { loader: "jsx" }).code + ";AdminDatabaseSync",
    {
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
      text: { errors: { default: "sync error" } },
      sessionStorage: {
        getItem: (k) => saved.get(k),
        setItem: (k, v) => saved.set(k, v),
      },
      setInterval: () => 1,
      clearInterval: () => {},
    },
  );
  const component = new Sync({ server_url: "http://peer/" });
  return { component, saved };
}
const tick = () => new Promise((resolve) => setImmediate(resolve));

test("a lost apply response reattaches to the server job instead of offering a duplicate apply", async () => {
  const h = harness({
    database_sync_peers: async () => ({ peers: ["http://peer"] }),
    database_sync_apply: async () => { throw Error("lost response"); },
    database_sync_job: async () => ({ id: "plan", status: "completed" }),
  });
  h.component.componentDidMount(); await tick();
  h.component.remember("plan");
  h.component.state.job = { id: "plan", status: "ready", conflicts: [] };
  await h.component.apply();
  assert.equal(h.component.state.job.status, "checking");
  await h.component.refresh();
  assert.equal(h.component.state.job.status, "completed");
  h.component.componentWillUnmount();
});

test("conflicting rows require explicit preference and only submit the plan ID and chosen server", async () => {
  const calls = [];
  const h = harness({
    database_sync_peers: async () => ({ peers: ["http://peer"] }),
    database_sync_apply: async (...args) => {
      calls.push(args);
      return { id: "plan", status: "applying" };
    },
  });
  h.component.componentDidMount();
  await tick();
  assert.equal(h.component.state.configured, true);
  h.component.state.job = {
    id: "plan",
    status: "ready",
    conflicts: [{ table: "a" }],
  };
  await h.component.apply();
  assert.equal(calls.length, 0);
  h.component.state.preferred = "remote";
  await h.component.apply();
  assert.deepEqual(calls, [["plan", "remote"]]);
  assert.equal(h.component.state.job.status, "applying");
  h.component.componentWillUnmount();
});

test("revisiting a server reattaches to its job and ignores responses after selection changes", async () => {
  let complete;
  const h = harness(
    {
      database_sync_peers: async () => ({ peers: ["http://peer"] }),
      database_sync_job: (id) => {
        assert.equal(id, "remembered");
        return new Promise((resolve) => {
          complete = resolve;
        });
      },
    },
    "remembered",
  );
  h.component.componentDidMount();
  await h.component.refresh(); // overlapping request is skipped
  h.component.componentWillUnmount();
  complete({ id: "remembered", status: "completed" });
  await tick();
  assert.equal(h.component.state.job, null);
});

test("sync backend sends browser-authenticated narrow requests without peer secrets", async () => {
  const calls = [];
  const source = readFileSync(
    new URL("../src/backend/AdminBackend.jsx", import.meta.url),
    "utf8",
  )
    .replace(/^import[\s\S]*?;\r?\n/gm, "")
    .replace("export class AdminBackend", "class AdminBackend")
    .replace(/^export default .*;$/gm, "");
  const Backend = runInNewContext(source + ";AdminBackend", {
    service_origin: () => "http://admin",
    request_json: async (url, options) => {
      calls.push({ url, options });
    },
  });
  await Backend.database_sync_preview("http://peer");
  await Backend.database_sync_apply("plan", "local");
  await Backend.database_sync_job("plan");
  assert.equal(calls[0].url, "http://admin/database-sync/jobs");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    server_url: "http://peer",
  });
  assert.deepEqual(JSON.parse(calls[1].options.body), { preferred: "local" });
  assert.deepEqual(Object.keys(calls[1].options.headers), ["Content-Type"]);
  assert.ok(!JSON.stringify(calls).includes("token"));
});
