import {Component} from "react";
import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import AppText from "../../AppText.jsx";
import {KEY_ADMIN_COMMITS_TITLE} from "../../text/AdminText.jsx";

export class AdminCommits extends Component {

   render() {
      return <>
         <styles.SectionTitle
            key={'admin-commits-title'}>
            {AppText.get(KEY_ADMIN_COMMITS_TITLE)}
         </styles.SectionTitle>
      </>
   }
}

export default AdminCommits
