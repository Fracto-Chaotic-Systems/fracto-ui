import React, {Component} from 'react';
import PropTypes from 'prop-types';
import styled from "styled-components";

import {AppStyles, AppColors} from "app/AppImports";

export const COLUMN_TYPE_NUMBER = "number_column";
export const COLUMN_TYPE_LOCATION = "location_column";
export const COLUMN_TYPE_ARRAY = "array_column";
export const COLUMN_TYPE_LINK = "link_column";

const ColumnHeader = styled(AppStyles.InlineBlock)`
   ${AppStyles.centered}
   border-bottom: 0.15rem solid ${AppColors.HSL_COOL_BLUE};
   border-right: 0.15rem solid #dddddd;
`;

const HeaderSpan = styled(AppStyles.InlineBlock)`
   ${AppStyles.monospace}
   color: #666666;
`;

const GridCell = styled(AppStyles.InlineBlock)`
   padding: 0.25rem 0;
   width: 8rem;
   margin: 0.125rem 0.25rem;
`;

const GridRow = styled(AppStyles.Block)`
   border-radius: 0.25rem;
   &:hover {
      background-color: #eeeeee;
   }
`;

export class CoolGrid extends Component {

   static propTypes = {
      columns: PropTypes.array.isRequired,
      data: PropTypes.array.isRequired,
   }

   render() {
      const {columns, data} = this.props;
      const header = columns.map(col => {
         return <ColumnHeader>
            <HeaderSpan style={{width: `${col.width_rem - 0.15}rem`}}>{col.label}</HeaderSpan>
         </ColumnHeader>
      })

      const rows = data.map((row, i) => {
         const row_block = columns.map(col => {
            return <GridCell style={{width: `${col.width_rem-0.5}rem`}}>{row[col.key]}</GridCell>
         })
         const result = [<GridRow>{row_block}</GridRow>]
         if (row.row_expanded) {
            result.push(<AppStyles.Block>{row.row_expanded}</AppStyles.Block>)
         }
         return result;
      })

      return [
         header, rows
      ]
   }

}

export default CoolGrid;
