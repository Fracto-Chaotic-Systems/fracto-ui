import styled from "styled-components";
import {CoolStyles} from '../../../utils/ui/CoolImports'

export class MeridiansStyles{

    static CardinalityWrapper = styled(CoolStyles.InlineBlock)`
        ${CoolStyles.tight_box_shadow}
        padding: 0.125rem 0.25rem;
        border: 1px solid #444444;
        margin: 0.125rem;
        border-radius: 3px;
        background-color: white;
    `
}

export default MeridiansStyles
