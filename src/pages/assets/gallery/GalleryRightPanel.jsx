import React, {Component} from "react";
import PropTypes from "prop-types";

import {
    MainStyles as styles, MARGIN_PX,
} from '../../../styles/MainStyles.jsx'
import AppSettings from "../../../AppSettings.jsx";
import {
    KEY_ASSETS_GALLERY_RENDER_SPLITTER_POS,
    KEY_ASSETS_SPLITTER_POS_PX
} from "../../../settings/AssetsSettings.jsx";

import {
    KEY_COLUMN_LABEL_ASSET_FOCAL_POINT_COLON,
    KEY_COLUMN_LABEL_ASSET_SCOPE_COLON
} from "../../../text/AssetsText.jsx";
import {render_coordinates, render_scalar} from "../../../utils/Dom.jsx";
import CoolStyles from "../../../utils/ui/styles/CoolStyles.jsx";
import CoolTable from "../../../utils/ui/CoolTable.jsx";
import {
    CELL_ALIGN_LEFT,
    CELL_ALIGN_RIGHT,
    CELL_TYPE_CALLBACK,
    CELL_TYPE_TEXT_KEY,
    TABLE_NO_BORDER,
    TABLE_NO_HEADER
} from "../../../utils/ui/styles/CoolTableStyles.jsx";
import {send_to_icon} from "../../../utils/ui/CoolIcons.jsx";
import FractoLegend from "../../../utils/render/FractoLegend.jsx";
import Magnifier from "react-magnifier";
import {LEGEND_BACKGROUND_COLOR} from "./GalleryLeftPanel.jsx";

const TABLE_COLUMNS = [
    {
        id: "name",
        label: "name",
        type: CELL_TYPE_TEXT_KEY,
        width_px: 35,
        style: {fontWeight: 'bold', color: '#666666', fontStyle: 'italic'},
        align: CELL_ALIGN_RIGHT,
    },
    {
        id: "value",
        label: "value",
        type: CELL_TYPE_CALLBACK,
        align: CELL_ALIGN_LEFT,
    },
]

export class GalleryRightPanel extends Component {
    static propTypes = {
        asset: PropTypes.object.isRequired,
        rendered_height: PropTypes.number.isRequired,
        rendered_width: PropTypes.number.isRequired,
    }

    render() {
        const {rendered_height, rendered_width, asset} = this.props
        if (!asset) {
            return "click an image to start"
        }
        const rendered_splitter_pos =
            AppSettings.get(KEY_ASSETS_GALLERY_RENDER_SPLITTER_POS)
        const upper_block_height = Math.round(rendered_height * 0.20)
        const focal_point = {
            x: asset.focal_point_x,
            y: asset.focal_point_y,
        }
        const table_data = [
            {
                name: KEY_COLUMN_LABEL_ASSET_SCOPE_COLON,
                value: [render_scalar, asset.scope],
            },
            {
                name: KEY_COLUMN_LABEL_ASSET_FOCAL_POINT_COLON,
                value: [render_coordinates, focal_point],
            },
        ]
        const asset_id_style = {
            fontSize: '2.25rem',
            lineHeight: '2rem',
            color: '#777777',
            margin: '0 0.5rem',
            borderBottom: '0.25rem solid #777777',
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.25)',
        }
        const icon_style = {
            width: `30px`,
            height: `30px`,
            fill: '#cccccc',
            marginLeft: '0.5rem',
        }
        const legend_style = {
            margin: '0.5rem 0 0',
        }
        const panel_style = {
            height: `${upper_block_height}px`,
        }
        const splitter_width = AppSettings.get(KEY_ASSETS_SPLITTER_POS_PX)
        const image_width = rendered_width - rendered_splitter_pos + splitter_width
        const magnifier_style = {height: `${rendered_height * 0.70}px`}
        return [
            <styles.ScrollingBlock
                style={panel_style}>
                <CoolStyles.Block>
                    <styles.NumericValue
                        style={asset_id_style}>
                        {asset.asset_id}
                    </styles.NumericValue>
                    <styles.HalfRemSpacer/>
                    <styles.FixedInlineBlock>
                        <CoolStyles.InlineBlock>
                            <CoolTable
                                columns={TABLE_COLUMNS}
                                data={table_data}
                                options={[TABLE_NO_HEADER, TABLE_NO_BORDER]}
                            />
                        </CoolStyles.InlineBlock>
                        <styles.InlineHover
                            style={icon_style}>
                            {send_to_icon}
                        </styles.InlineHover>
                    </styles.FixedInlineBlock>
                </CoolStyles.Block>
                <CoolStyles.Block style={legend_style}>
                    <FractoLegend
                        height_px={135}
                        focal_point={focal_point}
                    />
                </CoolStyles.Block>
            </styles.ScrollingBlock>,
            <styles.ScrollingBlock style={magnifier_style}>
                <Magnifier
                    width={image_width - 2 * MARGIN_PX}
                    src={asset.public_url}
                    zoomFactor={2}
                    mgWidth={250}
                    mgHeight={250}
                />
            </styles.ScrollingBlock>
        ]
    }
}

export default GalleryRightPanel
