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

const render_meta_data = (obj_meta) => {
   const {meta_data, item_data, category, on_update_meta} = obj_meta
   const button_style = {
      padding: '0 0.5rem',
      letterSpacing: '0.0625rem',
      fontFamily: 'sans-serif',
   };
   const blue_button = <CoolButton
      on_click={() => DataBackend.lore_storage(
         meta_data, item_data, category, on_update_meta)}
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
