import React, {Component} from 'react';
import styled from "styled-components";
import PropTypes from 'prop-types';

import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCaretRight} from '@fortawesome/free-solid-svg-icons';

import {CoolStyles} from "./CoolImports";

const ITEM_COLOR = "#888888";
const ITEM_HILIGHT_COLOR = "#333333";

const DropdownContainer = styled.div`    
    ${CoolStyles.fixed}
    min-width: 4rem;
    overflow: auto;
    z-index: 100;
    border: 0.15rem solid #aaaaaa;
    box-shadow: 0.5rem 0.5rem 1rem rgba(0,0,0,20%);
    border-radius: 0.25rem;
    margin-left: 0.25rem;
    background-color: #f8f8f8;
`;

const DropdownElement = styled.div`
    ${CoolStyles.pointer}
    padding: 0.125rem 0.5rem;
    font-size: 0.85rem;
    color: ${ITEM_COLOR};
    &: hover {
        color: ${ITEM_HILIGHT_COLOR};
        font-weight: bold;
        background-color: #dddddd; 
    }
`;

const DropdownLabel = styled(CoolStyles.InlineBlock)`
    padding: 0.1rem 0.25rem;
    border-radius: 0.25rem;
`;

const DropdownSeparator = styled.div`
    border: 0.1rem solid #bbbbbb;
`;

const SubMenuCaret = styled(FontAwesomeIcon)`
    float: right;
    padding-left: 0.5rem
`;

export class CoolDropdown extends Component {

   static propTypes = {
      items: PropTypes.array.isRequired,
      reference_rect: PropTypes.object.isRequired,
      callback: PropTypes.func.isRequired,
   }

   state = {
      dropdown_ref: React.createRef(),
      submenu_popup: []
   }

   key_handler = (key) => {
      const {callback} = this.props;
      if (key.code === "Escape") {
         callback(0);
      }
   }

   click_handler = (evt) => {
      const {dropdown_ref} = this.state;
      const {callback} = this.props;
      if (!dropdown_ref.current) {
         document.removeEventListener("click", this.click_handler);
         return;
      }
      const bounds = dropdown_ref.current.getBoundingClientRect();
      if (evt.clientX < bounds.left ||
         evt.clientX > bounds.right ||
         evt.clientY < bounds.top ||
         evt.clientY > bounds.bottom) {
         callback(0);
      }
   }

   componentDidMount() {
      setTimeout(() => {
         document.addEventListener('keydown', this.key_handler);
         document.addEventListener('click', this.click_handler);
      }, 100);
   }

   componentWillUnmount() {
      document.removeEventListener("keydown", this.key_handler);
      document.removeEventListener("click", this.click_handler);
   }

   submenu_popup = (submenu, caret_ref) => {
      const {callback} = this.props;
      const caret = caret_ref.current;
      if (!caret) {
         return [];
      }
      let caret_bounds = caret.getBoundingClientRect();
      const submenu_popup = <CoolDropdown
         items={submenu}
         reference_rect={{top: caret_bounds.top, left: caret_bounds.right - 10}}
         callback={selected => callback(selected)}
      />
      this.setState({submenu_popup: submenu_popup});
   }

   render() {
      const {dropdown_ref, submenu_popup} = this.state;
      const {items, callback, reference_rect} = this.props;
      const all_items = items.map((item, index) => {
         const key = `dropdown_${index}`;
         const caret_ref = React.createRef();
         const submenu_arrow = !item.submenu ? '' : <SubMenuCaret
            icon={faCaretRight}
            onMouseOver={e => this.submenu_popup(item.submenu, caret_ref)}
         />
         return (item['type'] === 'separator') ? <DropdownSeparator key={key}/> :
            <DropdownElement
               key={key} ref={caret_ref}
               onMouseOver={e => {
                  if (!item.submenu) {
                     this.setState({submenu_popup: []})
                  }
               }}
               onClick={e => {
                  if (!item.submenu) {
                     callback(item.code);
                  } else {
                     this.submenu_popup(item.submenu, caret_ref);
                  }
               }}>
               <DropdownLabel>{item.label}</DropdownLabel>
               {submenu_arrow}
            </DropdownElement>
      });
      const containter_style = {
         top: reference_rect.top,
         left: reference_rect.left,
      }
      return <DropdownContainer style={containter_style} ref={dropdown_ref}>
         {all_items}
         {submenu_popup}
      </DropdownContainer>
   }
}

export default CoolDropdown;
