import React from "react";
import { createRoot } from "react-dom/client";
import AppText from "../src/AppText.jsx";
import { APP_ADMIN_TEXT } from "../src/text/AdminText.jsx";
import AdminBackend from "../src/backend/AdminBackend.jsx";
import AdminInstrumentTransfer from "../src/pages/admin/AdminInstrumentTransfer.jsx";

AppText.initialize(APP_ADMIN_TEXT);
const scenario = new URLSearchParams(location.search).get("scenario");
const hash = "a".repeat(64);
let job, started;
const snapshot = () => structuredClone(job);
AdminBackend.instrument_transfer_peers = async () => ({
  protocol_version: 1,
  peers: [{ peer: "http://fixture-destination" }],
});
AdminBackend.instrument_transfer_preview = async () => {
  started = null;
  job = {
    protocol_version: 1,
    id: `fixture-${Date.now()}`,
    state: scenario === "conflict" ? "blocked" : "ready",
    phase: "preview_complete",
    publication_supported: scenario !== "unsupported",
    preview_only: false,
    manifest_sha256: hash,
    plan_sha256: hash,
    expires_at: new Date(Date.now() + 60000).toISOString(),
    error:
      scenario === "conflict"
        ? { code: "instrument_transfer_catalog_conflict" }
        : null,
    summary: {
      source_catalog_sha256: hash,
      package_files: 1500,
      package_bytes: 104857600,
      matching_files: 200,
      missing_files: 1300,
      missing_bytes: 94371840,
      conflict_files: scenario === "conflict" ? 1 : 0,
      free_bytes: 10737418240,
      required_free_bytes: 209715200,
      publication_state: "unchanged",
    },
  };
  return snapshot();
};
AdminBackend.instrument_transfer_apply = async () => {
  job.state = "transferring";
  job.phase = "sending_files";
  started = Date.now();
  return snapshot();
};
AdminBackend.instrument_transfer_cancel = async () => {
  job.state = "cancelled";
  started = null;
  return snapshot();
};
AdminBackend.instrument_transfer_job = async () => {
  if (!job) throw Object.assign(Error(), { status: 404 });
  if (started) {
    const elapsed = Date.now() - started;
    job.progress = {
      files_verified: Math.min(1500, Math.floor(elapsed / 4)),
      files_total: 1500,
      bytes_transferred: Math.min(
        94371840,
        Math.floor((elapsed / 6000) * 94371840),
      ),
      bytes_to_transfer: 94371840,
    };
    if (elapsed > 3500) {
      job.state = "publishing";
      job.phase = "publishing_library";
    }
    if (elapsed > 6000) {
      job.state = scenario === "partial" ? "partial" : "completed";
      job.phase = "completed";
      if (job.state === "completed") {
        job.summary.publication_state = "published";
        job.receipt = {
          protocol_version: 1,
          manifest_sha256: hash,
          catalog_sha256: hash,
          files_verified: 1500,
          bytes_verified: 104857600,
          completed_at: new Date().toISOString(),
        };
      }
      started = null;
    }
  }
  return snapshot();
};
createRoot(document.getElementById("root")).render(
  <AdminInstrumentTransfer
    source_url="http://fixture-source"
    server_url="http://fixture-destination"
  />,
);
