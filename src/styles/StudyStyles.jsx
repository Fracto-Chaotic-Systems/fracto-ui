import styled from "styled-components";
import { CoolStyles } from "../utils/ui/CoolImports.jsx";

export class StudyStyles {
  static DenominatorCell = styled(CoolStyles.InlineBlock)`
    ${CoolStyles.monospace}
    color: white;
    padding: 1px 4px;
    border-radius: 3px;
  `;
}
export default StudyStyles;
