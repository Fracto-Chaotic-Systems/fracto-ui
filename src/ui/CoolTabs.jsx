import React, {Component} from 'react';
import PropTypes from 'prop-types';
import styled from "styled-components";

import {CoolStyles} from "./CoolImports";

const TabsWrapper = styled(CoolStyles.Block)`
    ${CoolStyles.noselect}
    margin: 0;
    background-color: rgba(0, 0, 0, 0);
`;

const CardWrapper = styled(CoolStyles.Block)`
    border: 0.15rem solid #aaaaaa;
    border-radius: 0 0.25rem 0.25rem 0.25rem;
    min-height: 12.25rem;
    min-width: 20rem;
    //margin-top: -2px;
    z-index: 100;
`;

const TabSpan = styled(CoolStyles.InlineBlock)`
    ${CoolStyles.pointer}
    ${CoolStyles.ellipsis}
    ${CoolStyles.uppercase}
    color: white;
    background-color: #cccccc;
    //padding: 0.25rem 1rem 0;
    font-size: 14px;
    letter-spacing: 0.125rem;
`;

const TabSpanSelected = styled(CoolStyles.InlineBlock)`
    ${CoolStyles.bold}
    ${CoolStyles.ellipsis}
    ${CoolStyles.uppercase}
    ${CoolStyles.deep_blue_text};
    //padding: 0.25rem 1rem 0;
    border: 0.15rem solid #aaaaaa;
    border-radius: 0.25rem 0.25rem 0 0;
    border-bottom: 0;
    background-color: white;
    z-index: 0;
    font-size: 14px;
    letter-spacing: 0.125rem;
`;

export class CoolTabs extends Component {

   static propTypes = {
      labels: PropTypes.array.isRequired,
      tab_index: PropTypes.number.isRequired,
      on_tab_select: PropTypes.func.isRequired,
      selected_content: PropTypes.object.isRequired,
      style: PropTypes.object,
      width_px: PropTypes.number,
   }

   static defaultProps = {
      style: {},
      width_px: 0
   }

   state = {}

   render() {
      const {labels, style, tab_index, on_tab_select, selected_content, width_px} = this.props;
      const tab_style = !width_px ? {} : {
         maxWidth: `${(width_px / (labels.length)) - 1}px`
      }
      const all_tabs = labels.map((label, i) => {
         return i !== tab_index ?
            <TabSpan
               style={tab_style}
               key={`${i}_tab`}
               onClick={e => on_tab_select(i)}>
               {label}
            </TabSpan> :
            <TabSpanSelected
               style={tab_style}
               key={`${i}_sel_tab`}>
               {label}
            </TabSpanSelected>
      })
      return [
         <TabsWrapper key={"tab_wrapper"} style={style}>{all_tabs}</TabsWrapper>,
         <CardWrapper key={"card_wrapper"} style={style}>{selected_content}</CardWrapper>
      ]
   }
}

export default CoolTabs;
