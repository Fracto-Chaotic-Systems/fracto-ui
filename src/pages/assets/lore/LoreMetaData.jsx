import React from "react";

import {CoolButton, CoolStyles} from "../../../utils/ui/CoolImports.jsx";
import CoolTable from "../../../utils/ui/CoolTable.jsx";
import {
   TABLE_NO_BORDER,
   TABLE_NO_HEADER
} from "../../../utils/ui/styles/CoolTableStyles.jsx";
import {LoreStyles as styles} from './LoreStyles.jsx'
import {TABLE_EDITOR_COLUMNS} from "./content/ContentUtils.jsx";
import DataBackend from "../../../backend/DataBackend.jsx";
import {LORE_INITIAL_META_STATE} from "./LoreUtils.jsx"

const store_content = async (content, on_update_meta, on_store_content) => {
   await DataBackend.lore_storage(content, on_update_meta)
   on_store_content(content)
}

const render_meta_data = (obj_meta) => {
   const {content, on_update_meta, on_store_content} = obj_meta
   const {content_data, content_meta} = content
   const button_style = {
      padding: '0 0.5rem',
      letterSpacing: '0.0625rem',
      fontFamily: 'sans-serif',
   };
   const button_content = content.id < 0
      ? 'create'
      : `update id=${content.id}`
   const blue_button = <CoolButton
      on_click={() => store_content(content, on_update_meta, on_store_content) }
      content={button_content}
      primary={true}
      disabled={!content_meta.can_store}
      style={button_style}
   />
   const all_elements = [
      blue_button,
      content_meta.published ? 'published,' : 'not published,',
      content_meta.hidden ? 'hidden,' : 'not hidden,',
      `modified: ${content_meta.modified}`,
   ].map(element => {
      return <styles.MetaElement>
         {element}
      </styles.MetaElement>
   })
   return <CoolStyles.Block style={{lineHeight: "1.75rem"}}>
      {all_elements}
   </CoolStyles.Block>
}

export const render_meta = (content, on_update_meta, on_store_content) => {
   if (!content.content_meta) {
      content.content_meta = LORE_INITIAL_META_STATE
   }
   const table_data = [
      {
         edit_key: 'meta',
         edit_value: [render_meta_data, {
            content,
            on_update_meta,
            on_store_content,
         }]
      },
   ]
   return <CoolTable
      columns={TABLE_EDITOR_COLUMNS}
      data={table_data}
      options={[TABLE_NO_HEADER, TABLE_NO_BORDER]}
   />
}
