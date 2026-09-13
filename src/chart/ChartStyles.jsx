import styled from "styled-components";
import CoolColors from "../utils/ui/CoolColors.jsx";
import CoolStyles from "../utils/ui/styles/CoolStyles.jsx";
import { MARGIN_PX } from "../styles/MainStyles.jsx";

export class ChartStyles {
  static InlineChartWrapper = styled(CoolStyles.InlineBlock)`
    box-shadow: 5px 5px 10px rgba(0, 0, 0, 0.25);
    background-color: #f8f8f8;
    margin: ${MARGIN_PX}px;
  `;
}

export default ChartStyles;
