import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { parse } from "@babel/parser";
import { transformSync } from "esbuild";

// Render the real JSX into inspectable elements with external services stubbed.
// This exercises render decisions and handlers, not browser layout or effects.
const load_component = (file, names, overrides = {}) => {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const imports = parse(source, { sourceType: "module", plugins: ["jsx"] })
    .program.body.filter((node) => node.type === "ImportDeclaration");
  const globals = {};
  for (const node of imports) {
    for (const specifier of node.specifiers) {
      globals[specifier.local.name] = specifier.local.name;
    }
  }
  const prop_type = () => prop_type;
  prop_type.isRequired = prop_type;
  Object.assign(globals, {
    React: {
      createElement: (type, props, ...children) => ({ type, props, children }),
      createRef: () => ({ current: null }),
    },
    Component: class { constructor(props) { this.props = props; } },
    PropTypes: new Proxy({}, { get: () => prop_type }),
    AppText: { get: (key) => key },
    styles: new Proxy({}, { get: (_, name) => name }),
    useLocation: () => ({ pathname: "/data" }),
  });
  Object.assign(globals, overrides);
  const code = transformSync(source.replace(/^import[\s\S]*?;\r?\n/gm, "")
    .replace(/^export default .*;$/gm, "")
    .replace(/^export (class|const) /gm, "$1 "), { loader: "jsx" }).code;
  return vm.runInNewContext(`${code}\n({${names.join(",")}})`, globals);
};

const { App, AppHeader, WelcomeRoute } = load_component("../src/App.jsx", [
  "App", "AppHeader", "WelcomeRoute",
]);
const { WelcomeOIDC } = load_component("../src/pages/WelcomeOIDC.jsx", ["WelcomeOIDC"]);
const { PageWelcome } = load_component("../src/pages/PageWelcome.jsx", ["PageWelcome"]);

const find = (node, type) => {
  if (!node || typeof node !== "object") return null;
  if (node.type === type) return node;
  for (const child of (Array.isArray(node) ? node : node.children || [])) {
    const match = find(child, type);
    if (match) return match;
  }
  return null;
};

test("checking renders welcome at every protected route without redirecting", () => {
  const app = new App({});
  app.state = { selected_page: "study", auth_status: "checking" };
  const routes = find(app.render(), "Routes").children[0];
  for (const route of routes) {
    assert.equal(route.props.element.type, WelcomeRoute);
    assert.equal(route.props.element.props.auth_status, "checking");
  }
  assert.equal(AppHeader({ auth_status: "checking" }), null);
});

test("resolved access renders application pages only for authenticated or bypass", () => {
  for (const status of ["authenticated", "bypass", "anonymous", "denied", "error"]) {
    const app = new App({});
    app.state = { selected_page: "study", auth_status: status };
    const routes = find(app.render(), "Routes").children[0];
    const data = routes.find((route) => route.props.path === "/data").props.element;
    if (["authenticated", "bypass"].includes(status)) {
      assert.equal(data.type, "Data");
    } else {
      assert.equal(data.type, "Navigate");
      assert.equal(data.props.to, "/");
      assert.equal(AppHeader({ auth_status: status }), null);
    }
  }
});

test("welcome and OIDC expose manual entry only in bypass", () => {
  for (const status of ["checking", "authenticated", "denied", "bypass", "anonymous", "error"]) {
    const calls = [];
    const props = { auth_status: status, on_start: () => calls.push("start"), on_login: () => calls.push("login") };
    const oidc = new WelcomeOIDC(props);
    const page = new PageWelcome(props);
    const actionable = ["bypass", "anonymous", "error"].includes(status);
    assert.equal(Boolean(find(oidc.render(), "OIDCAction")), status === "bypass");
    assert.equal(Boolean(find(oidc.render(), "GoogleSignInAction")),
      ["anonymous", "error"].includes(status));
    assert.equal(Boolean(find(page.render(), "SubtitleLayer")), actionable);
    oidc.handle_action({ stopPropagation() {} });
    assert.deepEqual(calls, status === "bypass" ? ["start"] :
      ["anonymous", "error"].includes(status) ? ["login"] : []);
    if (["checking", "denied", "error"].includes(status)) {
      assert.ok(find(page.render(), "AccessMessage").children[0]);
    }
  }
});

test("starting login requests a welcome callback without selecting an application page", () => {
  const calls = [];
  const { AuthBackend } = load_component("../src/backend/AuthBackend.jsx", ["AuthBackend"], {
    service_origin: () => "https://fracto.example",
    window: { location: { assign: (url) => calls.push(url) } },
  });
  const { App: LoginApp } = load_component("../src/App.jsx", ["App"], { AuthBackend });
  const app = new LoginApp({});
  app.enter_application = () => assert.fail("Login must not enter before session validation");
  app.start_auth_login();
  assert.deepEqual(calls, ["https://fracto.example/auth/login?return_to=%2F"]);
});

