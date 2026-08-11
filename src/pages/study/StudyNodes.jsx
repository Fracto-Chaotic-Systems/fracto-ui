import React, {Component} from "react";

import MinibrotPanel from "./minibrots/MinibrotPanel.jsx";

import {
    MainStyles as styles,
    MARGIN_PX,
    TITLE_BAR_HEIGHT_PX
} from '../../styles/MainStyles.jsx'
import {KEY_STUDY_SPLITTER_POS_PX} from "../../settings/StudySettings.jsx";
import AppText from "../../AppText.jsx";
import {KEY_STUDY_NODES} from "../../text/StudyText.jsx";
import {update_dimensions} from "../PageUtils.jsx"
import {BAILIWICK_TYPE_NODES} from "../Study.jsx";

const UPDATE_INTERVAL_MS = 1000

export class StudyNodes extends Component {
    state = {
        rendered_width: 0,
        rendered_height: 0,
        container_ref: React.createRef(),
        interval: null,
    }

    componentDidMount() {
        this.update_dimensions()
        this.setState({
            interval: setInterval(this.update_dimensions, UPDATE_INTERVAL_MS),
        })
    }

    componentWillUnmount() {
        const {interval} = this.state
        if (interval) {
            clearInterval(interval)
        }
    }

    update_dimensions = () => {
        const {rendered_width, rendered_height} = this.state;
        const new_values = update_dimensions(rendered_width, rendered_height, KEY_STUDY_SPLITTER_POS_PX)
        if (new_values) {
            this.setState(new_values)
        }
    }

    render() {
        const {rendered_height, container_ref} = this.state
        let top = 0;
        let container_bounds = {}
        if (container_ref.current) {
            container_bounds = container_ref.current.getBoundingClientRect()
            top = container_bounds.top
        }
        const list_height_px = rendered_height - 2 * MARGIN_PX - top + TITLE_BAR_HEIGHT_PX
        return [
            <styles.SectionTitle
                key={'study-minibrots-title'}>
                {AppText.get(KEY_STUDY_NODES)}
            </styles.SectionTitle>,
            <div ref={container_ref}>
                <MinibrotPanel
                    bailiwick_type={BAILIWICK_TYPE_NODES}
                    height_px={list_height_px}
                />
            </div>
        ];
    }
}

export default StudyNodes
