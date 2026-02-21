import React, {Component} from 'react';
import PropTypes from 'prop-types';
import styled from "styled-components";

// import {AppStyles} from "../../app/AppImports";

const SelectWrapper = styled.select`
   padding: 0.25rem 0.5rem;
`;

const CoolOption = styled.option`
   padding: 0.5rem 1rem;
`;

export class CoolSelect extends Component {

   static propTypes = {
      options: PropTypes.array.isRequired,
      value: PropTypes.number.isRequired,
      on_change: PropTypes.func.isRequired,
   }

   render() {
      const {options, on_change, value} = this.props;
      const all_options = options.map((data, index) => {
         const help = !data.help ? '' : ` (${data.help})`
         return <CoolOption
            key={`option_${index}_${data.label}`}
            value={data.value}
            selected={value === data.value}>
            {`${data.label}${help}`}
         </CoolOption>
      });
      return <SelectWrapper
         onChange={on_change}>
         {all_options}
      </SelectWrapper>

   }
}

export default CoolSelect;
