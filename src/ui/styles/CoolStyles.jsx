import styled, {css} from "styled-components";

import {CoolColors} from "../CoolImports";

export class CoolStyles {

   static pointer = css`
        cursor: pointer;
    `;

   static noselect = css`
        user-select: none;
    `;

   static align_top = css`
        vertical-align: top;
    `;

   static align_bottom = css`
       vertical-align: bottom;
   `;

   static align_middle = css`
        vertical-align: middle;
    `;

   static align_left = css`
        text-align: left;
    `;

   static align_right = css`
        text-align: right;
    `;

   static align_center = css`
        text-align: center;
    `;

   static underline = css`
        text-decoration: underline;
    `;

   static uppercase = css`
        text-transform: uppercase;
    `;

   static bold = css`
        font-weight: bold;
    `;

   static italic = css`
        font-style: italic;
    `;

   static absolute = css`
        position: absolute;
    `;

   static relative = css`
        position: relative;
    `;

   static fixed = css`
        position: fixed;
    `;

   static monospace = css`
        font-family: Courier;
        font-weight: bold;
    `;

   static ellipsis = css`
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
    `;

   static tight_box_shadow = css`
        box-shadow: 0.125rem 0.125rem 0.25rem rgba(0,0,0,0.2);
    `;

   static narrow_box_shadow = css`
        box-shadow: 0.25rem 0.25rem 0.5rem rgba(0,0,0,0.2);
    `;

   static medium_box_shadow = css`
        box-shadow: 0.5rem 0.5rem 1rem rgba(0,0,0,0.2);
    `;

   static wide_box_shadow = css`
        box-shadow: 1rem 1rem 2rem rgba(0,0,0,0.2);
    `;

   static tight_text_shadow = css`
        text-shadow: 0.125rem 0.125rem 0.25rem rgba(0,0,0,0.75);
    `;

   static narrow_text_shadow = css`
        text-shadow: 0.25rem 0.25rem 0.5rem rgba(0,0,0,0.75);
    `;

   static medium_text_shadow = css`
        text-shadow: 0.5rem 0.5rem 1rem rgba(0,0,0,0.5);
    `;

   static wide_text_shadow = css`
        text-shadow: 1rem 1rem 2rem rgba(0,0,0,0.5;
    `;

   static narrow_border_radius = css`
        border-radius: 0.25rem;
    `;

   static medium_border_radius = css`
        border-radius: 0.5rem;
    `;

   static wide_border_radius = css`
        border-radius: 1rem
    `;

   static link = css`
        ${CoolStyles.italic};
        ${CoolStyles.pointer};
        color: ${CoolColors.cool_blue};
        font-weight: normal;
        &: hover{
            ${CoolStyles.underline};
        }
    `;

   static LinkSpan = styled.span`
        ${CoolStyles.pointer}
        ${CoolStyles.noselect}
        ${CoolStyles.italic}
        color: ${CoolColors.cool_blue}
    `;

   static Clickable = styled.div`
        ${CoolStyles.pointer}
        ${CoolStyles.noselect}
    `;

   static Block = styled.div`
        display: block;
        ${CoolStyles.align_left}
    `;

   static InlineBlock = styled.div`
        display: inline-block;
        ${CoolStyles.align_top}
    `;

   static Table = styled.div`
        display: table;
    `;

   static TableRow = styled.div`
        display: table-row;
    `;

   static TableCell = styled.div`
        display: table-cell;
    `;

   static TableHeader = styled.div`
        display: table-header-group;
    `;

   static TableBody = styled.div`
        display: table-row-group;
    `;

   static blue_border = css`
        border: 0.125rem solid ${CoolColors.cool_blue};
        border-radius: 0.25rem;
    `;

   static dark_border = css`
        border: 0.125rem solid #666666;
        border-radius: 0.25rem;
    `;

   static light_border = css`
        border: 0.125rem solid #aaaaaa;
        border-radius: 0.25rem;
    `;

   static InputText = styled.input`
        ${CoolStyles.blue_border};
        min-width: 5rem;
        outline: none;
        padding: 0.125rem 0.25rem;
    `;

   static InputTextArea = styled.textarea`
        ${CoolStyles.blue_border};
        min-width: 15rem;
        outline: none;
        padding: 0.125rem 0.25rem;
        :: placeholder {
            color: #bbbbbb;
        }
    `;

   static cool_blue_text = css`
      color: ${CoolColors.cool_blue};
   `;

   static deep_blue_text = css`
      color: ${CoolColors.deep_blue};
   `;

}

export default CoolStyles;
