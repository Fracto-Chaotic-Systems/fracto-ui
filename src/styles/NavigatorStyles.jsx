import styled from "styled-components";
import {CoolStyles} from '../utils/ui/CoolImports'

export const WIDTH_CROSSHAIR_LINE_PX = 2
export const OPACITY_LINE_PCT = 45

export class NavigatorStyles {
   static FixedWrapper = styled(CoolStyles.Block)`
       position: fixed;
   `
   static ImageWrapper = styled(CoolStyles.InlineBlock)`
       padding: 0;
       line-height: 0;
   `
   static VerticalCrossHair = styled(CoolStyles.InlineBlock)`
       position: fixed;
       width: ${WIDTH_CROSSHAIR_LINE_PX}px;
       top: 0;
       bottom: 0;
       background-color: white;
       opacity: 0.${OPACITY_LINE_PCT};
       cursor: crosshair;
   `
   static HorizontalCrossHair = styled(CoolStyles.InlineBlock)`
       position: fixed;
       height: ${WIDTH_CROSSHAIR_LINE_PX}px;
       left: 0;
       right: 0;
       background-color: white;
       opacity: 0.${OPACITY_LINE_PCT};
       cursor: crosshair;
   `
   static CenterBox = styled(CoolStyles.InlineBlock)`
       position: fixed;
       border: ${WIDTH_CROSSHAIR_LINE_PX}px solid rgba(255, 255, 255, ${2 * OPACITY_LINE_PCT}%);
       cursor: crosshair;
       background-color: transparent;
       border-radius: 3px;
   `
   static BoxTopBottom = styled(CoolStyles.InlineBlock)`
       position: fixed;
       height: ${WIDTH_CROSSHAIR_LINE_PX}px;
       background-color: white;
       opacity: 0.${OPACITY_LINE_PCT};
       cursor: crosshair;
   `
   static BoxLeftRight = styled(CoolStyles.InlineBlock)`
       position: fixed;
       width: ${WIDTH_CROSSHAIR_LINE_PX}px;
       background-color: white;
       opacity: 0.${OPACITY_LINE_PCT};
       cursor: crosshair;
   `
   static StepImageWrapper = styled(CoolStyles.InlineBlock)`
       ${CoolStyles.pointer}
       padding: 0;
       line-height: 0;
       border-bottom: 2px solid #888888;
       background-color: #eeeeee;
   `
}

export default NavigatorStyles
