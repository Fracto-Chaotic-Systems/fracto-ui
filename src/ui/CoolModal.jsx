import React, {Component} from 'react';
import PropTypes from 'prop-types';

import {CoolModalStyles as styles} from './styles/CoolModalStyles';

export class CoolModal extends Component {

   static propTypes = {
      contents: PropTypes.element.isRequired,
      response: PropTypes.func,
      width: PropTypes.string,
      settings: PropTypes.object,
      title_text: PropTypes.string,
   }

   static defaultProps = {
      width: "40%",
      settings: {},
      title_text: null,
   }

   state = {
      modal_ref: React.createRef()
   }

   key_handler = (key) => {
      const {response, settings} = this.props;
      if (key.code === "KeyC" && key.ctrlKey && response) {
         response(0);
      }
      if (settings["no_escape"]) {
         return;
      }
      if (key.code === "Escape" && response) {
         response(0);
      }
   }

   click_handler = (evt) => {
      const {modal_ref} = this.state;
      const {response, settings} = this.props;
      if (settings["no_escape"]) {
         return;
      }
      if (!modal_ref.current) {
         return;
      }
      if (!evt.clientX && !evt.clientY) {
         return;
      }
      const bounds = modal_ref.current.getBoundingClientRect();
      if (evt.clientX < bounds.left ||
         evt.clientX > bounds.right ||
         evt.clientY < bounds.top ||
         evt.clientY > bounds.bottom) {
         response(0);
      }
   }

   componentDidMount() {
      // setTimeout(() => {
      //    document.addEventListener('keydown', this.key_handler);
      //    document.addEventListener('click', this.click_handler);
      // }, 100);
   }

   componentWillUnmount() {
      document.removeEventListener("keydown", this.key_handler);
      document.removeEventListener("click", this.click_handler);
   }

   render_title = (title_text) => {
      const {response} = this.props
      const close_button = <styles.CloseButton
         onClick={e => response(0)}>
         {'X'}
      </styles.CloseButton>
      return <styles.ModalTitle>
         {title_text}
         {close_button}
      </styles.ModalTitle>
   }

   render() {
      const {modal_ref} = this.state;
      const {width, title_text} = this.props;
      const style_extra = {width: width};
      const title = title_text ? this.render_title(title_text) : [];
      return <styles.FormField>
         <styles.FormContainer style={style_extra} ref={modal_ref}>
            {title}
            <styles.FormContent>
               {this.props.contents}
            </styles.FormContent>
         </styles.FormContainer>
      </styles.FormField>
   }
}

export default CoolModal;