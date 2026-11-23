const SYNTHETIC_ROOT_ID = "__cool_tree_root__";
const DYNAMIC_PLACEHOLDER_SUFFIX = "__cool_tree_building__";

/** Convert CoolTree nodes into react-complex-tree's explicit item map. */
export const build_tree_items = (
  tree_data,
  editable,
  dynamic = false,
  dynamic_placeholder_label = "building...",
  root_leaf_margin_left_px,
  label_depth_indent_px,
  label_depth_offset_px,
  hide_single_root = true,
) => {
  const sort_nodes = (nodes) =>
    [...nodes].sort((left, right) => {
      const left_is_folder =
        (left.children || []).length > 0 || left.isLeaf === false;
      const right_is_folder =
        (right.children || []).length > 0 || right.isLeaf === false;
      if (left_is_folder !== right_is_folder) {
        return Number(right_is_folder) - Number(left_is_folder);
      }
      const left_label = String(left.label ?? left.title ?? left.key ?? "");
      const right_label = String(right.label ?? right.title ?? right.key ?? "");
      return left_label.localeCompare(right_label);
    });
  const items = {};
  const visit = (node, parent_key = null, path_segments = []) => {
    const child_ids = sort_nodes(node.children || []).map((child) =>
      visit(child, node.key, [...path_segments, node.key]),
    );
    const item_is_folder = child_ids.length > 0 || node.isLeaf === false;
    if (dynamic && item_is_folder) {
      const placeholder_key = `${node.key}/${DYNAMIC_PLACEHOLDER_SUFFIX}`;
      child_ids.push(placeholder_key);
      items[placeholder_key] = {
        index: placeholder_key,
        data: {
          key: placeholder_key,
          label: dynamic_placeholder_label,
          title: dynamic_placeholder_label,
          isLeaf: true,
          is_placeholder: true,
          metadata: {
            parent_key: node.key,
            path_segments: [
              ...(node.metadata?.path_segments || []),
              DYNAMIC_PLACEHOLDER_SUFFIX,
            ],
          },
        },
        isFolder: false,
        children: [],
        canRename: false,
      };
    }
    const metadata = {
      ...(node.metadata || {}),
      parent_key: node.metadata?.parent_key ?? parent_key,
      path_segments: node.metadata?.path_segments ?? path_segments,
      root_leaf_margin_left_px:
        node.metadata?.root_leaf_margin_left_px ?? root_leaf_margin_left_px,
      label_depth_indent_px:
        node.metadata?.label_depth_indent_px ?? label_depth_indent_px,
      label_depth_offset_px:
        node.metadata?.label_depth_offset_px ?? label_depth_offset_px,
    };
    items[node.key] = {
      index: node.key,
      data: { ...node, metadata },
      isFolder: item_is_folder,
      children: child_ids,
      canRename: editable === true && node.canRename === true,
    };
    return node.key;
  };
  const root_ids = sort_nodes(tree_data).map((node) => visit(node));
  if (hide_single_root && root_ids.length === 1) {
    return { items, root_item: root_ids[0] };
  }
  items[SYNTHETIC_ROOT_ID] = {
    index: SYNTHETIC_ROOT_ID,
    data: {
      key: SYNTHETIC_ROOT_ID,
      label: "root",
      title: "root",
      type: "object",
      children: [],
      isLeaf: false,
    },
    isFolder: true,
    children: root_ids,
  };
  return { items, root_item: SYNTHETIC_ROOT_ID };
};
