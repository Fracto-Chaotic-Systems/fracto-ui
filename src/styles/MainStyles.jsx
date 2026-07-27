import styled from "styled-components";
import {CoolColors, CoolStyles} from "../utils/ui/CoolImports.jsx";
import {HEADER_BAR_HEIGHT_PX} from "../constants.jsx";

export const MARGIN_PX = 10
export const TITLE_BAR_HEIGHT_PX = 25
export const CONTENT_BACKGROUND_COLOR = "#fcfcfc"
export const SECTION_BAR_HEIGHT_PX = 36

export class MainStyles {
   static BodyWrapper = styled(CoolStyles.Block)`
       background-color: #fcfcfc;
       height: 100vh;
       overflow: hidden;
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
       ${CoolStyles.bold}
       margin: 0 0.5rem 0 1rem;
       font-size: 1rem;
       color: black;
   `
   static PaneWrapper = styled(CoolStyles.Block)`
       font-size: 1rem;
       color: #444444;
       overflow-y: auto;
   `
   static SidebarItem = styled(CoolStyles.Block)`
       ${CoolStyles.align_center}
       ${CoolStyles.pointer}
       border-radius: 0.25rem;
   `
   static SidebarLink = styled(CoolStyles.InlineBlock)`
       ${CoolStyles.uppercase}
       ${CoolStyles.noselect}
       font-size: 0.75rem;
       color: #444444;
       letter-spacing: 4px;
       margin-top: 2px;

       &:hover {
           font-weight: bold;
       }
   `
   static SidebarBreaker = styled(CoolStyles.Block)`
       ${CoolStyles.align_center}
       ${CoolStyles.noselect}
       border-bottom: 0.15rem solid #cccccc;
       margin: 0.25rem 1rem;
       line-height: 0.25rem;
   `
   static SectionTitle = styled(CoolStyles.Block)`
       ${CoolStyles.align_center}
       ${CoolStyles.uppercase}
       ${CoolStyles.noselect}
       margin: 0.5rem 0 0;
       padding-bottom: 0.5rem;
       font-size: 2rem;
       line-height: ${SECTION_BAR_HEIGHT_PX}px;
       border-bottom: 1px solid #cccccc;
   `
   static CenteredBlock = styled(CoolStyles.Block)`
       ${CoolStyles.align_center}
       margin: 0.5rem auto;
   `
   static ButtonBlock = styled(CoolStyles.Block)`
       ${CoolStyles.align_center}
       margin: 1.25rem auto;
   `
   static TightCenteredBlock = styled(CoolStyles.Block)`
       ${CoolStyles.align_center}
       margin: auto;
   `
   static FixedCenteredBlock = styled(CoolStyles.InlineBlock)`
       ${CoolStyles.fixed}
       ${CoolStyles.align_center}
       margin: auto;
   `
   static FixedInlineBlock = styled(CoolStyles.InlineBlock)`
       ${CoolStyles.fixed}
   `
   static FixedBlock = styled(CoolStyles.Block)`
       ${CoolStyles.fixed}
   `
   static InputPrompt = styled(CoolStyles.InlineBlock)`
       ${CoolStyles.italic}
       ${CoolStyles.noselect}
       margin-right: 0.5rem;
       font-size: 0.85rem;
   `
   static MenuWrapper = styled(CoolStyles.InlineBlock)`
       ${CoolStyles.fixed}
       left: 60px,
   `
   static FormTitle = styled(CoolStyles.InlineBlock)`
       ${CoolStyles.bold}
       font-size: 1.5rem;
   `
   static FormSubtitle = styled(CoolStyles.InlineBlock)`
       ${CoolStyles.italic}
       font-size: 0.85rem;
       color: grey;
       line-height: 0.75rem;
   `
   static FormWrapper = styled(CoolStyles.InlineBlock)`
       padding: 0 1.5rem;
       background-color: #f8f8f8;
       border: 1px solid #cccccc;
       box-shadow: 0.25rem 0.25rem 1.5rem rgba(0, 0, 0, 0.25);
       border-radius: 0.125rem;
       margin: 0.5rem auto;
   `
   static ConsoleWrapper = styled(CoolStyles.Block)`
       color: #eeeeee;
       padding: 0.5rem;
       background-color: #444444;
   `
   static ConsoleLine = styled(CoolStyles.Block)`
       ${CoolStyles.monospace}
       font-size: 0.85rem;
       line-height: 1rem;
       color: white;
   `
   static FilenameWrapper = styled(CoolStyles.Block)`
       ${CoolStyles.monospace}
       ${CoolStyles.align_middle}
       font-size: 0.85rem;
       line-height: 1rem;
       color: darkorchid;
       background-color: white;
   `
   static HighlightSpan = styled.span`
       color: lightskyblue;
   `
   static FractoLine = styled(MainStyles.ConsoleLine)`
       color: lightgreen;
   `
   static TableWrapper = styled(CoolStyles.InlineBlock)`
       box-shadow: 0.25rem 0.25rem 1.5rem rgba(0, 0, 0, 0.25);
       margin: 0.5rem auto;
   `
   static InlineContentWrapper = styled(CoolStyles.InlineBlock)`
       ${CoolStyles.align_center}
       ${CoolStyles.narrow_box_shadow}
       border: 1px solid #aaaaaa;
       border-radius: 0.25rem;
       margin-bottom: ${MARGIN_PX}px;
       background-color: ${CONTENT_BACKGROUND_COLOR};
       overflow: auto;
   `
   static FloatRight = styled(CoolStyles.InlineBlock)`
       float: right;
       margin-right: 1rem;
   `
   static BlueButton = styled(CoolStyles.InlineBlock)`
       ${CoolStyles.pointer}
       ${CoolStyles.noselect}
       ${CoolStyles.italic}
       font-weight: 400;
       color: white;
       background: linear-gradient(15deg, #557799 0%, #7799bb 50%, #bbddff 90%);
       border: 0.1rem solid #444444;
       border-radius: 0.25rem;
       line-height: 1.25rem;
       padding: 0 0.5rem 0.125rem;
   `
   static OneRemSpacer = styled(CoolStyles.InlineBlock)`
       width: 1rem;
   `
   static HalfRemSpacer = styled(CoolStyles.InlineBlock)`
       width: 0.5rem;
   `
   static HalfRemDown = styled(CoolStyles.Block)`
       height: 0.5rem;
   `
   static OneRemDown = styled(CoolStyles.Block)`
       height: 0.5rem;
   `
   static ScrollingBlock = styled(CoolStyles.Block)`
       overflow-y: auto;
   `
   static ScrollingInlineBlock = styled(CoolStyles.InlineBlock)`
       overflow-y: auto;
   `
   static NumericValue = styled(CoolStyles.InlineBlock)`
       ${CoolStyles.monospace}
   `
   static MuStyle = styled(CoolStyles.InlineBlock)`
       ${CoolStyles.bold}
       font-size: 0.90rem;
   `;
   static PatternBlock = styled(CoolStyles.InlineBlock)`
       ${CoolStyles.monospace}
       border: 0.1rem solid #666666;
       color: white;
   `;
   static TablePrompt = styled(CoolStyles.InlineBlock)`
      line-height: 2rem;
   `
   static ColorWheelWrapper = styled(CoolStyles.InlineBlock)`
       ${CoolStyles.noselect}
   `;

   static ColorWheelCanvas = styled.canvas`
       margin: 0;
   `
   static NormalLink = styled(CoolStyles.InlineBlock)`
       ${CoolStyles.italic}
       ${CoolStyles.pointer}
       font-size: 0.85rem;
       color: ${CoolColors.deep_blue};
       &:hover {
           ${CoolStyles.underline}
       }
   `
   static NotALink = styled(CoolStyles.InlineBlock)`
       ${CoolStyles.monospace}
       cursor: normal;
       font-size: 0.85rem;
   `
   static InlineHover = styled(CoolStyles.InlineBlock)`
       opacity: 0;
       transition: opacity 0.3s ease-in-out;
       &:hover {
           opacity: 1
       }
   `
   static CenteredCell = styled(CoolStyles.InlineBlock)`
      ${CoolStyles.align_center}
   `
}

export default MainStyles
