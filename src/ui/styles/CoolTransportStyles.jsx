import styled from "styled-components";
import CoolStyles from "./CoolStyles";

export class CoolTransportStyles {
   static GenericButton = styled(CoolStyles.InlineBlock)`
       ${CoolStyles.tight_box_shadow}
       ${CoolStyles.tight_text_shadow}
       ${CoolStyles.pointer}
       ${CoolStyles.bold}
       ${CoolStyles.align_center}
       ${CoolStyles.align_middle}
       color: white;
       border: 1px solid #444444;
       margin: 0 1px;
       border-radius: 3px;
       padding: 2px 5px;
       font-size: 12px;
       overflow: hidden;
       background: linear-gradient(150deg, #aaaaaa, #444444);
   `
}

export default CoolTransportStyles
