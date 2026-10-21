import assert from "node:assert/strict";
import { test } from "node:test";
import {
  server_title,
  update_server_title,
} from "../src/pages/admin/AdminServerTitles.js";
import {
  parse_persisted_object,
  persist_object_setting,
} from "../src/settings/AppSettingsPersistence.js";

test("server titles persist independently for each remote server and this server", () => {
  let titles = update_server_title(
    {},
    "http://10.0.0.182:3000/",
    "  Render lab  ",
  );
  titles = update_server_title(titles, "this-server", "My workstation");
  const saved = new Map();
  const storage = { setItem: (key, value) => saved.set(key, value) };
  assert.equal(
    persist_object_setting(
      storage,
      "admin/server_titles",
      { max_persist_length: 100000 },
      titles,
    ),
    true,
  );
  const restored = parse_persisted_object(saved.get("admin/server_titles"));
  assert.equal(
    server_title(restored, "http://10.0.0.182:3000/", "new live name"),
    "Render lab",
  );
  assert.equal(
    server_title(restored, "this-server", "live local name"),
    "My workstation",
  );
  assert.equal(server_title(restored, "http://other/", "other"), "other");
});

test("clearing a title restores the live name without changing other labels", () => {
  const previous = { "this-server": "Local", "http://remote/": "Remote" };
  const next = update_server_title(previous, "http://remote/", "  ");
  assert.equal(
    server_title(next, "http://remote/", "discovered hostname"),
    "discovered hostname",
  );
  assert.equal(next["this-server"], "Local");
  assert.equal(previous["http://remote/"], "Remote");
  assert.equal(
    update_server_title({}, "this-server", "First\nSecond")["this-server"],
    "First Second",
  );
});

test("the shared title input accepts a deliberately cleared value", async () => {
  const { readFileSync } = await import("node:fs");
  const { transformSync } = await import("esbuild");
  const { runInNewContext } = await import("node:vm");
  const source = readFileSync(
    new URL("../src/utils/ui/CoolInputText.jsx", import.meta.url),
    "utf8",
  )
    .replace(/^import[\s\S]*?;\r?\n/gm, "")
    .replace("export class CoolInputText", "class CoolInputText")
    .replace("export default CoolInputText;", "");
  const prop = () => prop;
  prop.isRequired = prop;
  const Input = runInNewContext(
    transformSync(source, { loader: "jsx" }).code + ";CoolInputText",
    {
      Component: class {
        constructor(props) {
          this.props = props;
        }
        setState(next) {
          Object.assign(this.state, next);
        }
      },
      React: {
        createRef: () => ({ current: null }),
        createElement: (type, props) => ({ type, props }),
      },
      PropTypes: new Proxy({}, { get: () => prop }),
      CoolStyles: {},
    },
  );
  const input = new Input({ value: "Original title", actions: null });
  input.on_change("");
  assert.equal(input.render().props.value, "");
  let saved;
  input.props.actions = { on_confirm: (value) => (saved = value) };
  input.confirm_action("");
  assert.equal(saved, "");
});
