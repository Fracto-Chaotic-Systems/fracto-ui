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

const harness = (initial_route = "/study") => {
  const guard = { current: false };
  const calls = [];
  const changes = [];
  let last_route = initial_route;
  let pathname = "/";
  let effect;
  const context = vm.createContext({
    useRef: () => guard,
    useLocation: () => ({ pathname }),
    useNavigate: () => (path, options) => calls.push([path, options.replace]),
    useEffect: (callback) => { effect = callback; },
    ROUTES: ["/admin", "/data", "/assets", "/tiles", "/study", "/"].map(
      (path) => ({ path }),
    ),
    KEY_LAST_APP_ROUTE: "root/last_app_route",
    AppSettings: {
      get: () => last_route,
      on_settings_changed: (setting) => {
        last_route = setting["root/last_app_route"];
        changes.push(last_route);
      },
    },
  });
  const render = vm.runInContext(`${component}\nAuthenticatedEntry`, context);
  return {
    calls,
    changes,
    get last_route() { return last_route; },
    update(status, path = pathname) {
      pathname = path;
      render({
        auth_status: status,
        on_start: (destination) => calls.push(["start", destination]),
      });
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
  assert.deepEqual(app.calls, [["start", "/study"], ["/study", true]]);
});

test("an existing authenticated session on welcome enters automatically", () => {
  const app = harness();
  app.update("checking");
  app.update("authenticated");
  assert.deepEqual(app.calls, [["start", "/study"], ["/study", true]]);
});

test("successful login returns to the last saved application page", () => {
  const app = harness("/assets");
  app.update("authenticated");
  assert.deepEqual(app.calls, [["start", "/assets"], ["/assets", true]]);
});

test("refreshing an application route preserves its location and selection", () => {
  for (const path of ["/study", "/admin", "/data", "/assets", "/tiles"]) {
    const app = harness();
    app.update("checking", path);
    app.update("authenticated", path);
    app.update("authenticated", "/");
    assert.deepEqual(app.calls, [["start", path]]);
    assert.equal(app.last_route, path);
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
    assert.deepEqual(app.calls, [
      ["start", "/study"], ["/study", true],
      ["start", "/study"], ["/study", true],
    ]);
  }
});
