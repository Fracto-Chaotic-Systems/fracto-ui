import styled from "styled-components";

/** Shared styled-components used by every CoolTree instance. */
export class CoolTreeStyles {
  static IconWrapper = styled.span`
    display: inline-flex;
    width: 16px;
    margin-right: 3px;
    vertical-align: -2px;
  `;

  static Label = styled.span`
    color: black;
    font-weight: normal;
    letter-spacing: 1px;
    font-style: italic;
    vertical-align: top;
  `;

  static LeafLabel = styled(CoolTreeStyles.Label)`
    display: inline-block;
  `;

  static PlaceholderLabel = styled(CoolTreeStyles.LeafLabel)`
    color: #888888;
    font-family: monospace;
    font-style: normal;
  `;

  static ValueSeparator = styled.span``;

  static Value = styled.span`
    font-family: monospace;
  `;

  static ItemContainer = styled.li`
    position: relative;
  `;

  static InteractiveItem = styled.div`
    position: relative;
    line-height: 20px;
  `;

  static HierarchyGuide = styled.span`
    position: absolute;
    top: 0;
    bottom: 0;
    border-left: 1px solid #bbbbbb;
    pointer-events: none;
  `;

  static HierarchyBranch = styled.span`
    position: absolute;
    top: 50%;
    width: 6px;
    border-top: 1px solid #bbbbbb;
    pointer-events: none;
  `;
}

export default CoolTreeStyles;
