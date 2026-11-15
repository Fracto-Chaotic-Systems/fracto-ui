import { Fragment } from "react";
import AppText from "../../AppText.jsx";
import { INSTRUMENT_TRANSFER_TEXT } from "../../text/AdminText.jsx";
import {
  transfer_active,
  transfer_bytes,
  transfer_can_apply,
  transfer_error_key,
  transfer_expired,
  transfer_receipt_verified,
} from "./InstrumentTransferModel.js";
import {
  TransferPanel,
  TransferActions,
  TransferTable,
  TransferStatus,
  TransferError,
} from "./InstrumentTransferStyles.jsx";

const text = (key, values = {}) => {
  let result =
    AppText.get(INSTRUMENT_TRANSFER_TEXT[key]) ??
    AppText.get(INSTRUMENT_TRANSFER_TEXT.working) ??
    "";
  for (const [name, value] of Object.entries(values))
    result = result.replaceAll(`{${name}}`, String(value));
  return result;
};
export default function InstrumentTransferView({
  source_url,
  server_url,
  configured,
  loading,
  pending,
  job,
  error,
  connection_error,
  uncertain,
  requires_preview,
  cancel_requested,
  on_preview,
  on_apply,
  on_cancel,
  on_reload,
}) {
  const active = transfer_active(job),
    busy = !!pending || active || uncertain;
  const expired = transfer_expired(job),
    verified = transfer_receipt_verified(job);
  const summary = job?.summary,
    progress = job?.progress;
  const phase =
    active && INSTRUMENT_TRANSFER_TEXT[`phase_${job.phase}`]
      ? `phase_${job.phase}`
      : `state_${job?.state}`;
  const status = uncertain
    ? "recovering"
    : expired
      ? "state_expired"
      : job?.state === "completed" && !verified
        ? "error_verification_failed"
        : phase;
  const count =
    job?.state === "previewing"
      ? progress?.files_checked
      : progress?.files_verified;
  const count_text =
    job?.state === "previewing"
      ? progress?.files_total
        ? "checked_total"
        : "checked"
      : "verified";
  const rows = summary
    ? [
        ["files_total", summary.package_files],
        ["matching_files", summary.matching_files],
        ["missing_files", summary.missing_files],
        [
          "transfer_bytes",
          transfer_bytes(
            summary.missing_bytes + (summary.replacement_bytes ?? 0),
            text,
          ),
        ],
        [
          job.replacement_policy === "source"
            ? "replacement_files"
            : "conflicts",
          job.replacement_policy === "source"
            ? (summary.replacement_files ?? summary.conflict_files)
            : summary.conflict_files,
        ],
        ["free_space", transfer_bytes(summary.free_bytes, text)],
        ["required_space", transfer_bytes(summary.required_free_bytes, text)],
      ]
    : [];
  return (
    <TransferPanel aria-label={text("title")}>
      <h2>{text("title")}</h2>
      <p>{text("note")}</p>
      <dl>
        <dt>{text("source")}</dt>
        <dd>
          <code>{source_url}</code>
        </dd>
        <dt>{text("destination")}</dt>
        <dd>
          <code>{server_url}</code>
        </dd>
      </dl>
      <p>{text(loading ? "loading" : configured ? "configured" : "setup")}</p>
      {connection_error && (
        <TransferError role="alert">{text(connection_error)}</TransferError>
      )}
      <TransferActions>
        <button
          type="button"
          onClick={on_preview}
          disabled={!configured || loading || busy}
        >
          {text(job || error ? "preview_again" : "preview")}
        </button>
        <button type="button" onClick={on_reload} disabled={loading || busy}>
          {text("reload")}
        </button>
      </TransferActions>
      {job && (
        <TransferStatus role="status" aria-live="polite">
          <strong>{text(status)}</strong>
          {active && (
            <progress
              aria-label={text("title")}
              max={progress?.files_total || undefined}
              value={
                progress?.files_total
                  ? Math.min(count || 0, progress.files_total)
                  : undefined
              }
            />
          )}
          {progress && (
            <p>
              {text(count_text, {
                count: count ?? 0,
                total: progress.files_total ?? 0,
              })}
            </p>
          )}
          {!!progress?.bytes_to_transfer && (
            <p>
              {text("bytes_progress", {
                count: transfer_bytes(progress.bytes_transferred, text),
                total: transfer_bytes(progress.bytes_to_transfer, text),
              })}
            </p>
          )}
        </TransferStatus>
      )}
      {uncertain && !job && <p role="status">{text("recovering")}</p>}
      {(error || job?.error) && (
        <TransferError role="alert">
          {text(error || transfer_error_key(job.error))}
        </TransferError>
      )}
      {job?.state === "partial" && (
        <TransferError role="alert">{text("partial")}</TransferError>
      )}
      {job?.state === "staged" && <p>{text("staged")}</p>}
      {job?.state === "ready" && !job.publication_supported && (
        <TransferError role="alert">
          {text("error_upgrade_required")}
        </TransferError>
      )}
      {summary && (
        <>
          <TransferTable>
            <caption>{text("preview_summary")}</caption>
            <tbody>
              {rows.map(([key, value]) => (
                <tr key={key}>
                  <th scope="row">{text(key)}</th>
                  <td>
                    {typeof value === "number" ? value.toLocaleString() : value}
                  </td>
                </tr>
              ))}
            </tbody>
          </TransferTable>
          <p>{text("preview_note")}</p>
        </>
      )}
      <TransferActions>
        {job?.state === "ready" && (
          <button
            type="button"
            data-primary="true"
            onClick={on_apply}
            disabled={
              busy ||
              !configured ||
              requires_preview ||
              !transfer_can_apply(job)
            }
          >
            {text(
              job.replacement_policy === "source" ? "apply_source" : "apply",
            )}
          </button>
        )}
        {(active || job?.state === "ready" || uncertain) && (
          <button
            type="button"
            onClick={on_cancel}
            disabled={!!pending || cancel_requested}
          >
            {text(pending === "cancel" ? "cancelling" : "cancel")}
          </button>
        )}
      </TransferActions>
      {cancel_requested && active && (
        <p role="status">{text("cancel_requested")}</p>
      )}
      {active && <p>{text("detached")}</p>}
      {verified && (
        <>
          <p role="status">{text("complete")}</p>
          <details>
            <summary>{text("receipt")}</summary>
            <dl>
              {[
                [
                  "completed_at",
                  new Date(job.receipt.completed_at).toLocaleString(),
                ],
                ["receipt_files", job.receipt.files_verified.toLocaleString()],
                [
                  "receipt_bytes",
                  transfer_bytes(job.receipt.bytes_verified, text),
                ],
                ["catalog", job.receipt.catalog_sha256],
                ["manifest", job.receipt.manifest_sha256],
              ].map(([key, value]) => (
                <Fragment key={key}>
                  <dt>{text(key)}</dt>
                  <dd>
                    <code>{value}</code>
                  </dd>
                </Fragment>
              ))}
            </dl>
          </details>
        </>
      )}
    </TransferPanel>
  );
}