test("the manual welcome callback navigates only in bypass mode", () => {
  const calls = [];
  const { WelcomeRoute: ManualWelcome } = load_component("../src/App.jsx", ["WelcomeRoute"], {
    useNavigate: () => (path) => calls.push(path),
  });
  for (const status of ["checking", "anonymous", "authenticated", "denied", "error"]) {
    ManualWelcome({ auth_status: status, on_start: () => calls.push("start") }).props.on_start();
  }
  assert.deepEqual(calls, []);
  ManualWelcome({ auth_status: "bypass", on_start: () => calls.push("start") }).props.on_start();
  assert.deepEqual(calls, ["start", "/study"]);
});

test("callback failure selects error instead of automatically entering an old session", async () => {
  for (const auth_enabled of [true, false]) {
    const { App: CallbackApp } = load_component("../src/App.jsx", ["App"], {
      consume_auth_callback_error: () => true,
      AuthBackend: { load_auth_session: async () => ({ auth_enabled, auth_state: "authenticated" }) },
    });
    const app = new CallbackApp({});
    app.setState = (state) => { app.state = { ...app.state, ...state }; };
    await app.check_auth_session();
    assert.equal(app.state.auth_status, auth_enabled ? "error" : "bypass");
  }
});

const session_flow = (initial_path = "/") => {
  let path = initial_path;
  let last_route = "/study";
  let result = { auth_enabled: true, authenticated: false, auth_state: "anonymous" };
  let effect;
  const guard = { current: false };
  const navigations = [];
  const selections = [];
  const { App: SessionApp, AuthenticatedEntry } = load_component("../src/App.jsx", ["App", "AuthenticatedEntry"], {
    consume_auth_callback_error: () => false,
    useLocation: () => ({ pathname: path }),
    useRef: () => guard,
    useEffect: (callback) => { effect = callback; },
    useNavigate: () => (destination) => { navigations.push(destination); path = destination; },
    KEY_LAST_APP_ROUTE: "root/last_app_route",
    KEY_MENU_ADMIN: "admin",
    KEY_MENU_ASSETS: "assets",
    KEY_MENU_DATA: "data",
    KEY_MENU_STUDY: "study",
    KEY_MENU_TILES: "tiles",
    AppSettings: {
      get: () => last_route,
      on_settings_changed: (value) => {
        if ("root/last_app_route" in value) last_route = value["root/last_app_route"];
        else selections.push(value);
      },
    },
    AuthBackend: {
      load_auth_session: async () => { if (result instanceof Error) throw result; return result; },
      logout_auth_session: async () => { result = { auth_enabled: true, auth_state: "anonymous" }; },
    },
  });
  const app = new SessionApp({});
  app.state.selected_page = "existing selection";
  app.setState = (state) => { app.state = { ...app.state, ...state }; };
  const flush = () => {
    AuthenticatedEntry({ auth_status: app.state.auth_status, on_start: app.enter_application });
    effect();
    const routes = find(app.render(), "Routes").children[0];
    const route = routes.find((entry) => entry.props.path === path);
    if (route.props.element.type === "Navigate") path = route.props.element.props.to;
  };
  return {
    app, navigations, selections, flush,
    get path() { return path; },
    async check(next = result) { result = next; await app.check_auth_session(); flush(); },
    async logout() { await app.logout_auth_session(); flush(); },
  };
};
const enabled_session = { auth_enabled: true, authenticated: true,
  auth_state: "authenticated", user: { id: 1, enabled: true } };

test("session loading drives first entry once and permits entry again after logout/login", async () => {
  const flow = session_flow();
  await flow.check();
  assert.equal(flow.path, "/");
  await flow.check(enabled_session);
  assert.equal(flow.path, "/study");
  await flow.check(enabled_session);
  flow.flush();
  assert.equal(flow.navigations.length, 1);
  assert.equal(flow.selections.length, 1);
  await flow.logout();
  assert.equal(flow.path, "/");
  assert.equal(flow.app.state.auth_user, null);
  await flow.check(enabled_session);
  assert.equal(flow.path, "/study");
  assert.equal(flow.navigations.length, 2);
  assert.equal(flow.selections.length, 2);
});

test("refreshing an existing session preserves each application destination", async () => {
  for (const path of ["/admin", "/data", "/assets", "/tiles", "/study"]) {
    const flow = session_flow(path);
    flow.flush();
    assert.equal(flow.path, path);
    await flow.check(enabled_session);
    assert.equal(flow.path, path);
    assert.equal(flow.navigations.length, 0);
    assert.equal(flow.selections.length, 1);
  }
});

test("denial, invalid/expired sessions, and lookup errors return to welcome without entry", async () => {
  for (const result of [
    { auth_enabled: true, authenticated: true, auth_state: "denied", user: { enabled: false } },
    { auth_enabled: true, authenticated: false, auth_state: "anonymous", user: null },
    new Error("session service unavailable"),
  ]) {
    const flow = session_flow("/data");
    await flow.check(result);
    assert.equal(flow.path, "/");
    assert.equal(flow.navigations.length, 0);
    assert.equal(flow.selections.length, 0);
  }
});

test("disabled authentication retains bypass even if a denied identity has a cookie", async () => {
  const flow = session_flow();
  await flow.check({ auth_enabled: false, authenticated: true,
    auth_state: "denied", user: { enabled: false } });
  assert.equal(flow.app.state.auth_status, "bypass");
  assert.equal(flow.path, "/");
  assert.equal(flow.navigations.length, 0);
});
