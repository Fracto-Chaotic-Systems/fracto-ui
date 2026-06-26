import React from "react";
import {
   CELL_ALIGN_LEFT,
   CELL_ALIGN_RIGHT,
   CELL_TYPE_CALLBACK,
   CELL_TYPE_TEXT,
} from "../../../../utils/ui/styles/CoolTableStyles.jsx";
import CoolStyles from "../../../../utils/ui/styles/CoolStyles.jsx";
import {CoolInputText} from "../../../../utils/ui/CoolImports.jsx";

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
   title: "",
   entry: "",
   source: "",
}
export const LORE_INITIAL_META_STATE = {
   hidden: false,
   published: false,
   modified: `<date not set>`,
   can_store: false,
}

export const on_update_item_data = (
   item_data,
   edit_key,
   value,
   update_item_data) => {
   const modified = new Date();
   item_data.modified = modified.toISOString();
   item_data[edit_key] = value
   update_item_data(item_data)
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
