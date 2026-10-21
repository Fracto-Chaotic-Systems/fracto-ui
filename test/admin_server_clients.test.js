import assert from "node:assert/strict";
import { setImmediate } from "node:timers";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
const tick = () => new Promise((resolve) => setImmediate(resolve));
function harness(backend, server_url) {
  const source = readFileSync(
    new URL("../src/pages/admin/AdminServerClients.jsx", import.meta.url),
    "utf8",
  )
    .replace(/^import[\s\S]*?;\r?\n/gm, "")
    .replace(
      "export default class AdminServerClients",
      "class AdminServerClients",
    );
  const prop = () => prop;
  prop.isRequired = prop;
  const stopped = [];
  const Clients = runInNewContext(
    transformSync(source, { loader: "jsx" }).code + ";AdminServerClients",
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
      ServerBackend: backend,
      setInterval: () => 1,
      clearInterval: (id) => stopped.push(id),
    },
  );
  return { client: new Clients({ server_url }), stopped };
}

test("client polling skips overlapping requests and ignores responses after selection unmount", async () => {
  let complete,
    requests = 0;
  const h = harness(
    {
      clients_at: (url) => {
        assert.equal(url, "http://remote/");
        requests++;
        return new Promise((resolve) => (complete = resolve));
      },
    },
    "http://remote/",
  );
  h.client.componentDidMount();
  await h.client.refresh();
  assert.equal(requests, 1);
  h.client.componentWillUnmount();
  complete({ contract_version: 1, clients: [{ id: "old-server" }] });
  await tick();
  assert.equal(h.client.state.clients, null);
  assert.deepEqual(h.stopped, [1]);
});

test("local snapshots display empty lists distinctly from access failures", async () => {
  const h = harness({
    clients: async () => ({ contract_version: 1, clients: [] }),
  });
  h.client.componentDidMount();
  await tick();
  assert.equal(h.client.state.clients.length, 0);
  assert.equal(h.client.state.error, false);
  const failed = harness({
    clients: async () => {
      throw Error("HTTP 403");
    },
  });
  failed.client.componentDidMount();
  await tick();
  assert.equal(failed.client.state.error, true);
  assert.equal(failed.client.state.clients, null);
});
