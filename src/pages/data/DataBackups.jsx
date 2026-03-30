import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import {KEY_DATA_CONTENT_BACKUPS} from "../../text/DataText.jsx";
import AppText from "../../AppText.jsx";
import CoolTable from "../../utils/ui/CoolTable.jsx";
import {
   CELL_ALIGN_LEFT,
   CELL_ALIGN_RIGHT,
   CELL_TYPE_TEXT
} from "../../utils/ui/styles/CoolTableStyles.jsx";
import {
   FRACTO_DATA_PORT,
   FRACTO_UI_PORT,
} from "../../../../../constants.js";

const TABLE_COLUMNS = [
   {
      id: "table",
      label: "table",
      type: CELL_TYPE_TEXT,
      width_px: 150,
      align: CELL_ALIGN_RIGHT,
      style: {
         textTransform: 'uppercase',
         backgroundColor: 'white',
         fontSize: '12px',
         fontWeight: 'bold',
         verticalAlign: 'top',
         height: '24px',
      }
   },
   {
      id: "status",
      label: "status",
      type: CELL_TYPE_TEXT,
      width_px: 700,
      align: CELL_ALIGN_LEFT,
      style: {
         backgroundColor: 'white',
      }
   },
]

const TABLE_LIST = [
   'free_bailiwicks',
   'assets',
]

export class DataBackups extends Component {

   state = {
      backup_data: {}
   }

   componentDidMount() {
      TABLE_LIST.forEach((table, i) => {
         setTimeout(() => {
            this.backup_table(table)
         }, i * 5000)
      })
   }

   backup_table = async (table) => {
      const {backup_data} = this.state
      const origin = window.origin.replace(`${FRACTO_UI_PORT}`, `${FRACTO_DATA_PORT}`)
      const url = `${origin}/backup?table=${table}`
      try {
         const response = await fetch(url)
         const result = await response.json()
         backup_data[table] = result//.split('\n')
         // this.setState({backup_data})
         console.log('backup_data', backup_data)
      } catch (error) {
         console.log(error.message)
      }
   }

   render() {
      const {backup_data} = this.state
      const table_data = TABLE_LIST.map((item) => {
         if (!backup_data[item]) {
            return {
               table: <styles.TablePrompt>{item}</styles.TablePrompt>,
               status: <styles.ConsoleWrapper>waiting...</styles.ConsoleWrapper>
            }
         }
         const data_lines = backup_data[item].map((line, i) => {
            return <styles.ConsoleLine key={`line-${i}`}>{line}</styles.ConsoleLine>
         })
         return {
            table: item,
            status: <styles.ConsoleWrapper>{data_lines}</styles.ConsoleWrapper>
         }
      })
      return [
         <styles.SectionTitle
            key={'data-overview-title'}>
            {AppText.get(KEY_DATA_CONTENT_BACKUPS)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            <styles.CenteredBlock>
               <styles.TableWrapper>
                  <CoolTable
                     columns={TABLE_COLUMNS}
                     data={table_data}
                  />
               </styles.TableWrapper>
            </styles.CenteredBlock>
         </styles.CenteredBlock>,
      ];
   }
}

export default DataBackups
