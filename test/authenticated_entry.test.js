import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// Exercise the actual routing effect without importing the entire application
// or requiring the currently incomplete Vite installation.
const source = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const component = source.slice(
  source.indexOf("const AuthenticatedEntry ="),
  source.indexOf("AuthenticatedEntry.propTypes ="),
);

const harness = () => {
  const guard = { current: false };
  const calls = [];
  let pathname = "/";
  let effect;
  const context = vm.createContext({
    useRef: () => guard,
    useLocation: () => ({ pathname }),
    useNavigate: () => (path, options) => calls.push([path, options.replace]),
    useEffect: (callback) => { effect = callback; },
  });
  const render = vm.runInContext(`${component}\nAuthenticatedEntry`, context);
  return {
    calls,
    update(status, path = pathname) {
      pathname = path;
      render({ auth_status: status, on_start: () => calls.push("start") });
      effect();
    },
    replayEffect() { effect(); },
  };
};

test("successful login enters from welcome once, including effect replay", () => {
  const app = harness();
  app.update("checking");
  app.update("anonymous");
  assert.deepEqual(app.calls, []);
  app.update("authenticated");
  app.replayEffect();
  app.update("authenticated");
  app.update("authenticated", "/study");
  app.update("authenticated", "/");
  assert.deepEqual(app.calls, ["start", ["/study", true]]);
});

test("an existing authenticated session on welcome enters automatically", () => {
  const app = harness();
  app.update("checking");
  app.update("authenticated");
  assert.deepEqual(app.calls, ["start", ["/study", true]]);
});

test("refreshing an application route preserves its location and selection", () => {
  for (const path of ["/study", "/admin", "/data", "/assets", "/tiles"]) {
    const app = harness();
    app.update("checking", path);
    app.update("authenticated", path);
    app.update("authenticated", "/");
    assert.deepEqual(app.calls, []);
  }
});

test("checking, anonymous, denied, error, and bypass never enter automatically", () => {
  const app = harness();
  for (const status of ["checking", "anonymous", "denied", "error", "bypass"]) {
    app.update(status);
    assert.deepEqual(app.calls, []);
  }
});

test("leaving authenticated resets entry for a subsequent login", () => {
  for (const status of ["anonymous", "denied", "error", "checking", "bypass"]) {
    const app = harness();
    app.update("authenticated");
    app.update(status);
    app.update("authenticated");
    assert.deepEqual(app.calls, ["start", ["/study", true], "start", ["/study", true]]);
  }
});
