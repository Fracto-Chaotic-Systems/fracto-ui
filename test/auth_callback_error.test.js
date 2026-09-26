import test from "node:test";
import assert from "node:assert/strict";
import { consume_auth_callback_error } from "../src/utils/auth_callback_error.js";

test("callback errors are consumed once without exposing raw text or dropping other URL state", () => {
  const location = { href: "https://fracto.example/?view=1&auth_error=private-message#point" };
  const state = { key: "router-state" };
  const history = { state, replaceState(next_state, title, path) {
    assert.equal(next_state, state);
    assert.equal(path, "/?view=1#point");
    location.href = new URL(path, location.href).href;
  } };
  assert.equal(consume_auth_callback_error(location, history), true);
  assert.equal(consume_auth_callback_error(location, history), false);
});
