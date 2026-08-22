import React from "react";

import {LoreStyles as styles} from './LoreStyles.jsx'
import {
   CoolInputText,
   CoolStyles
} from "../../../utils/ui/CoolImports.jsx";
import CoolTable from "../../../utils/ui/CoolTable.jsx";
import {
   TABLE_NO_BORDER,
   TABLE_NO_HEADER
} from "../../../utils/ui/styles/CoolTableStyles.jsx";
import {
   on_update_content,
   TABLE_EDITOR_COLUMNS
} from "./content/ContentUtils.jsx";

const render_edit_key = (key_data) => {
   const {edit_key, key_prefix, content, update_content} = key_data
   return [
      <styles.KeyPrefix key={`${key_prefix}-prompt`}>
         {`${key_prefix}`}
      </styles.KeyPrefix>,
      <CoolInputText
         value={edit_key}
         placeholder={'will auto-fill on store'}
         key={`${key_prefix}-${edit_key}-${content.id}`}
         style_extra={{width: '10rem'}}
         on_change={value => on_update_content(
            content, 'category_key', value, update_content
         )}
      />
   ]
}

const render_title = (title_data) => {
   const {content, update_content} = title_data
   return <CoolStyles.Block style={{lineHeight: "1.75rem"}}>
      <CoolInputText
         value={content.title}
         placeholder={'memorable and unique'}
         style_extra={{marginLeft: '0.5rem', width: '40rem'}}
         key={`item_id-input-${content.id}`}
         on_change={value => on_update_content(
            content, 'title', value, update_content
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

export const render_preamble = (content, category, update_content) => {
   const table_data = [
      {
         edit_key: 'type',
         edit_value: [render_type, category],
      },
      {
         edit_key: 'key',
         edit_value: [render_edit_key, {
            edit_key: content.category_key,
            key_prefix: category.key_prefix,
            content,
            update_content,
         }]
      },
      {
         edit_key: 'title',
         edit_value: [render_title, {
            content,
            update_content
         }],
      }
   ]
   return <CoolTable
      columns={TABLE_EDITOR_COLUMNS}
      data={table_data}
      options={[TABLE_NO_HEADER, TABLE_NO_BORDER]}
   />
}
