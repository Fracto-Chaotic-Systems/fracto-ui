import React, {Component} from "react";
import PropTypes from "prop-types";

import {MeridiansStyles as styles} from "./MeridiansStyles.jsx";
import {render_aspect_badge, render_pattern_block} from "../StudyUtils.jsx";
import CoolStyles from "../../../utils/ui/styles/CoolStyles.jsx";

export class StudyMeridians extends Component {
    static propTypes = {
        cardinality: PropTypes.number.isRequired,
        aspects: PropTypes.array.isRequired,
    }

    render() {
        const {cardinality, aspects} = this.props
        console.log('StudyMeridians, cardinality, aspects', cardinality, aspects)
        const aspect_list = aspects.map(aspect => {
            return <CoolStyles.InlineBlock
                key={`${aspect.num}/${aspect.den}`}>
                <input type={'checkbox'}/>
                {render_aspect_badge(aspect.num, cardinality, 12)}
            </CoolStyles.InlineBlock>
        })
        const block_style = {maxWidth: `${5 + Math.sqrt(cardinality + aspect_list.length)}rem`};
        const cardinality_block = <styles.CardinalityWrapper
            style={block_style}>
            <CoolStyles.Block
                style={{margin: '0 5px 5px 0'}}>
                <input type={'checkbox'}/>
                {render_pattern_block(cardinality, 22)}
            </CoolStyles.Block>
            {aspect_list}
        </styles.CardinalityWrapper>
        return [cardinality_block]
    }
}

export default StudyMeridians

