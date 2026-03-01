import {Component} from "react";

import {
   ALL_SERVICES,
   FRACTO_ADMIN_PORT
} from "../../../../../constants.js";
import CoolTable from "../../utils/ui/CoolTable.jsx";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import {
   CELL_ALIGN_LEFT,
   CELL_ALIGN_RIGHT,
   CELL_TYPE_TEXT,
} from "../../utils/ui/styles/CoolTableStyles.jsx"
import AppText from "../../AppText.jsx";
import {KEY_ADMIN_VERSIONS_TITLE} from "../../text/AdminText.jsx";

const TABLE_COLUMNS = [
   {
      id: "service",
      label: "service:",
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

export class AdminVersions extends Component {

   state = {
      version_data: {}
   }

   componentDidMount() {
      ALL_SERVICES.forEach((service, i) => {
         setTimeout(() => {
            this.load_version(service.name)
         }, i * 3000)
      })
   }

   load_version = async (service_name) => {
      const {version_data} = this.state
      const url = `http://localhost:${FRACTO_ADMIN_PORT}/version?service_name=${service_name}`
      const response = await fetch(url)
      const result = await response.json()
      version_data[service_name] = result[service_name].split('\n')
      this.setState({version_data})
   }

   render() {
      const {version_data} = this.state
      console.log('version_data', version_data)
      const versions_data = ALL_SERVICES.map((s, i) => {
         if (!Array.isArray(version_data[s.name])) {
            return {service: `${s.name}`, status: '',}
         }
         const status_data = version_data[s.name].map((line, i) => {
            return <styles.ConsoleLine key={`line-${i}`}>{line}</styles.ConsoleLine>
         })
         return {
            service: `${s.name}`,
            status: <styles.ConsoleWrapper>{status_data}</styles.ConsoleWrapper>
         }
      })
      const table_style = {
         backgroundColor: 'white',
      }
      return [
         <styles.SectionTitle
            key={'admin-status-title'}>
            {AppText.get(KEY_ADMIN_VERSIONS_TITLE)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            <styles.CenteredBlock>
               <styles.TableWrapper>
                  <CoolTable
                     columns={TABLE_COLUMNS}
                     data={versions_data}
                  />
               </styles.TableWrapper>
            </styles.CenteredBlock>
         </styles.CenteredBlock>,
      ];
   }
}

export default AdminVersions
