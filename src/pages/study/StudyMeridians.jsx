import React, {Component} from "react";
import styled from "styled-components";

import {MainStyles as styles, MARGIN_PX} from '../../styles/MainStyles.jsx'
import AppSettings from "../../AppSettings.jsx";
import {update_dimensions} from "../PageUtils.jsx"
import {
    KEY_STUDY_MERIDIANS_FRAME_SETTINGS,
    KEY_STUDY_MERIDIANS_LEGEND_SPLITTER_POS,
    KEY_STUDY_MERIDIANS_SPLITTER_POS,
    KEY_STUDY_MERIDIANS_STEPS_SPLITTER_POS,
    KEY_STUDY_SPLITTER_POS_PX
} from "../../settings/StudySettings.jsx";
import AppText from "../../AppText.jsx";

import NavigatorSplitterLayout from "../../navigator/NavigatorSplitterLayout.jsx";
import {KEY_STUDY_MERIDIANS} from "../../text/StudyText.jsx";
import DataBackend from "../../backend/DataBackend.jsx";
import MeridianBlock from "./meridians/MeridianBlock.jsx";
import CoolStyles from "../../utils/ui/styles/CoolStyles.jsx";
import {BACKGROUND_FIELD_GRADIENT} from "../../constants.jsx";

const UPDATE_INTERVAL_MS = 1000
const MAX_CARDINALITY = 128
const BlocksBackground = styled(CoolStyles.Block)`
    background: ${BACKGROUND_FIELD_GRADIENT};
    overflow-y: auto;
    padding: 0.5rem;
    height: 90vh;
`

export class StudyMeridians extends Component {
    state = {
        rendered_width: 0,
        rendered_height: 0,
        interval: null,
        container_ref: React.createRef(),
        bounding_rect: {},
        frame_settings: {},
        subscription: null,
        farey_sequence: null,
    }

    componentDidMount() {
        this.update_dimensions()
        this.initialize_farey_seq()
        this.setState({
            interval: setInterval(this.update_dimensions, UPDATE_INTERVAL_MS),
            frame_settings: AppSettings
                .get(KEY_STUDY_MERIDIANS_FRAME_SETTINGS),
            subscription: AppSettings
                .subscribe(KEY_STUDY_MERIDIANS_FRAME_SETTINGS, this.on_frame_settings_changed)
        })
    }

    componentWillUnmount() {
        const {interval, subscription} = this.state
        if (interval) {
            clearInterval(interval)
        }
        if (subscription) {
            AppSettings.unsubscribe(subscription)
        }
    }

    update_dimensions = () => {
        const {rendered_width, rendered_height} = this.state;
        const new_values = update_dimensions(rendered_width, rendered_height, KEY_STUDY_SPLITTER_POS_PX)
        if (new_values) {
            this.setState(new_values)
        }
    }

    initialize_farey_seq = async () => {
        const farey_sequence = await DataBackend.get_farey_sequence()
        this.setState({farey_sequence})
    }

    on_frame_settings_changed = (key, value) => {
        // console.log('on_frame_settings_changed', value)
        this.setState({frame_settings: value})
    }

    render_content = () => {
        const {farey_sequence, rendered_height} = this.state
        if (!farey_sequence) {
            return []
        }
        // console.log('farey_sequence', farey_sequence)
        const all_blocks = []
        for (let cardinality = 3; cardinality <= MAX_CARDINALITY; cardinality++) {
            const aspects = farey_sequence
                .filter(element => element.den === cardinality)
            const cardinality_block = <MeridianBlock
                cardinality={cardinality}
                aspects={aspects}/>
            all_blocks.push(cardinality_block)
        }
        return <BlocksBackground>
            {all_blocks}
        </BlocksBackground>
    }

    render() {
        const {container_ref, rendered_height, rendered_width, frame_settings} = this.state
        let top = 0;
        let left = 0;
        if (container_ref.current) {
            const container_bounds = container_ref.current.getBoundingClientRect()
            top = container_bounds.top
            left = container_bounds.left
        }
        const bounding_rect = {
            top,
            left,
            width: rendered_width,
            height: rendered_height,
        }
        const splitter_keys = {
            legend_key: KEY_STUDY_MERIDIANS_LEGEND_SPLITTER_POS,
            main_key: KEY_STUDY_MERIDIANS_SPLITTER_POS,
            steps_key: KEY_STUDY_MERIDIANS_STEPS_SPLITTER_POS,
            section_key: KEY_STUDY_SPLITTER_POS_PX,
        }
        const splitter_pos = AppSettings.get(splitter_keys.main_key)
        const result_block_style = {
            left: `${splitter_pos}px`,
            top: `${top}px`,
        }
        return [
            <styles.SectionTitle
                key={'study-overview-title'}>
                {AppText.get(KEY_STUDY_MERIDIANS)}
            </styles.SectionTitle>,
            <styles.TightCenteredBlock
                ref={container_ref}
                key={'meridians-layout'}>
                <NavigatorSplitterLayout
                    bounding_rect={bounding_rect}
                    frame_settings={frame_settings}
                    frame_settings_key={KEY_STUDY_MERIDIANS_FRAME_SETTINGS}
                    splitter_keys={splitter_keys}
                />
            </styles.TightCenteredBlock>,
            <styles.FixedInlineBlock
                key={'meridians-content'}
                style={result_block_style}>
                {this.render_content()}
            </styles.FixedInlineBlock>,
        ];
    }
}

export default StudyMeridians
