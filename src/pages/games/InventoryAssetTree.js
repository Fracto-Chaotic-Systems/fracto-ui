import { normalize_model_folder } from "@fracto/sdk/FractoEnvironmentCatalog.js";

/** Stable IDs keep duplicate display names and folders distinct across reloads. */
export function build_inventory_asset_tree(assets, paths = []) {
  const roots = [],
    folders = new Map();
  for (const asset of [
    ...paths.map((folder_path) => ({ folder_path })),
    ...assets,
  ]) {
    const folder = normalize_model_folder(asset.folder_path);
    let children = roots,
      current = "";
    for (const name of folder ? folder.split("/") : []) {
      current = current ? `${current}/${name}` : name;
      if (!folders.has(current)) {
        const node = {
          key: `folder:${current}`,
          title: name,
          children: [],
          isLeaf: false,
        };
        folders.set(current, node);
        children.push(node);
      }
      children = folders.get(current).children;
    }
    if (!asset.id) continue;
    children.push({
      key: `asset:${asset.id}`,
      title: asset.name,
      isLeaf: true,
      metadata: { asset_id: asset.id },
    });
  }
  const sort = (nodes) => {
    nodes.sort(
      (a, b) =>
        Number(a.isLeaf) - Number(b.isLeaf) ||
        a.title.localeCompare(b.title, "en", {
          numeric: true,
          sensitivity: "base",
        }) ||
        a.key.localeCompare(b.key),
    );
    nodes.forEach((node) => node.children && sort(node.children));
  };
  sort(roots);
  return {
    nodes: roots,
    folder_keys: [...folders.values()].map((node) => node.key),
  };
}
