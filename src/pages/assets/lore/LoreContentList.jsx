import React, { Component } from "react";
import PropTypes from "prop-types";

import DataBackend from "../../../backend/DataBackend.jsx";
import { LoreStyles as styles } from "./LoreStyles.jsx";
import { MainStyles as main_styles } from "../../../styles/MainStyles.jsx";
import {
  CELL_ALIGN_CENTER,
  CELL_ALIGN_LEFT,
  CELL_TYPE_CALLBACK,
  CELL_TYPE_TEXT,
  CELL_TYPE_TEXT_KEY,
  CELL_TYPE_TIME_AGO,
} from "../../../utils/ui/styles/CoolTableStyles.jsx";
import {
  KEY_LORE_CONTENT_DRAFT,
  KEY_LORE_CONTENT_MODIFIED,
  KEY_LORE_CONTENT_OPS,
  KEY_LORE_CONTENT_PUBLISHED,
  KEY_LORE_CONTENT_STATUS,
  KEY_LORE_CONTENT_TITLE,
  KEY_LORE_OP_CLONE_CONTENT,
  KEY_LORE_OP_EDIT_CONTENT,
  KEY_LORE_OP_REMOVE_CONTENT,
  KEY_LORE_OP_VIEW_CONTENT,
} from "../../../text/AssetsText.jsx";
import CoolTable from "../../../utils/ui/CoolTable.jsx";
import AppText from "../../../AppText.jsx";

export const OP_EDIT_CONTENT = "op_edit_content";
export const OP_VIEW_CONTENT = "op_view_content";
export const OP_CLONE_CONTENT = "op_clone_content";
export const OP_REMOVE_CONTENT = "op_remove_content";

const TABLE_COLUMNS = [
  {
    id: "title",
    label_key: KEY_LORE_CONTENT_TITLE,
    width_px: 150,
    type: CELL_TYPE_TEXT,
    align: CELL_ALIGN_LEFT,
  },
  {
    id: "modified",
    label_key: KEY_LORE_CONTENT_MODIFIED,
    width_px: 100,
    type: CELL_TYPE_TIME_AGO,
    align: CELL_ALIGN_LEFT,
  },
  {
    id: "status",
    label_key: KEY_LORE_CONTENT_STATUS,
    width_px: 80,
    type: CELL_TYPE_TEXT_KEY,
    align: CELL_ALIGN_CENTER,
  },
  {
    id: "operations",
    label_key: KEY_LORE_CONTENT_OPS,
    width_px: 180,
    type: CELL_TYPE_CALLBACK,
    align: CELL_ALIGN_CENTER,
  },
];

export class LoreContentList extends Component {
  static propTypes = {
    category_id: PropTypes.number.isRequired,
    width_px: PropTypes.number.isRequired,
    height_px: PropTypes.number.isRequired,
    on_select_content: PropTypes.func.isRequired,
    on_content_ops: PropTypes.func.isRequired,
  };

  state = {
    order_by: -1,
    content_list: [],
  };

  componentDidMount() {
    this.load_content();
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.category_id !== this.props.category_id) {
      this.load_content();
    }
  }

  load_content = () => {
    const { category_id } = this.props;
    if (!category_id) {
      return;
    }
    DataBackend.lore_content_listing(category_id, (response) => {
      console.log("load_content", category_id, response);
      this.setState({ content_list: response.result });
    });
  };

  cell_operations = (item) => {
    const { on_content_ops } = this.props;
    const edit_link = (
      <main_styles.NormalLink
        onClick={() => on_content_ops(OP_EDIT_CONTENT, item)}
      >
        {AppText.get(KEY_LORE_OP_EDIT_CONTENT)}
      </main_styles.NormalLink>
    );
    const view_link = (
      <main_styles.NormalLink
        onClick={() => on_content_ops(OP_VIEW_CONTENT, item)}
      >
        {AppText.get(KEY_LORE_OP_VIEW_CONTENT)}
      </main_styles.NormalLink>
    );
    const clone_link = (
      <main_styles.NormalLink
        onClick={() => on_content_ops(OP_CLONE_CONTENT, item)}
      >
        {AppText.get(KEY_LORE_OP_CLONE_CONTENT)}
      </main_styles.NormalLink>
    );
    const remove_link = (
      <main_styles.NormalLink
        onClick={() => on_content_ops(OP_REMOVE_CONTENT, item)}
      >
        {AppText.get(KEY_LORE_OP_REMOVE_CONTENT)}
      </main_styles.NormalLink>
    );
    return [
      edit_link,
      <main_styles.HalfRemSpacer />,
      view_link,
      <main_styles.HalfRemSpacer />,
      clone_link,
      <main_styles.HalfRemSpacer />,
      remove_link,
    ];
  };

  render_content_list = () => {
    const { content_list } = this.state;
    const table_data = content_list
      .filter((item) => !item.content_meta.hidden)
      .sort(
        (a, b) =>
          Date.parse(b.content_meta.modified) -
          Date.parse(a.content_meta.modified),
      )
      .map((item) => {
        return {
          title: item.title,
          modified: item.content_meta.modified,
          status: item.content_meta.published
            ? KEY_LORE_CONTENT_PUBLISHED
            : KEY_LORE_CONTENT_DRAFT,
          operations: [this.cell_operations, item],
        };
      });
    return <CoolTable data={table_data} columns={TABLE_COLUMNS} />;
  };

  render() {
    const content_list = this.render_content_list();
    const list_style = {
      maxHeight: "15rem",
    };
    return (
      <styles.ScrollingLoreList style={list_style}>
        {content_list}
      </styles.ScrollingLoreList>
    );
  }
}
