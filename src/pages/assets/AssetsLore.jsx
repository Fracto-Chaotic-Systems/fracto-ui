import React, { Component } from "react";

import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import { LoreStyles as lore_styles } from "./lore/LoreStyles.jsx";
import AppText from "../../AppText.jsx";
import { KEY_ASSETS_LORE } from "../../text/AssetsText.jsx";
import { KEY_STUDY_SPLITTER_POS_PX } from "../../settings/StudySettings.jsx";
import { update_dimensions } from "../PageUtils.jsx";
import LoreCategoryList from "./lore/LoreCategoryList.jsx";
import { CATEGORY_LIST_WIDTH_PX } from "./lore/LoreStyles.jsx";
import {
  LoreContentList,
  OP_EDIT_CONTENT,
  OP_REMOVE_CONTENT,
} from "./lore/LoreContentList.jsx";
import { edit_lore_component, remove_content } from "./lore/LoreUtils.jsx";
import CoolStyles from "../../utils/ui/styles/CoolStyles.jsx";

const UPDATE_INTERVAL_MS = 1000;

export class AssetsLore extends Component {
  state = {
    rendered_width: 0,
    rendered_height: 0,
    interval: null,
    edit_component: [],
    list_component: [],
    content: [],
    category: null,
  };

  componentDidMount() {
    this.update_dimensions();
    this.setState({
      interval: setInterval(this.update_dimensions, UPDATE_INTERVAL_MS),
    });
  }

  componentWillUnmount() {
    const { interval, subscription } = this.state;
    if (interval) {
      clearInterval(interval);
    }
  }

  update_dimensions = () => {
    const { rendered_width, rendered_height } = this.state;
    const new_values = update_dimensions(
      rendered_width,
      rendered_height,
      KEY_STUDY_SPLITTER_POS_PX,
    );
    if (new_values) {
      this.setState(new_values);
    }
  };

  on_new_item = (edit_component) => {
    this.setState({ edit_component, list_component: [] });
  };

  on_select_content = (content) => {
    this.setState({ content });
  };

  on_update_list = (content) => {
    this.on_select_category(content.category);
  };

  on_content_ops = async (op, content) => {
    const { category, rendered_width, rendered_height } = this.state;
    switch (op) {
      case OP_EDIT_CONTENT:
        {
          const edit_component = await edit_lore_component(
            content,
            rendered_width,
            rendered_height,
            this.on_update_list,
          );
          this.setState({ edit_component });
        }
        break;
      case OP_REMOVE_CONTENT:
        {
          console.log("remove", content);
          await remove_content(content);
          this.refresh_list(category.id);
        }
        break;
      default:
        console.log("soon", op, content);
        break;
    }
  };

  refresh_list = (category_id) => {
    const { content, rendered_width, rendered_height } = this.state;
    const list_component = (
      <lore_styles.ScrollingLoreList
        style={{
          backgroundColor: "white",
          boxShadow: "0.5rem 0.5rem 1rem rgba(0,0,0,0.25)",
        }}
      >
        <LoreContentList
          width_px={rendered_width - CATEGORY_LIST_WIDTH_PX}
          height_px={rendered_height}
          on_select_content={this.on_select_content}
          category_id={category_id}
          on_content_ops={this.on_content_ops}
        />
      </lore_styles.ScrollingLoreList>
    );
    this.setState({ list_component });
  };

  on_select_category = (category) => {
    const { content, rendered_width, rendered_height } = this.state;
    if (content.category_id !== category.id) {
      this.setState({ category, edit_component: [] });
    }
    this.refresh_list(category.id);
  };

  render() {
    const { rendered_width, rendered_height, edit_component, list_component } =
      this.state;
    return [
      <styles.SectionTitle key={"assets-status-title"}>
        {AppText.get(KEY_ASSETS_LORE)}
      </styles.SectionTitle>,
      <styles.BodyWrapper key={"input-form"}>
        <LoreCategoryList
          height_px={rendered_height}
          width_px={CATEGORY_LIST_WIDTH_PX}
          on_select_category={this.on_select_category}
          on_new_item={this.on_new_item}
          content_width_px={rendered_width - CATEGORY_LIST_WIDTH_PX}
        />
        <CoolStyles.InlineBlock>
          <CoolStyles.Block>{list_component}</CoolStyles.Block>
          <styles.OneRemDown />
          <CoolStyles.Block>{edit_component}</CoolStyles.Block>
        </CoolStyles.InlineBlock>
      </styles.BodyWrapper>,
    ];
  }
}

export default AssetsLore;
