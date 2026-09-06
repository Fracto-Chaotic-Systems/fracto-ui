import AssetsBackend from "../../../backend/AssetsBackend.jsx";
import DataBackend from "../../../backend/DataBackend.jsx";
import { copy_json } from "../../../utils/Dom.jsx";
import CoolStyles from "../../../utils/ui/styles/CoolStyles.jsx";

import ContentDefinition from "./content/ContentDefinition.jsx";
import ContentSubject from "./content/ContentSubject.jsx";
import ContentStudy from "./content/ContentStudy.jsx";
import ContentTaxonomy from "./content/ContentTaxonomy.jsx";
import ContentDerivation from "./content/ContentDerivation.jsx";
import ContentOperation from "./content/ContentOperation.jsx";
import ContentDialog from "./content/ContentDialog.jsx";
import ContentThesis from "./content/ContentThesis.jsx";
import ContentArticle from "./content/ContentArticle.jsx";
import ContentReference from "./content/ContentReference.jsx";
import ContentDiagram from "./content/ContentDiagram.jsx";
import ContentImage from "./content/ContentImage.jsx";
import ContentVideo from "./content/ContentVideo.jsx";
import ContentStyle from "./content/ContentStyle.jsx";
import { Component } from "react";
import PropTypes from "prop-types";
import { ID_NOT_SET } from "./content/ContentUtils.jsx";

export const LORE_CATEGORY_DEFINITION = 1;
export const LORE_CATEGORY_SUBJECT = 2;
export const LORE_CATEGORY_STUDY = 3;
export const LORE_CATEGORY_TAXONOMY = 4;
export const LORE_CATEGORY_DERIVATION = 5;
export const LORE_CATEGORY_OPERATION = 6;
export const LORE_CATEGORY_DIALOG = 7;
export const LORE_CATEGORY_THESIS = 8;
export const LORE_CATEGORY_ARTICLE = 9;
export const LORE_CATEGORY_REFERENCE = 10;
export const LORE_CATEGORY_DIAGRAM = 11;
export const LORE_CATEGORY_IMAGE = 12;
export const LORE_CATEGORY_VIDEO = 13;
export const LORE_CATEGORY_STYLE = 14;

export const EMPTY_STYLE = {
  key: "margin",
  value: "auto",
};

export const LORE_INITIAL_META_STATE = {
  hidden: false,
  published: false,
  modified: `<date not set>`,
  can_store: false,
};

export const DEFAULT_CONTENT = {
  id: ID_NOT_SET,
  content_data: {
    style_list: [EMPTY_STYLE],
  },
  content_meta: LORE_INITIAL_META_STATE,
};

const op_lore_component = (
  item_id,
  category,
  width_px,
  height_px,
  on_update,
) => {
  switch (category.id) {
    case LORE_CATEGORY_DEFINITION:
      return (
        <ContentDefinition
          item_id={item_id}
          category={category}
          width_px={width_px}
          height_px={height_px}
          on_update={on_update}
        />
      );
    case LORE_CATEGORY_SUBJECT:
      return (
        <ContentSubject
          item_id={item_id}
          category={category}
          width_px={width_px}
          height_px={height_px}
        />
      );
    case LORE_CATEGORY_STUDY:
      return (
        <ContentStudy
          item_id={item_id}
          category={category}
          width_px={width_px}
          height_px={height_px}
        />
      );
    case LORE_CATEGORY_TAXONOMY:
      return (
        <ContentTaxonomy
          item_id={item_id}
          category={category}
          width_px={width_px}
          height_px={height_px}
        />
      );
    case LORE_CATEGORY_DERIVATION:
      return (
        <ContentDerivation
          item_id={item_id}
          category={category}
          width_px={width_px}
          height_px={height_px}
        />
      );
    case LORE_CATEGORY_OPERATION:
      return (
        <ContentOperation
          item_id={item_id}
          category={category}
          width_px={width_px}
          height_px={height_px}
        />
      );
    case LORE_CATEGORY_DIALOG:
      return (
        <ContentDialog
          item_id={item_id}
          category={category}
          width_px={width_px}
          height_px={height_px}
        />
      );
    case LORE_CATEGORY_THESIS:
      return (
        <ContentThesis
          item_id={item_id}
          category={category}
          width_px={width_px}
          height_px={height_px}
        />
      );
    case LORE_CATEGORY_ARTICLE:
      return (
        <ContentArticle
          item_id={item_id}
          category={category}
          width_px={width_px}
          height_px={height_px}
        />
      );
    case LORE_CATEGORY_REFERENCE:
      return (
        <ContentReference
          item_id={item_id}
          category={category}
          width_px={width_px}
          height_px={height_px}
        />
      );
    case LORE_CATEGORY_DIAGRAM:
      return (
        <ContentDiagram
          item_id={item_id}
          category={category}
          width_px={width_px}
          height_px={height_px}
        />
      );
    case LORE_CATEGORY_IMAGE:
      return (
        <ContentImage
          item_id={item_id}
          category={category}
          width_px={width_px}
          height_px={height_px}
        />
      );
    case LORE_CATEGORY_VIDEO:
      return (
        <ContentVideo
          item_id={item_id}
          category={category}
          width_px={width_px}
          height_px={height_px}
        />
      );
    case LORE_CATEGORY_STYLE:
      return (
        <ContentStyle
          item_id={item_id}
          category={category}
          width_px={width_px}
          height_px={height_px}
        />
      );
    default:
      return `unknown category ${category.id}`;
  }
};

export const new_lore_component = (
  category,
  width_px,
  height_px,
  on_update,
) => {
  return op_lore_component(-1, category, width_px, height_px, on_update);
};

export const edit_lore_component = async (
  content,
  width_px,
  height_px,
  on_update,
) => {
  const category = await get_category(content.category);
  const component = op_lore_component(
    content.id,
    category,
    width_px,
    height_px,
    on_update,
  );
  const wrapper_style = {
    boxShadow: "0.5rem 0.5rem 1rem rgba(0, 0, 0, 0.25)",
    backgroundColor: "white",
  };
  return (
    <CoolStyles.InlineBlock style={wrapper_style}>
      {component}
    </CoolStyles.InlineBlock>
  );
};

export const remove_content = async (content) => {
  content.content_meta.hidden = true;
  await DataBackend.lore_storage(content);
};

let ALL_CATEGORIES = null;

export const get_categories = async () => {
  if (ALL_CATEGORIES) {
    return ALL_CATEGORIES;
  }
  const unsorted = await AssetsBackend.lore_categories();
  if (!unsorted) {
    console.log("get_categories fails");
    return;
  }
  const category_list = unsorted.sort((a, b) => (a.id > b.id ? 1 : -1));
  ALL_CATEGORIES = copy_json(category_list);
  return ALL_CATEGORIES;
};

export const get_category = async (category_id) => {
  if (!ALL_CATEGORIES) {
    await get_categories();
  }
  return ALL_CATEGORIES.find((cat) => cat.id === category_id);
};

export const update_content = (new_content, old_content) => {
  const { content_meta } = old_content;
  content_meta.can_store = true;
  const modified = new Date();
  content_meta.modified = modified.toISOString();
  old_content.title = new_content.title;
  old_content.key = new_content.key;
  return old_content;
};
