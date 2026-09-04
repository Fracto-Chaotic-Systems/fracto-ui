import {Component} from "react";
import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import AppText from "../../AppText.jsx";
import {KEY_ADMIN_COMMITS_TITLE} from "../../text/AdminText.jsx";
import AdminBackend from "../../backend/AdminBackend.jsx";

export class AdminCommits extends Component {

   state = {commits: [], commits_error: null}

   componentDidMount() {
      AdminBackend.commits()
         .then(result => this.setState({commits: result.commits || []}))
         .catch(commits_error => this.setState({commits_error}))
   }

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
