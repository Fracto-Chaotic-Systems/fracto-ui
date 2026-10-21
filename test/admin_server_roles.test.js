import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import React from "react";
import {
  server_title,
  update_server_title,
} from "../src/pages/admin/AdminServerTitles.js";
import {
  parse_persisted_object,
  persist_object_setting,
} from "../src/settings/AppSettingsPersistence.js";

test("roles persist independently by server, and empty roles restore the default", () => {
  let roles = update_server_title(
    {},
    "http://10.0.0.182:3000/",
    "  rendering  ",
  );
  roles = update_server_title(roles, "this-server", "development");
  const saved = new Map();
  assert.equal(
    persist_object_setting(
      { setItem: (key, value) => saved.set(key, value) },
      "admin/server_roles",
      { max_persist_length: 100000 },
      roles,
    ),
    true,
  );
  const restored = parse_persisted_object(saved.get("admin/server_roles"));
  assert.equal(
    server_title(restored, "http://10.0.0.182:3000/", "default"),
    "rendering",
  );
  const cleared = update_server_title(restored, "http://10.0.0.182:3000/", "");
  assert.equal(
    server_title(cleared, "http://10.0.0.182:3000/", "default"),
    "default",
  );
  assert.equal(server_title(cleared, "this-server", "default"), "development");
});

test("role editor saves confirmed text and discards cancelled edits", () => {
  const source = readFileSync(
    new URL("../src/pages/admin/AdminServerRole.jsx", import.meta.url),
    "utf8",
  )
    .replace(/^import[\s\S]*?;\r?\n/gm, "")
    .replace("export default class AdminServerRole", "class AdminServerRole");
  const prop = () => prop;
  prop.isRequired = prop;
  const Role = runInNewContext(
    transformSync(source, { loader: "jsx" }).code + ";AdminServerRole",
    {
      React,
      Component: class {
        constructor(props) {
          this.props = props;
        }
        setState(next) {
          Object.assign(this.state, next);
        }
      },
      PropTypes: new Proxy({}, { get: () => prop }),
      AppText: { get: (key) => key },
      KEY_ADMIN_SERVERS_ROLE_LABEL: "role",
      KEY_ADMIN_SERVERS_EDIT_ROLE: "edit",
      KEY_ADMIN_SERVERS_SAVE_ROLE: "save",
      KEY_ADMIN_SERVERS_CANCEL_ROLE: "cancel",
      CoolEditLink: () => null,
      CoolInputText: () => null,
    },
  );
  const saved = [];
  const role = new Role({
    role: "default",
    on_save: (value) => saved.push(value),
  });
  const open = () =>
    role.render().props.children[1].props.children[1].props.on_click();
  open();
  assert.equal(role.state.editing, true);
  role.props = { ...role.props }; // A health-refresh render does not reset the editor.
  const actions = role.render().props.children[1].props.actions;
  actions.on_confirm("rendering");
  assert.deepEqual(saved, ["rendering"]);
  assert.equal(role.state.editing, false);
  open();
  role.render().props.children[1].props.actions.on_cancel();
  assert.deepEqual(saved, ["rendering"]);
  assert.equal(role.state.editing, false);
});
