import test from "node:test";
import assert from "node:assert/strict";
import { uses_same_origin_proxy_for_port } from "../src/utils/service_ports_mode.js";

test("direct UI ports use backend service ports in production and development", () => {
  assert.equal(uses_same_origin_proxy_for_port("3006"), false);
  assert.equal(uses_same_origin_proxy_for_port("3106"), false);
});

test("public and other UI origins use same-origin API proxy routes", () => {
  assert.equal(uses_same_origin_proxy_for_port("3000"), true);
  assert.equal(uses_same_origin_proxy_for_port(""), true);
});
