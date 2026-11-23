import { useRef, useState } from "react";
import {
  zipSync,
  unzipSync,
  strToU8,
} from "three/addons/libs/fflate.module.js";
import {
  ASSET_IMPORT_LIMIT,
  ASSET_FILE_LIMIT,
  expand_asset_files,
  ignored_asset_file,
} from "@fracto/sdk/FractoAssetArchive.js";
import AppText from "../../AppText.jsx";
import { INVENTORY_IMPORT_TEXT } from "../../text/GamesText.jsx";
import {
  ImportOverlay,
  ImportDialog,
  ImportActions,
} from "./InventoryImportStyles.jsx";
const text = (key) => AppText.get(INVENTORY_IMPORT_TEXT[key]);
export default function InventoryImport({ on_imported, category }) {
  const input = useRef(null);
  const [pending, set_pending] = useState(null),
    [name, set_name] = useState("");
  const [model, set_model] = useState(""),
    [busy, set_busy] = useState(false),
    [message, set_message] = useState("");
  const report = (error) =>
    set_message(
      [
        "invalid_archive",
        "unsafe_path",
        "duplicate_path",
        "import_too_large",
        "archive_depth",
        "no_model",
        "import_busy",
        "blender_unavailable",
        "blender_missing_textures",
        "blender_no_mesh",
        "blender_conversion_failed",
      ].includes(error.message)
        ? error.message
        : "error",
    );
  const choose = async (event) => {
    const selected = [...event.target.files].filter(
      (file) => !ignored_asset_file(file.webkitRelativePath || file.name),
    );
    event.target.value = "";
    if (!selected.length) return;
    set_busy(true);
    set_message("reading");
    try {
      if (
        selected.length > ASSET_FILE_LIMIT ||
        selected.reduce((sum, file) => sum + file.size, 0) > ASSET_IMPORT_LIMIT
      )
        throw new Error("import_too_large");
      const files = await Promise.all(
        selected.map(async (file) => ({
          path: file.webkitRelativePath
            ? file.webkitRelativePath.split("/").slice(1).join("/")
            : file.name,
          data: new Uint8Array(await file.arrayBuffer()),
        })),
      );
      const { models } = expand_asset_files(files, unzipSync);
      set_pending({ files, models });
      set_model(models[0]);
      set_name(
        selected[0].webkitRelativePath?.split("/")[0] ||
          selected[0].name.replace(/\.[^.]+$/, ""),
      );
      set_message("");
    } catch (error) {
      report(error);
    } finally {
      set_busy(false);
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    set_busy(true);
    set_message("importing");
    try {
      const entries = Object.fromEntries(
        pending.files.map((file) => [`files/${file.path}`, file.data]),
      );
      entries["manifest.json"] = strToU8(
        JSON.stringify({ name: name.trim(), model, model_category: category }),
      );
      const response = await fetch(
        `${import.meta.env.BASE_URL}api/environment-catalog/import`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/zip" },
          body: zipSync(entries, { level: 0 }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "error");
      await on_imported(result.id);
      set_pending(null);
      set_message(result.duplicate ? "duplicate" : "success");
    } catch (error) {
      report(error);
    } finally {
      set_busy(false);
    }
  };
  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          set_message("");
          input.current.click();
        }}
      >
        {text("button")}
      </button>
      <input
        ref={input}
        type="file"
        webkitdirectory=""
        directory=""
        multiple
        hidden
        onChange={choose}
      />
      {!pending && message && <p role="status">{text(message)}</p>}
      {pending && (
        <ImportOverlay>
          <ImportDialog
            role="dialog"
            aria-modal="true"
            aria-label={text("title")}
          >
            <h2>{text("title")}</h2>
            <p>{text("help")}</p>
            <form onSubmit={submit}>
              <fieldset disabled={busy}>
                <label>
                  {text("name")}
                  <input
                    autoFocus
                    required
                    maxLength={120}
                    value={name}
                    onChange={(event) => set_name(event.target.value)}
                  />
                </label>
                <label>
                  {text("model")}
                  <select
                    value={model}
                    onChange={(event) => set_model(event.target.value)}
                  >
                    {pending.models.map((file) => (
                      <option key={file} value={file}>
                        {file.replace(/^source\/(?:files|extracted)\//, "")}
                      </option>
                    ))}
                  </select>
                </label>
                <p>{text("files").replace("{count}", pending.files.length)}</p>
                {message && <p role="status">{text(message)}</p>}
                <ImportActions>
                  <button type="submit" disabled={!name.trim()}>
                    {text("confirm")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      set_pending(null);
                      set_message("");
                    }}
                  >
                    {text("cancel")}
                  </button>
                </ImportActions>
              </fieldset>
            </form>
          </ImportDialog>
        </ImportOverlay>
      )}
    </>
  );
}
