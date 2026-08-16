import styled from "styled-components";
import {CoolStyles} from "../../../utils/ui/CoolImports.jsx";

export const CATEGORY_LIST_WIDTH_PX = 135

export class LoreStyles {

   static ScrollingLoreList = styled(CoolStyles.InlineBlock)`
       overflow-y: auto;
       overflow-x: hidden;
   `

   static CategoryTitle = styled(CoolStyles.InlineBlock)`
       ${CoolStyles.italic}
       letter-spacing: 1px;
       font-size: 1.125rem;
       color: #555555;
       padding: 0.125rem 0.25rem;
       line-height: 1.25rem;
   `

   static NewLoreIcon = styled(CoolStyles.InlineBlock)`
       ${CoolStyles.pointer}
       ${CoolStyles.align_middle}
       width: 14px;
       height: 14px;
       fill: #7799bb;
       line-height: 1.25rem;
       opacity: 0.5;
       &:hover {
           opacity: 1.0;
       }
   `
   static KeyPrefix = styled(CoolStyles.InlineBlock)`
       ${CoolStyles.monospace}
       ${CoolStyles.bold}
       ${CoolStyles.align_middle}
       line-height: 2rem;
       padding: 0 0.5rem;
   `
   static MetaElement = styled(CoolStyles.InlineBlock)`
       ${CoolStyles.monospace}
       ${CoolStyles.bold}
       ${CoolStyles.align_middle}
       line-height: 2rem;
       font-size: 0.8rem;
       padding: 0 0.25rem;
   `

   static LoreTypeText= styled(CoolStyles.InlineBlock)`
       ${CoolStyles.bold}
       ${CoolStyles.align_middle}
       line-height: 2rem;
       font-size: 1.25rem;
       padding: 0 0.5rem;
   `
   static LoreTypeDescription= styled(CoolStyles.InlineBlock)`
       ${CoolStyles.italic}
       ${CoolStyles.align_middle}
       line-height: 2rem;
       font-size: 1rem;
       color: #888888;
   `
}

export default LoreStyles

