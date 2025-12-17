import React, {Component} from 'react'
import PropTypes from "prop-types";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import {CoolInputText} from "../../ui/CoolImports.jsx";
import AppSettings, {
   TYPE_BOOLEAN, TYPE_NUMBER,
   TYPE_STRING
} from "../../AppSettings.jsx";
import CoolButton from "../../ui/CoolButton.jsx";
import AppText from "../../AppText.jsx";
import {KEY_FORM_CANCEL} from "../../text/RootText.jsx";

export class InputForm extends Component {
   static propTypes = {
      form_entries: PropTypes.array.isRequired,
      form_meta: PropTypes.object,
   }

   static defaultProps = {
      form_meta: {},
   }

   state = {
      values: {}
   }

   componentDidMount() {
      this.init_values()
   }

   init_values = () => {
      const values = {}
      const {form_entries} = this.props
      form_entries.forEach(entry => {
         const setting_definition = AppSettings.setting_definitions[entry.settings_key];
         const setting_value = AppSettings.get(entry.settings_key);
         if (!setting_value) {
            values[entry.settings_key] = setting_definition.default_value
         } else {
            values[entry.settings_key] = setting_value
         }
      })
      this.setState({values})
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

   cancel_entries = () => {
      this.init_values()
   }

   render() {
      const {values} = this.state
      const {form_entries, form_meta} = this.props
      const all_entries = form_entries.map((entry, i) => {
         const setting_definition = AppSettings.setting_definitions[entry.settings_key];
         let edit_value = false
         console.log('values[entry.settings_key]', values[entry.settings_key])
         switch (setting_definition.data_type) {
            case TYPE_BOOLEAN:
               edit_value = <input
                  type={"checkbox"}
                  value={values[entry.settings_key]}
                  onClick={(e) => this.checkbox_changed(e, entry)}
               />
               break;
            case TYPE_NUMBER:
            case TYPE_STRING:
               edit_value = <CoolInputText
                  value={values[entry.settings_key]}
                  on_change={(e) => this.text_changed(e, entry)}
                  placeholder={AppText.get(entry.prompt_key)}
                  style_extra={{width: `${entry.width_px}px`}}
               />;
               break;
         }
         const label_style = entry.label_width_px ? {width: `${entry.label_width_px}px`} : {}
         return <styles.CenteredBlock
            key={`input-form_entries_${i}`}>
            <styles.InputPrompt style={label_style}>
               {`${AppText.get(entry.label_key)}:`}
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
      const title = form_meta.form_title_key ? <styles.FormTitle>
         {AppText.get(form_meta.form_title_key)}
      </styles.FormTitle> : ''
      const elements = [
         title,
         all_entries,
         <CoolButton
            key={'response-cancel'}
            disabled={false}
            content={AppText.get(KEY_FORM_CANCEL)}
            on_click={this.cancel_entries}
            primary={false}
         />,
         <CoolButton
            key={'response-button'}
            disabled={disabled}
            content={form_meta.default_button_key ? AppText.get(form_meta.default_button_key) : 'ok'}
            on_click={this.set_values}
            primary={true}
         />
      ]
      return <styles.FormWrapper>
         {elements}
      </styles.FormWrapper>

   }
}

export default InputForm
