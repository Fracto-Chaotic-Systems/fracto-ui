import React, { Component } from "react";
import PropTypes from "prop-types";
import {
  ControlledTreeEnvironment,
  UncontrolledTreeEnvironment,
  Tree,
} from "react-complex-tree";

import "react-complex-tree/lib/style-modern.css";
import { CoolStyles } from "./CoolImports.jsx";

/**
 * A node accepted by CoolTree. `key` must be stable for the lifetime of the
 * node; `title` may be plain text or a React element.
 *
 * @typedef {object} CoolTreeNode
 * @property {string} key Stable node identifier.
 * @property {React.ReactNode} title Displayed node title.
 * @property {CoolTreeNode[]} [children] Nested child nodes.
 * @property {boolean} [isLeaf] Prevents expansion when true.
 * @property {string} [path] JSON-style path represented by this node.
 * @property {string} [type] Normalized JSON type.
 * @property {*} [value] Original value represented by this node.
 * @property {string} [label] Unformatted display label.
 * @property {object} [metadata] Source-property or array-index metadata.
 * @property {boolean} [canRename] Whether this node supports inline editing.
 */

const measure_parent = (tree_element) => {
  const parent_element = tree_element?.parentElement;
  if (!parent_element) return null;
  const bounds = parent_element.getBoundingClientRect();
  return {
    width: Math.max(0, Math.floor(bounds.width)),
    height: Math.max(0, Math.floor(bounds.height)),
  };
};

const SYNTHETIC_ROOT_ID = "__cool_tree_root__";
let tree_instance_count = 0;

const create_tree_id = () => {
  tree_instance_count += 1;
  return `cool-tree-${tree_instance_count}`;
};

const get_value_type = (value) => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
};

const format_value = (value) => {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" && !Number.isFinite(value)) {
    return String(value);
  }
  return String(value);
};

const escape_path_segment = (segment) =>
  String(segment).replaceAll("~", "~0").replaceAll("/", "~1");

const JSON_TYPE_COLORS = {
  key: "#444444",
  array_index: "#777777",
  string: "#287a3d",
  number: "#9a6500",
  boolean: "#71479a",
  null: "#777777",
  object: "#245c78",
  array: "#245c78",
  undefined: "#777777",
};

const does_search_match_item = (search, item, item_title) => {
  const node = item.data;
  const query = search.trim().toLocaleLowerCase();
  if (!query) return true;
  const value_text =
    node?.value !== undefined && typeof node.value === "object"
      ? JSON.stringify(node.value)
      : format_value(node?.value);
  return [node?.path, node?.label, item_title, value_text]
    .filter(Boolean)
    .some((candidate) =>
      String(candidate).toLocaleLowerCase().includes(query),
    );
};

const find_tree_path = (items, item_key) => {
  const path = [];
  let current_key = item_key;
  while (current_key && items[current_key]) {
    path.unshift(current_key);
    current_key = items[current_key].data?.metadata?.parent_key;
  }
  return path;
};

/**
 * Normalize a JSON-compatible value into stable, metadata-rich tree nodes.
 *
 * Keys use escaped JSON-pointer-like segments so that object properties with
 * dots or slashes cannot collide. Human-readable paths and source metadata
 * remain available on each node for selection, search, and future editing.
 *
 * @param {*} value JSON-compatible value to normalize.
 * @param {string} [root_label="root"] Label for the root node.
 * @returns {CoolTreeNode[]} A single normalized root node.
 */
