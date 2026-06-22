import React from "react";

import {
   CELL_ALIGN_LEFT,
   CELL_ALIGN_RIGHT,
   CELL_TYPE_CALLBACK,
   CELL_TYPE_TEXT,
   TABLE_NO_BORDER,
   TABLE_NO_HEADER
} from "../../../../utils/ui/styles/CoolTableStyles.jsx";
import CoolTable from "../../../../utils/ui/CoolTable.jsx";
import {CoolInputText, CoolStyles} from "../../../../utils/ui/CoolImports.jsx";
import {LoreStyles as styles} from '../LoreStyles.jsx'
import CoolButton from "../../../../utils/ui/CoolButton.jsx";

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
}
export const LORE_INITIAL_META_STATE = {
   hidden: false,
   published: false,
   modified: `<date not set>`,
   can_store: false,
}

const on_update_item_data = (
   item_data,
   edit_key,
   value,
   update_item_data) => {
   const modified = new Date();
   item_data.modified = modified.toISOString();
   item_data[edit_key] = value
   update_item_data(item_data)
}

const on_update_meta_data = (
   meta_data,
   edit_key,
   value,
   update_meta_data) => {
   const modified = new Date();
   meta_data.modified = modified.toISOString();
   meta_data[edit_key] = value
   update_meta_data(meta_data)
}

const render_edit_key = (key_data) => {
   const {
      edit_key,
      key_prefix,
      item_data,
      update_item_data
   } = key_data
   return [
      <styles.KeyPrefix key={`${key_prefix}-prompt`}>
         {`${key_prefix}`}
      </styles.KeyPrefix>,
      <CoolInputText
         value={edit_key}
         key={`${key_prefix}-${edit_key}`}
         style_extra={{width: '10rem'}}
         on_change={value => on_update_item_data(
            item_data, 'key', value, update_item_data
         )}
      />
   ]
}

const render_title = (title_data) => {
   const {title, item_data, update_item_data} = title_data
   return <CoolStyles.Block style={{lineHeight: "1.75rem"}}>
      <CoolInputText
         value={title}
         placeholder={'use your words'}
         style_extra={{marginLeft: '0.5rem', width: '40rem'}}
         key={`item_id-input`}
         on_change={value => on_update_item_data(
            item_data, 'title', value, update_item_data
         )}
      />
   </CoolStyles.Block>
}

const render_type = (category) => {
   const {category_name, description} = category
   return <CoolStyles.Block style={{lineHeight: "1.75rem"}}>
      <styles.LoreTypeText>{category_name}</styles.LoreTypeText>
      <styles.LoreTypeDescription>({description})</styles.LoreTypeDescription>
   </CoolStyles.Block>
}

export const render_preamble = (item_data, category, update_item_data) => {
   const table_data = [
      {
         edit_key: 'type',
         edit_value: [render_type, category],
      },
      {
         edit_key: 'key',
         edit_value: [render_edit_key, {
            edit_key: item_data.edit_key,
            key_prefix: category.key_prefix,
            item_data,
            update_item_data,
         }]
      },
      {
         edit_key: 'title',
         edit_value: [render_title, {
            title: item_data.title,
            item_data,
            update_item_data
         }],
      }
   ]
   return <CoolTable
      columns={TABLE_EDITOR_COLUMNS}
      data={table_data}
      options={[TABLE_NO_HEADER, TABLE_NO_BORDER]}
   />
}

const render_meta_data = (obj_meta) => {
   const {meta_data, item_data, category, on_update_meta} = obj_meta
   const button_style = {
      padding: '0 0.5rem',
      letterSpacing: '0.0625rem',
      fontFamily: 'sans-serif',
   };
   const blue_button = <CoolButton
      on_click={on_update_meta}
      content={'store'}
      primary={true}
      disabled={!meta_data.can_store}
      style={button_style}
   />
   const all_elements = [
      blue_button,
      meta_data.published ? 'published,' : 'not published,',
      meta_data.hidden ? 'hidden,' : 'not hidden,',
      `modified: ${meta_data.modified}`,
   ].map(item_data => {
      return <styles.MetaElement>
         {item_data}
      </styles.MetaElement>
   })
   return <CoolStyles.Block style={{lineHeight: "1.75rem"}}>
      {all_elements}
   </CoolStyles.Block>
}

export const render_meta = (meta_data, item_data, category, on_update_meta) => {
   const table_data = [
      {
         edit_key: 'meta',
         edit_value: [render_meta_data, {
            meta_data,
            item_data,
            category,
            on_update_meta
         }]
      },
   ]
   return <CoolTable
      columns={TABLE_EDITOR_COLUMNS}
      data={table_data}
      options={[TABLE_NO_HEADER, TABLE_NO_BORDER]}
   />
}

