import styled from "styled-components";
import { CoolStyles } from "../CoolImports.jsx";

export const CELL_TYPE_OBJECT = "cell_type_oject";
export const CELL_TYPE_NUMBER = "cell_type_number";
export const CELL_TYPE_TEXT = "cell_type_text";
export const CELL_TYPE_TEXT_KEY = "cell_type_text_key";
export const CELL_TYPE_SELECT = "cell_type_select";
export const CELL_TYPE_LINK = "cell_type_link";
export const CELL_TYPE_TIME_AGO = "cell_type_time_ago";
export const CELL_TYPE_CALLBACK = "cell_type_callback";

export const CELL_ALIGN_LEFT = "cell_align_left";
export const CELL_ALIGN_RIGHT = "cell_align_right";
export const CELL_ALIGN_CENTER = "cell_align_center";

export const TABLE_CAN_SELECT = "table_can_select";
export const TABLE_NO_HEADER = "table_no_header";
export const TABLE_NO_BORDER = "table_no_border";

// Shared styling for descriptive labels used beside values in compact tables and controls.
export const CELL_LABEL_STYLE = {
  fontWeight: "bold",
  color: "#666666",
  fontStyle: "italic",
};

export class CoolTableStyles {
  static TableRow = styled(CoolStyles.TableRow)`
    padding: 0 0.125rem;
    //background-color: white;

    &: hover {
      ${CoolStyles.pointer}
      background-color: #eeeeee;
    }
  `;

  static TableCell = styled(CoolStyles.TableCell)`
    ${CoolStyles.ellipsis}
    ${CoolStyles.noselect}
       padding: 0 3px;
    line-height: 16px;
    max-height: 16px;
  `;

  static SelectorCell = styled(CoolStyles.TableCell)`
    padding-left: 0.25rem;
    line-height: 16px;
    max-height: 16px;
  `;

  static HeaderSpan = styled(CoolStyles.InlineBlock)`
    ${CoolStyles.uppercase}
    ${CoolStyles.narrow_text_shadow}
       color: white;
    font-size: 0.7rem;
    letter-spacing: 1px;
    padding: 1px 3px;
    background-color: #888888;
    margin: 0.125rem 0;
  `;

  static TableHeader = styled(CoolStyles.TableHeader)`
    background-color: #dddddd;
    padding: 0;
  `;
  static HeaderCell = styled(CoolStyles.TableCell)`
    ${CoolStyles.noselect}
  `;

  static TableBody = styled(CoolStyles.TableBody)`
    overflow: auto;
    padding-top: 27px;
  `;

  static TableBodyNoHeader = styled(CoolStyles.TableBody)`
    overflow: auto;
  `;

  static TableScrollable = styled(CoolStyles.Block)`
    overflow-x: hidden;
    overflow-y: auto;
  `;

  static NumericSpan = styled(CoolStyles.InlineBlock)`
    ${CoolStyles.monospace}
    ${CoolStyles.ellipsis}
       font-size: 16px;
  `;
}

export default CoolTableStyles;
