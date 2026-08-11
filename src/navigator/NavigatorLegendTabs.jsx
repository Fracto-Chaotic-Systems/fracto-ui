import React, {Component} from "react";
import PropTypes from "prop-types";

import CoolStyles from "../utils/ui/styles/CoolStyles.jsx";
import CoolTabs from "../utils/ui/CoolTabs.jsx";
import AppSettings from "../AppSettings.jsx";
import {KEY_STUDY_MINIBROTS_RENDER_SPLITTER_POS, KEY_STUDY_SPLITTER_POS_PX} from "../settings/StudySettings.jsx";
import {TABLE_WIDTH_PX} from "../pages/study/minibrots/MinibrotList.jsx";
import {SPLITTER_WIDTH_PX} from "../constants.jsx";
import FractoOrbitalChart from "../utils/render/FractoOrbitalChart.jsx";
import FieldsColorWheel from "../utils/render/FieldsColorWheel.jsx";
import {MARGIN_PX} from "../styles/MainStyles.jsx";

const TAB_LABELS = ['orbital', 'patterns']

export class NavigatorLegendTabs extends Component {
    static propTypes = {
        width_px: PropTypes.number.isRequired,
        canvas_buffer: PropTypes.array.isRequired,
        focal_point: PropTypes.object.isRequired,
    }

    state = {
        selected_tab: 0,
    }

    on_select_tab = (selected_tab) => {
        this.setState({selected_tab})
    }

    render_tab_content = () => {
        const {selected_tab} = this.state;
        const {focal_point, canvas_buffer, width_px} = this.props;
        if (!focal_point || !canvas_buffer) {
            return []
        }
        const margin = MARGIN_PX / 2
        const chart_style = {
            width: `${width_px}px`,
            height: `${width_px}px`,
            boxShadow: '5px 5px 10px rgba(0, 0, 0, 0.25)',
            backgroundColor: '#f8f8f8',
            cursor: 'pointer',
        }
        switch (selected_tab) {
            case 0: {
                return <div
                    onClick={this.on_click_chart}
                    style={chart_style}>
                    <FractoOrbitalChart
                        key={selected_tab}
                        width_px={width_px}
                        focal_point={focal_point}
                        in_animation={false}
                        ready={true}
                    />
                </div>
            }
            case 1: return <div
                style={chart_style}>
                <FieldsColorWheel
                    width_px={width_px}
                    canvas_buffer={canvas_buffer}
                />
            </div>
            default: {
                console.log('selected_tab',selected_tab)
                return[]
            }
        }
    }

    render() {
        const {selected_tab} = this.state;
        const {width_px} = this.props
        const tabs_style = {
            marginLeft: `0.5rem`,
            width: `${width_px}px`,
        }
        const selected_content = this.render_tab_content()
        // console.log('NavigatorLegendTabs canvas_buffer, focal_point',canvas_buffer, focal_point)
        return <CoolStyles.InlineBlock
            style={tabs_style}>
            <CoolTabs
                labels={TAB_LABELS}
                tab_index={selected_tab}
                on_tab_select={this.on_select_tab}
                selected_content={selected_content}
            />
        </CoolStyles.InlineBlock>
    }
}

export default NavigatorLegendTabs
