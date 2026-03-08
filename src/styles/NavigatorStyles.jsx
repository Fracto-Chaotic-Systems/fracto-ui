import styled from "styled-components";
import {CoolStyles} from '../utils/ui/CoolImports'

export class NavigatorStyles {
   static FixedWrapper = styled(CoolStyles.Block)`
      position: fixed;
   `
   static ImageWrapper = styled(CoolStyles.InlineBlock)`
       padding: 0;
   `
}

export default NavigatorStyles
