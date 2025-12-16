import React, {Component} from 'react'
import PropTypes from "prop-types";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import {CoolInputText} from "../../ui/CoolImports.jsx";
import AppSettings, {
   TYPE_BOOLEAN,
   TYPE_STRING
} from "../../AppSettings.jsx";
import CoolButton from "../../ui/CoolButton.jsx";

export class InputForm extends Component {
   static propTypes = {
      form_entries: PropTypes.array.isRequired,
   }

   state = {
      values: {}
   }

   text_changed = (value, entry) => {
      const {values} = this.state
      if (!value.length) {
         delete values[entry.settings_key]
      } else {
         values[entry.settings_key] = value
      }
      this.setState({values})
   }

   checkbox_changed = (e, entry) => {
      const {values} = this.state
      values[entry.settings_key] = !!e.target.checked
      this.setState({values})
   }

   set_values = () => {
      const {values} = this.state
      const value_keys = Object.keys(values)
      value_keys.forEach(key => {
         AppSettings.on_settings_changed({
            [key]: values[key]
         })
      })
   }

   render() {
      const {values} = this.state
      const {form_entries} = this.props
      const all_entries = form_entries.map((entry, i) => {
         const setting_definition = AppSettings.setting_definitions[entry.settings_key];
         let edit_value = false
         switch (setting_definition.data_type) {
            case TYPE_BOOLEAN:
               edit_value = <input type={"checkbox"} onClick={(e) => this.checkbox_changed(e, entry)}/>
               break;
            case TYPE_STRING:
               edit_value = <CoolInputText
                  value={values[entry.settings_key]}
                  on_change={(e) => this.text_changed(e, entry)}
                  placeholder={entry.prompt}
                  style_extra={{width: `${entry.width_px}px`}}
               />;
               break;
         }
         const label_style = entry.label_width_px ? {width: `${entry.label_width_px}px`} : {}
         return <styles.CenteredBlock
            key={`input-form_entries_${i}`}>
            <styles.InputPrompt style={label_style}>
               {`${entry.label}:`}
            </styles.InputPrompt>
            {edit_value}
         </styles.CenteredBlock>
      })
      let disabled = false
      const value_keys = Object.keys(values)
      form_entries.forEach(entry => {
         if (entry.required && value_keys.includes(entry.settings_key)) {
            return
         }
         disabled = true
      })
      return [
         all_entries,
         <CoolButton
            disabled={disabled}
            content={'ok'}
            on_click={this.set_values}
            primary={true}
         />
      ]
   }
}

export default InputForm
