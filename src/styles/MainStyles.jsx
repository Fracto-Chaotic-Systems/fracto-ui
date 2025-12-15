import styled from "styled-components";
import {CoolStyles} from "../ui/CoolImports.jsx";
import {HEADER_BAR_HEIGHT_PX} from "../constants.jsx";

export class MainStyles {
   static BodyWrapper = styled(CoolStyles.Block)`
       background-color: #fcfcfc;
       height: 100vh;
   `
   static ContentWrapper = styled(CoolStyles.InlineBlock)`
       background-color: #fcfcfc;
   `
   static AppTitle = styled(CoolStyles.Block)`
       ${CoolStyles.uppercase}
       ${CoolStyles.align_center}
       ${CoolStyles.narrow_text_shadow}
       font-size: 1.125rem;
       margin: 0 auto;
       letter-spacing: 1.25rem;
       color: #999999;
       text-shadow: 0.125rem 0.125rem 0.5rem rgba(0, 0, 0, 0.25);
   `;
   static HeaderWrapper = styled(CoolStyles.Block)`
       ${CoolStyles.fixed}
       ${CoolStyles.noselect}
       left: 0;
       right: 0;
       top: 0;
       height: ${HEADER_BAR_HEIGHT_PX}px;
       background: linear-gradient(15deg, #edeeef 0%, #fdfeff 50%, #dddedf 90%);
       opacity: 0.8;
       border-bottom: 0.1rem solid #555555;
   `;
   static MenuItem = styled(CoolStyles.InlineBlock)`
       ${CoolStyles.fixed}
       ${CoolStyles.bold}
       top: 0;
       font-size: 1rem;
       color: black;
   `
}

export default MainStyles
