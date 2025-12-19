import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import {KEY_ADMIN_SETTINGS} from "../../text/AdminText.jsx";
import AppText from "../../AppText.jsx";
import AppSettings, {TYPE_OBJECT} from "../../AppSettings.jsx";

const REFRESH_INTERVAL_MS = 3000

export class AdminSettings extends Component {
   state = {
      interval: null,
      setting_data: []
   }

   componentDidMount() {
      const interval = setInterval(() => {
         const settings_keys = Object.keys(AppSettings.settings_data)
         const setting_data = settings_keys
            .sort()
            .map((key, i) => {
               const setting_definition = AppSettings.setting_definitions[key]
               let data_value = AppSettings.settings_data[key]
               if (setting_definition.data_type === TYPE_OBJECT) {
                  data_value = JSON.stringify(data_value)
               }
               return {key, data_value}
            })
         this.setState({setting_data})
      }, REFRESH_INTERVAL_MS)
      this.setState({interval})
   }

   componentWillUnmount() {
      const {interval} = this.state
      if (interval) {
         clearInterval(interval)
      }
   }

   render_settings = () => {
      const {setting_data} = this.state
      return setting_data.map((setting, i) => {
         return <styles.CenteredBlock
            key={`setting-${i}`}>
            {setting.key}: {setting.data_value}
         </styles.CenteredBlock>
      })
   }

   render() {
      const settings = this.render_settings()
      return [
         <styles.SectionTitle
            key={'admin-settings-title'}>
            {AppText.get(KEY_ADMIN_SETTINGS)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            {settings}
         </styles.CenteredBlock>,
      ];
   }
}

export default AdminSettings
