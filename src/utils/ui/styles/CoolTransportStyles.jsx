import styled from "styled-components";
import CoolStyles from "./CoolStyles.jsx";

export class CoolTransportStyles {
  static GenericButton = styled(CoolStyles.InlineBlock)`
    ${CoolStyles.tight_box_shadow}
    ${CoolStyles.narrow_text_shadow}
       ${CoolStyles.pointer}
       ${CoolStyles.bold}
       ${CoolStyles.align_center}
       ${CoolStyles.align_middle}
       svg {
      filter: drop-shadow(0.125rem 0.125rem 0.25rem rgba(0, 0, 0, 0.75));
    }
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: white;
    border: 1px solid #444444;
    margin: 0 2px;
    border-radius: 3px;
    padding: 2px 5px;
    font-size: 12px;
    overflow: hidden;
    background: linear-gradient(150deg, #bbbbbb, #666666);
  `;
}

export default CoolTransportStyles;
