/** Folder creation shared by the tree's New folder form and the details panel. */
const RESERVED_DEVICE_NAME =
  /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(\..*)?$/i;
const FORBIDDEN_CHARACTERS = /[<>:"/\\|?*]/;
const has_control_character = (value) =>
  [...value].some(
    (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
  );

/** One folder name that is valid on Windows, macOS and Linux, or null. */
export function normalize_inventory_folder_name(value) {
  if (typeof value !== "string") return null;
  const name = value.trim();
  if (
    !name ||
    name.length > 64 ||
    name === "." ||
    name === ".." ||
    name.endsWith(".") ||
    FORBIDDEN_CHARACTERS.test(name) ||
    has_control_character(name) ||
    RESERVED_DEVICE_NAME.test(name)
  )
    return null;
  return name;
}

export const inventory_child_folder = (parent, name) =>
  parent ? `${parent}/${name}` : name;

export async function create_inventory_folder({ category, folder_path }) {
  const response = await fetch(
    `${import.meta.env.BASE_URL}api/environment-catalog/folders?category=${encodeURIComponent(category)}`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, folder_path }),
      signal: AbortSignal.timeout(15000),
    },
  );
  const result = await response.json();
  if (!response.ok) throw Error(result.error || "folder_error");
  return result;
}