export const normalize_tree_data = (value, root_label = "root") => {
  const visit = ({
    current_value,
    key,
    path,
    label,
    metadata,
    path_segments,
  }) => {
    const type = get_value_type(current_value);
    const entries =
      type === "array"
        ? current_value.map((child, index) => ({
            child,
            segment: index,
            child_label: `[${index}]`,
            child_path: `${path}[${index}]`,
            metadata: { array_index: index },
          }))
        : type === "object" && current_value !== null
          ? Object.entries(current_value).map(([property_name, child]) => ({
              child,
              segment: property_name,
              child_label: property_name,
              child_path: `${path}.${property_name}`,
            metadata: { property_name },
            }))
          : [];
    const children = entries.map(
      ({ child, segment, child_label, child_path, metadata: child_metadata }) =>
        visit({
          current_value: child,
          key: `${key}/${escape_path_segment(segment)}`,
          path: child_path,
          label: child_label,
          metadata: {
            ...child_metadata,
            parent_key: key,
            parent_path: path,
            path_segments: [...path_segments, segment],
          },
          path_segments: [...path_segments, segment],
        }),
    );
    const is_leaf = type !== "object" && type !== "array";
    const title = is_leaf
      ? `${label}: ${format_value(current_value)}`
      : `${label} (${type}, ${children.length})`;
    return {
      key,
      path,
      label,
      title,
      type,
      value: current_value,
      children,
      isLeaf: is_leaf,
      canRename:
        key !== "root" &&
        (is_leaf || metadata?.property_name !== undefined),
      metadata,
    };
  };

  return [
      visit({
      current_value: value,
      key: "root",
      path: "$",
      label: root_label,
      metadata: {},
      path_segments: [],
    }),
  ];
};

/**
 * Render a normalized JSON node without flattening its key and value into one
 * string. Non-normalized nodes continue to render their existing title.
 */
const render_tree_item_title = ({ item, title }) => {
  const node = item.data;
  if (!node || !node.type || !node.label) return title;
  const label_color = node.metadata?.array_index !== undefined
    ? JSON_TYPE_COLORS.array_index
    : JSON_TYPE_COLORS.key;
  const label_style = {
    color: label_color,
    fontWeight: "bold",
  };
  if (!node.isLeaf) {
    return (
      <span>
        <span style={label_style}>{node.label}</span>
        <span style={{ color: JSON_TYPE_COLORS[node.type] }}>
          {` (${node.type}, ${node.children.length})`}
        </span>
      </span>
    );
  }
  return (
    <span>
      <span style={label_style}>{node.label}</span>
      <span style={{ color: "#777777" }}>{": "}</span>
      <span
        style={{
          color: JSON_TYPE_COLORS[node.type] || "#444444",
          fontFamily: "monospace",
        }}
      >
        {format_value(node.value)}
      </span>
    </span>
  );
};

