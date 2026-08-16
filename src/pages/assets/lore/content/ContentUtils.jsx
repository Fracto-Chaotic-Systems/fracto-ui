import React from "react";
import {
    CELL_ALIGN_LEFT,
    CELL_ALIGN_RIGHT,
    CELL_TYPE_CALLBACK,
    CELL_TYPE_TEXT,
} from "../../../../utils/ui/styles/CoolTableStyles.jsx";
import CoolStyles from "../../../../utils/ui/styles/CoolStyles.jsx";
import {CoolInputText} from "../../../../utils/ui/CoolImports.jsx";
import {copy_json} from "../../../../utils/Dom.jsx";

export const TABLE_EDITOR_COLUMNS = [
    {
        id: "edit_key",
        label: "edit key",
        type: CELL_TYPE_TEXT,
        width_px: 50,
        align: CELL_ALIGN_RIGHT,
        style: {
            textTransform: 'uppercase',
            backgroundColor: '#dddddd',
            paddingRight: '0.5rem',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            verticalAlign: 'top',
            lineHeight: '2rem',
            borderBottom: '2px solid white',
        }
    },
    {
        id: "edit_value",
        label: "edit value",
        type: CELL_TYPE_CALLBACK,
        align: CELL_ALIGN_LEFT,
        width_px: 750,
        style: {
            backgroundColor: 'white',
        }
    },
]

export const LORE_INITIAL_DATA_STATE = {
    key: "-1",
    entry: "",
    source: "",
}

export const LORE_INITIAL_META_STATE = {
    hidden: false,
    published: false,
    modified: `<date not set>`,
    can_store: false,
}

export const TITLE_NOT_SET = 'title-not-set'
export const KEY_NOT_SET = 'key-not-set'
export const ID_NOT_SET = -1

export const empty_content = (category) => {
    return {
        category: category.id,
        category_key: `${category.key_prefix}${KEY_NOT_SET}`,
        content_data: copy_json(LORE_INITIAL_DATA_STATE),
        content_meta: copy_json(LORE_INITIAL_META_STATE),
        id: ID_NOT_SET,
        title: TITLE_NOT_SET,
    }
}

export const on_update_content = (
    content,
    edit_key,
    value,
    update_content) => {
    const modified = new Date();
    content.modified = modified.toISOString();
    content[edit_key] = value
    update_content(content)
}

export const on_update_item_data = (
    content,
    edit_key,
    value,
    update_item_data) => {
    const {content_data} = content
    const modified = new Date();
    content_data.modified = modified.toISOString();
    content_data[edit_key] = value
    update_item_data(content_data)
}

export const on_update_meta_data = (
    meta_data,
    edit_key,
    value,
    update_meta_data) => {
    const modified = new Date();
    meta_data.modified = modified.toISOString();
    meta_data[edit_key] = value
    update_meta_data(meta_data)
}

export const render_entry_text = (data_obj) => {
    const {item_data, on_entry_data_change} = data_obj
    return <CoolStyles.InlineBlock>
        <CoolInputText
            value={item_data.entry}
            placeholder={'use your words'}
            on_change={on_entry_data_change}
            style_extra={{marginLeft: '0.5rem', width: '40rem'}}
            is_text_area={true}
        />
    </CoolStyles.InlineBlock>
}

export const render_source_text = (data_obj) => {
    const {item_data, on_source_change} = data_obj
    return <CoolStyles.InlineBlock style={{lineHeight: "1.75rem"}}>
        <CoolInputText
            value={item_data.source}
            placeholder={'describe the source generally'}
            on_change={on_source_change}
            style_extra={{marginLeft: '0.5rem', width: '40rem'}}
        />
    </CoolStyles.InlineBlock>
}

export const render_link_text = (data_obj) => {
    const {item_data, on_link_change} = data_obj
    return <CoolStyles.InlineBlock style={{lineHeight: "1.75rem"}}>
        <CoolInputText
            value={item_data.link}
            placeholder={'complete url with protocol'}
            on_change={on_link_change}
            style_extra={{marginLeft: '0.5rem', width: '40rem'}}
        />
    </CoolStyles.InlineBlock>
}
