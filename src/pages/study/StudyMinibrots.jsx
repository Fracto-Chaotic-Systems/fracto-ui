import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import {KEY_STUDY_MINIBROTS} from "../../text/StudyText.jsx";
import AppText from "../../AppText.jsx";
import {FRACTO_DATA_PORT, FRACTO_UI_PORT} from "../../../../../constants.js";

const FETCH_JSON_HEADERS = {
   'Content-Type': 'application/json',
   'Accept': 'application/json'
}

export class StudyMinibrots extends Component {
   state = {
      minibrot_list: [],
   }

   componentDidMount() {
      this.load_minibrots()
   }

   load_minibrots = async () => {
      const origin = window.origin.replace(`${FRACTO_UI_PORT}`, `${FRACTO_DATA_PORT}`)
      const url = `${origin}/minibrots`
      console.log('url', url)
      const minibrot_list = await fetch(url, FETCH_JSON_HEADERS)
         .then(res => {
            console.log('load_minibrots', res)
            return res.json()
         })
      console.log('minibrot_list', minibrot_list)
      this.setState({minibrot_list})
   }

   render() {
      return [
         <styles.SectionTitle
            key={'study-minibrots-title'}>
            {AppText.get(KEY_STUDY_MINIBROTS)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            StudyMinibrots content
         </styles.CenteredBlock>,
      ];
   }
}

export default StudyMinibrots
