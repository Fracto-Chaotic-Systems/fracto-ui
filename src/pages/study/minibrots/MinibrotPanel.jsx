import React, {Component} from "react";
import PropTypes from "prop-types";

import {SPLITTER_WIDTH_PX} from "../../../constants.jsx";
import CoolSplitter, {
    SPLITTER_TYPE_VERTICAL
} from "../../../utils/ui/CoolSplitter.jsx";
import MinibrotList, {
    TABLE_WIDTH_PX
} from "./MinibrotList.jsx";
import MinibrotLeftPanel from "./MinibrotLeftPanel.jsx";

import {
    MainStyles as styles,
    MARGIN_PX
} from '../../../styles/MainStyles.jsx'
import AppSettings from "../../../AppSettings.jsx";
import {KEY_STUDY_MINIBROTS_RENDER_SPLITTER_POS} from "../../../settings/StudySettings.jsx";
import GalleryRightPanel from "../../assets/gallery/GalleryRightPanel.jsx";
import MinibrotRightPanel from "./MinibrotRightPanel.jsx";

export class MinibrotPanel extends Component {
    static propTypes = {
        height_px: PropTypes.number.isRequired,
    }

    state = {
        container_ref: React.createRef(),
        selected_minibrot: {},
        rendered_splitter_pos: 500,
        ready: false,
        canvas_buffer: null,
    }

    componentDidMount() {
        this.setState({
            rendered_splitter_pos: AppSettings.get(KEY_STUDY_MINIBROTS_RENDER_SPLITTER_POS),
        })
    }

    on_select_minibrot = (selected_minibrot) => {
        console.log('on_select_minibrot', selected_minibrot)
        this.setState({
            selected_minibrot,
        })
    }

    right_panel = () => {
        return 'right_panela'
    }

    change_splitter_pos = (pos) => {
        const {container_ref} = this.state
        if (container_ref.current) {
            const container_bounds = container_ref.current.getBoundingClientRect()
            if (pos < (container_bounds.left + TABLE_WIDTH_PX)) {
                return;
            }
            if (pos > (container_bounds.left + TABLE_WIDTH_PX + container_bounds.height / 2)) {
                return;
            }
        }
        AppSettings.on_settings_changed({
            [KEY_STUDY_MINIBROTS_RENDER_SPLITTER_POS]: pos
        })
        this.setState({rendered_splitter_pos: pos})
    }

    on_ready = (canvas_buffer) => {
        this.setState({ready: true, canvas_buffer})
    }

    render() {
        const {canvas_buffer, ready, container_ref, rendered_splitter_pos, selected_minibrot} = this.state
        const {height_px} = this.props
        let top = 0;
        let container_bounds = {}
        if (container_ref.current) {
            container_bounds = container_ref.current.getBoundingClientRect()
            top = container_bounds.top
        }
        const table_style = {
            height: `${height_px}px`,
            maxWidth: `${TABLE_WIDTH_PX}px`,
            cursor: ready ? 'pointer' : 'wait',
        }
        const left_panel = selected_minibrot?.id
            ? <MinibrotLeftPanel
                selected_minibrot={selected_minibrot}
                container_bounds={container_bounds}
                on_ready={this.on_ready}
                ready={ready}
                canvas_buffer={canvas_buffer}
            />
            : []
        const right_panel = selected_minibrot?.id
            ? <MinibrotRightPanel
                selected_minibrot={selected_minibrot}
                container_bounds={container_bounds}
                ready={ready}
            />
            : []
        const minibrot_table = <MinibrotList
            on_select_minibrot={this.on_select_minibrot}
            height_px={height_px}
            ready={ready}
        />
        const splitter_pos = AppSettings.get(KEY_STUDY_MINIBROTS_RENDER_SPLITTER_POS)
        const right_block_style = {
            left: `${splitter_pos + MARGIN_PX}px`,
            top: `${top}px`,
        }
        return <styles.TightCenteredBlock
            ref={container_ref}>
            <styles.ScrollingBlock
                style={table_style}
                key={'input-form'}>
                {minibrot_table}
                {left_panel}
                <CoolSplitter
                    type={SPLITTER_TYPE_VERTICAL}
                    name={'minibrots-main-splitter'}
                    bar_width_px={SPLITTER_WIDTH_PX}
                    container_bounds={container_bounds}
                    position={rendered_splitter_pos}
                    on_change={this.change_splitter_pos}
                />
                <styles.FixedInlineBlock
                    style={right_block_style}>
                    {right_panel}
                </styles.FixedInlineBlock>
            </styles.ScrollingBlock>
        </styles.TightCenteredBlock>
    }
}

export default MinibrotPanel
