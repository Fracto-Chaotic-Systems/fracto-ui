import styled from "styled-components";
import {CoolColors, CoolStyles} from "../CoolImports";
import {Button} from "@mui/material";

export class CoolModalStyles {
   static FormField = styled.div`
       position: fixed;
       z-Index: 200;
       padding-top: 5rem;
       left: 0;
       top: 0;
       width: 100%;
       height: 100%;
       background: rgba(0, 0, 0, 35%);
   `;

   static FormContainer = styled.div`
       margin: auto;
       overflow: hidden;
       border-radius: 0.5rem;
       border: 0.15rem solid #aaaaaa;
       box-shadow: 0.5rem 0.5rem 1rem rgba(0, 0, 0, 25%);
       min-width: 10%;
       background-color: white;
       padding: 0.25rem;
   `;

   static FormContent = styled.div`
       min-height: 5rem;
       max-height: 90vh;
   `;

   static ModalTitle = styled(CoolStyles.Block)`
       ${CoolStyles.uppercase}
       ${CoolStyles.align_center}
       font-family: Arial, Helvetica, sans-serif;
       letter-spacing: 0.5rem;
       margin-bottom: 0.75rem;
       font-size: 1.125rem;
       color: ${CoolColors.deep_blue};
       border-bottom: 0.15rem solid #cccccc;
   `;

   static CloseButton = styled(Button)`
       ${CoolStyles.bold}
       ${CoolStyles.monospace}
       float: right;
       height: 1.125rem;
       width: 1rem !important;
       background-color: #dddddd !important;
       opacity: 0.5;
       &:hover {
           background-color: red !important;
           color: white !important;
       }
   `
}

export default CoolModalStyles
