import React, {Component} from "react";
import PropTypes from "prop-types";

import {MeridiansStyles as styles} from "./MeridiansStyles.jsx";
import {render_aspect_badge, render_pattern_block} from "../StudyUtils.jsx";
import CoolStyles from "../../../utils/ui/styles/CoolStyles.jsx";
import {KEY_STUDY_MERIDIANS_FRAME_SETTINGS} from "../../../settings/StudySettings.jsx";
import AppSettings from "../../../AppSettings.jsx";
import FractoUtil from "../../../../../../sdk/FractoUtil.js";

export class StudyMeridians extends Component {
    static propTypes = {
        cardinality: PropTypes.number.isRequired,
        aspects: PropTypes.array.isRequired,
    }

    navigate = (aspect) => {
        const theta = aspect.num / aspect.den
        const P = FractoUtil.P_from_r_theta(1.0, theta)
        const frame_settings = {
            focal_point: {x: P.x, y: P.y},
            scope: 1 / (aspect.den * (aspect.den - 2 * aspect.num)),
        }
        console.log('frame_settings', frame_settings)
        AppSettings.on_settings_changed({
            [KEY_STUDY_MERIDIANS_FRAME_SETTINGS]: frame_settings
        })
    }

    render() {
        const {cardinality, aspects} = this.props
        // console.log('StudyMeridians, cardinality, aspects', cardinality, aspects)
        const aspect_list = aspects.map(aspect => {
            const block_style = {
                lineHeight: '20px',
                marginBottom: '5px',
            }
            const navigate_style = {
                cursor: 'pointer',
            }
            return <CoolStyles.InlineBlock
                style={block_style}
                key={`${aspect.num}/${aspect.den}`}>
                <input type={'checkbox'}/>
                <CoolStyles.InlineBlock
                    style={navigate_style}
                    onClick={() => {
                        this.navigate(aspect)
                    }}>
                    {render_aspect_badge(aspect.num, cardinality, 12)}
                </CoolStyles.InlineBlock>
            </CoolStyles.InlineBlock>
        })
        const wrapper_style = {maxWidth: `${5 + Math.sqrt(cardinality + aspect_list.length)}rem`};

        const block_style = {
            padding: '5px',
            borderBottom: '1px solid #444444',
            marginBottom: '8px',
            backgroundColor: '#eeeeee',
        }
        const cardinality_block = <styles.CardinalityWrapper
            style={wrapper_style}>
            <CoolStyles.Block
                style={block_style}>
                <input type={'checkbox'}/>
                {render_pattern_block(cardinality, 22)}
            </CoolStyles.Block>
            <CoolStyles.Block style={{textAlign: 'center'}}>
                {aspect_list}
            </CoolStyles.Block>
        </styles.CardinalityWrapper>
        return [cardinality_block]
    }
}

export default StudyMeridians

