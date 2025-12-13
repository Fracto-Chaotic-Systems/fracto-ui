import React, {Component} from 'react';
import PropTypes from 'prop-types';

import {CoolStyles} from "./CoolImports";

export class CoolInputText extends Component {

   static propTypes = {
      value: PropTypes.string,
      style_extra: PropTypes.object,
      placeholder: PropTypes.string,
      callback: PropTypes.func,
      is_text_area: PropTypes.bool,
      on_change: PropTypes.func
   }

   static defaultProps = {
      value: '',
      style_extra: {},
      callback: null,
      placeholder: '',
      is_text_area: false
   }

   state = {
      current_value: this.props.value,
      input_ref: React.createRef()
   };

   componentDidMount() {
      const {input_ref} = this.state;
      const {value, callback} = this.props;
      const key_handler = (key) => {
         if (key.code === "Escape") {
            document.removeEventListener("keydown", key_handler);
            if (callback) {
               callback(value);
            }
         }
         if (key.code === "Enter" || key.code === "NumpadEnter") {
            document.removeEventListener("keydown", key_handler);
            if (input_ref.current) {
               if (callback) {
                  callback(input_ref.current.value);
               }
            }
         }
      }
      document.addEventListener("keydown", key_handler);
   }

   on_change = (value) => {
      const {on_change} = this.props;
      this.setState({current_value: value})
      if (on_change) {
         on_change(value)
      }
   }

   render() {
      const {input_ref, current_value} = this.state;
      const {placeholder, style_extra, is_text_area, callback} = this.props;
      return is_text_area ?
         <CoolStyles.InputTextArea
            ref={input_ref}
            autoFocus
            size={current_value.length}
            style={style_extra}
            value={current_value}
            rows={5}
            cols={40}
            onChange={e => this.on_change(e.target.value)}
            placeholder={placeholder}/> :
         <CoolStyles.InputText
            ref={input_ref}
            autoFocus
            size={current_value.length}
            style={style_extra}
            value={current_value}
            onChange={e => this.on_change(e.target.value)}
            onBlur={e => {
               if (callback) {
                  callback(input_ref.current.value)
               }
            }}
            placeholder={placeholder}/>
   }
}

export default CoolInputText;
