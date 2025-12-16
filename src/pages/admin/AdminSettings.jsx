import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'

export class AdminSettings extends Component {
   render() {
      return [
         <styles.SectionTitle
            key={'identiy-title'}>
            admin settings
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            content
         </styles.CenteredBlock>,
      ];
   }
}

export default AdminSettings