/** Convert CoolTree nodes into react-complex-tree's explicit item map. */
const build_tree_items = (tree_data, editable) => {
  const items = {};
  const visit = (node) => {
    const child_ids = (node.children || []).map((child) => visit(child));
    items[node.key] = {
      index: node.key,
      data: node,
      isFolder: child_ids.length > 0 || node.isLeaf === false,
      children: child_ids,
      canRename: editable === true && node.canRename === true,
    };
    return node.key;
  };
  const root_ids = tree_data.map((node) => visit(node));
  if (root_ids.length === 1) {
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

/**
 * Render a responsive, nested tree with controlled or local state.
 *
 * Each view-state value is controlled when its corresponding prop is
 * supplied. If a prop is omitted, CoolTree maintains that part of the state
 * locally while still invoking the corresponding callback.
 *
 * For large or remote trees, callers may provide `data_provider` and
 * `root_item`. In that mode React Complex Tree requests branches from the
 * provider instead of requiring CoolTree to build an eager item map.
 */
export class CoolTree extends Component {
  static propTypes = {
    /** @type {CoolTreeNode[]} */
    tree_data: PropTypes.arrayOf(PropTypes.object),
    data_provider: PropTypes.object,
    root_item: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    expanded_keys: PropTypes.arrayOf(PropTypes.string),
    selected_keys: PropTypes.arrayOf(PropTypes.string),
    focused_key: PropTypes.string,
    default_expanded_keys: PropTypes.arrayOf(PropTypes.string),
    default_selected_keys: PropTypes.arrayOf(PropTypes.string),
    default_focused_key: PropTypes.string,
    on_select: PropTypes.func,
    on_expand: PropTypes.func,
    on_focus: PropTypes.func,
    on_rename: PropTypes.func,
    selectable: PropTypes.bool,
    editable: PropTypes.bool,
    className: PropTypes.string,
    tree_label: PropTypes.string,
    auto_focus: PropTypes.bool,
    show_live_description: PropTypes.bool,
    searchable: PropTypes.bool,
    search_on_typing: PropTypes.bool,
    interaction_mode: PropTypes.oneOf([
      "double-click-item-to-expand",
      "click-item-to-expand",
      "click-arrow-to-expand",
    ]),
  };

  static defaultProps = {
    tree_data: [],
    data_provider: null,
    root_item: "root",
    expanded_keys: undefined,
    selected_keys: undefined,
    focused_key: undefined,
    default_expanded_keys: [],
    default_selected_keys: [],
    default_focused_key: undefined,
    on_select: null,
    on_expand: null,
    on_focus: null,
    on_rename: null,
    selectable: true,
    editable: false,
    className: undefined,
    tree_label: "Tree",
    auto_focus: false,
    show_live_description: true,
    searchable: false,
    search_on_typing: true,
    interaction_mode: "click-item-to-expand",
  };

  tree_id = create_tree_id();
  tree_component_ref = React.createRef();
  current_tree_items = {};

  state = {
    tree_ref: React.createRef(),
    parent_bounds: null,
    local_expanded_keys: [...this.props.default_expanded_keys],
    local_selected_keys: [...this.props.default_selected_keys],
    local_focused_key: this.props.default_focused_key,
  };

  resize_observer = null;

  componentDidMount() {
    this.update_parent_bounds();
    const parent_element = this.state.tree_ref.current?.parentElement;
    if (typeof ResizeObserver !== "undefined" && parent_element) {
      this.resize_observer = new ResizeObserver(this.update_parent_bounds);
      this.resize_observer.observe(parent_element);
    } else {
      window.addEventListener("resize", this.update_parent_bounds);
    }
  }

  componentWillUnmount() {
    if (this.resize_observer) {
      this.resize_observer.disconnect();
    } else {
      window.removeEventListener("resize", this.update_parent_bounds);
    }
  }

  update_parent_bounds = () => {
    const parent_bounds = measure_parent(this.state.tree_ref.current);
    if (!parent_bounds) return;
    const previous_bounds = this.state.parent_bounds;
    if (
      previous_bounds?.width === parent_bounds.width &&
      previous_bounds?.height === parent_bounds.height
    ) {
      return;
    }
    this.setState({ parent_bounds });
  };

  on_expand = (item, tree_id) => {
    const expanded_keys =
      this.props.expanded_keys ?? this.state.local_expanded_keys;
    const next_expanded_keys = expanded_keys.includes(item.index)
      ? expanded_keys.filter((key) => key !== item.index)
      : [...expanded_keys, item.index];
    if (this.props.expanded_keys === undefined) {
      this.setState({ local_expanded_keys: next_expanded_keys });
    }
    if (this.props.on_expand) {
      this.props.on_expand(next_expanded_keys, { item, tree_id });
    }
  };

  on_collapse = (item, tree_id) => {
    const expanded_keys =
      this.props.expanded_keys ?? this.state.local_expanded_keys;
    const next_expanded_keys = expanded_keys.filter(
      (key) => key !== item.index,
    );
    if (this.props.expanded_keys === undefined) {
      this.setState({ local_expanded_keys: next_expanded_keys });
    }
    if (this.props.on_expand) {
      this.props.on_expand(next_expanded_keys, { item, tree_id });
    }
  };

  on_select = (selected_keys, tree_id, items) => {
    if (this.props.selected_keys === undefined) {
      this.setState({ local_selected_keys: selected_keys });
    }
    if (this.props.on_select) {
      const selected_items = selected_keys
        .map((key) => items[key]?.data ?? items[key])
        .filter(Boolean);
      this.props.on_select(selected_keys, { tree_id, items: selected_items });
    }
  };

  on_focus_item = (item, tree_id) => {
    if (this.props.focused_key === undefined) {
      this.setState({ local_focused_key: item.index });
    }
    if (this.props.on_focus) {
      this.props.on_focus(item.index, { item, tree_id });
    }
  };

  on_rename_item = (item, name, tree_id) => {
    // TODO: Replace the F2-only rename gesture with a visible edit affordance
    // and a form-like input presentation that makes editing discoverable.
    if (this.props.on_rename) {
      this.props.on_rename(item.index, name, { item, tree_id });
    }
  };

  expand_search_matches = async (search) => {
    if (!search.trim() || !this.tree_component_ref.current) return;
    const matching_keys = Object.values(this.current_tree_items)
      .filter((item) =>
        does_search_match_item(
          search,
          item,
          String(item.data.title ?? item.data),
        ),
      )
      .map((item) => item.index);
    for (const item_key of matching_keys) {
      const path = find_tree_path(this.current_tree_items, item_key);
      if (path.length > 1) {
        await this.tree_component_ref.current.expandSubsequently(path);
      }
    }
  };

  render_search_input = ({ inputProps }) => (
    <input
      {...inputProps}
      onChange={(event) => {
        inputProps.onChange(event);
        this.expand_search_matches(event.target.value);
      }}
    />
  );

  render() {
    const { tree_ref, parent_bounds } = this.state;
    const {
      tree_data,
      data_provider,
      root_item,
      expanded_keys,
      selected_keys,
      focused_key,
      selectable,
      editable,
      on_rename,
      className,
      tree_label,
      auto_focus,
      show_live_description,
      searchable,
      search_on_typing,
      interaction_mode,
    } = this.props;
    const resolved_expanded_keys =
      expanded_keys ?? this.state.local_expanded_keys;
    const resolved_selected_keys =
      selected_keys ?? this.state.local_selected_keys;
    const resolved_focused_key = focused_key ?? this.state.local_focused_key;
    const can_rename = editable && typeof on_rename === "function";
    const built_tree = build_tree_items(tree_data, can_rename);
    const items = built_tree.items;
    const resolved_root_item = data_provider
      ? root_item
      : built_tree.root_item;
    this.current_tree_items = items;
    const view_state = {
      [this.tree_id]: {
        expandedItems: resolved_expanded_keys,
        selectedItems: resolved_selected_keys,
        focusedItem: resolved_focused_key,
      },
    };
    const wrapper_style = {
      width: `${parent_bounds?.width || 0}px`,
      height: `${parent_bounds?.height || 0}px`,
      overflow: "auto",
      boxSizing: "border-box",
    };
    const tree_element = (
      <Tree
        treeId={this.tree_id}
        rootItem={resolved_root_item}
        treeLabel={tree_label}
        renderSearchInput={this.render_search_input}
        ref={this.tree_component_ref}
      />
    );
    const environment_props = {
      viewState: view_state,
      defaultInteractionMode: interaction_mode,
      canSearch: searchable,
      canSearchByStartingTyping: searchable && search_on_typing,
      doesSearchMatchItem: does_search_match_item,
      getItemTitle: (item) =>
        String(item.data?.label ?? item.data?.title ?? item.data),
      renderItemTitle: render_tree_item_title,
      onExpandItem: this.on_expand,
      onCollapseItem: this.on_collapse,
      onSelectItems: (keys, tree_id) =>
        selectable ? this.on_select(keys, tree_id, items) : null,
      onFocusItem: this.on_focus_item,
      onRenameItem: this.on_rename_item,
      canDragAndDrop: false,
      canRename: can_rename,
      autoFocus: auto_focus,
      showLiveDescription: show_live_description,
    };
    const tree_environment = data_provider ? (
      <UncontrolledTreeEnvironment
        dataProvider={data_provider}
        {...environment_props}
      >
        {tree_element}
      </UncontrolledTreeEnvironment>
    ) : (
      <ControlledTreeEnvironment items={items} {...environment_props}>
        {tree_element}
      </ControlledTreeEnvironment>
    );
    return (
      <CoolStyles.Block
        className={className}
        style={wrapper_style}
        ref={tree_ref}
      >
        {parent_bounds ? tree_environment : null}
      </CoolStyles.Block>
    );
  }
}

export default CoolTree;
