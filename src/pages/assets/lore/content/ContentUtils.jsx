import {
   CELL_ALIGN_LEFT,
   CELL_ALIGN_RIGHT,
   CELL_TYPE_CALLBACK,
   CELL_TYPE_TEXT, TABLE_NO_BORDER, TABLE_NO_HEADER
} from "../../../../utils/ui/styles/CoolTableStyles.jsx";
import CoolTable from "../../../../utils/ui/CoolTable.jsx";
import React from "react";
import {CoolInputText, CoolStyles} from "../../../../utils/ui/CoolImports.jsx";
import {LoreStyles as styles} from '../LoreStyles.jsx'

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

export const LORE_INITIAL_STATE = {
   item_data: {
      edit_key: "-1",
      title: "use your words",
   },
   meta_data: {
      hidden: false,
      published: true,
      modified: `<date not set>`
   }
}

const render_edit_key = (key_data) => {
   const {edit_key, key_prefix, on_update_data} = key_data
   return [
      <styles.KeyPrefix key={`${key_prefix}-prompt`}>
         {`${key_prefix}`}
      </styles.KeyPrefix>,
      <CoolInputText
         value={edit_key}
         key={`${key_prefix}-${edit_key}`}
         style_extra={{width: '10rem'}}
         on_change={value => on_update_data({edit_key: value})}
      />
   ]
}

const render_title = (title_data) => {
   const {title, on_update_data} = title_data
   return <CoolStyles.Block style={{lineHeight: "1.75rem"}}>
      <CoolInputText
         value={title}
         style_extra={{marginLeft: '0.5rem', width: '40rem'}}
         key={`item_id-input`}
         on_change={value => on_update_data({title: value})}
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

export const render_preamble = (item_data, category, on_update_data) => {
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
            on_update_data,
         }]
      },
      {
         edit_key: 'title',
         edit_value: [render_title, {
            title: item_data.title,
            on_update_data
         }],
      }
   ]
   return <CoolTable
      columns={TABLE_EDITOR_COLUMNS}
      data={table_data}
      options={[TABLE_NO_HEADER, TABLE_NO_BORDER]}
   />
}

const render_meta_data = (obj_meta) =>{
   const {meta_data, on_update_meta} = obj_meta
   return <CoolStyles.Block style={{lineHeight: "1.75rem"}}>
      <styles.MetaElement>
         {meta_data.published ? 'published' : 'not published'},
      </styles.MetaElement>
      <styles.MetaElement>
         {meta_data.hidden ? 'hidden' : 'not hidden'},
      </styles.MetaElement>
      <styles.MetaElement>
         {meta_data.modified},
      </styles.MetaElement>
   </CoolStyles.Block>
}

export const render_meta = (meta_data, on_update_meta) => {
   const table_data = [
      {
         edit_key: 'meta',
         edit_value: [render_meta_data, {meta_data, on_update_meta}]
      },
   ]
   return <CoolTable
      columns={TABLE_EDITOR_COLUMNS}
      data={table_data}
      options={[TABLE_NO_HEADER, TABLE_NO_BORDER]}
   />
}

