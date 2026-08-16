import React, {Component} from "react";
import PropTypes from "prop-types";

import {
    TABLE_NO_BORDER,
    TABLE_NO_HEADER
} from "../../../../utils/ui/styles/CoolTableStyles.jsx";
import CoolTable from "../../../../utils/ui/CoolTable.jsx";
import {copy_json} from "../../../../utils/Dom.jsx";
import {LoreStyles as styles} from '../LoreStyles.jsx'
import {render_meta} from "../LoreMetaData.jsx";
import {render_preamble} from "../LorePreamble.jsx";
import {
    empty_content,
    LORE_INITIAL_DATA_STATE,
    LORE_INITIAL_META_STATE,
    render_link_text,
    render_source_text,
    TABLE_EDITOR_COLUMNS,
} from "./ContentUtils.jsx";
import {AssetsBackend} from "../../../../backend/AssetsBackend.jsx";

export class ContentReference extends Component {
    static propTypes = {
        item_id: PropTypes.number.isRequired,
        category: PropTypes.object.isRequired,
        width_px: PropTypes.number.isRequired,
        height_px: PropTypes.number.isRequired,
    }

    state = {
        content: null,
    }

    componentDidMount() {
        this.load_content()
    }

    load_content = async () => {
        const {item_id, category} = this.props
        const content = item_id > 0
            ? await AssetsBackend.get_lore_content(item_id)
            : empty_content(category)
        this.setState({content})
    }

    on_source_change = (source) => {
        const {item_data} = this.state
        console.log('on_source_change', source)
        item_data.source = source
        this.update_item_data(item_data)
    }

    on_link_change = (link) => {
        const {item_data} = this.state
        console.log('on_link_change', link)
        item_data.link = link
        this.update_item_data(item_data)
    }

    render_content = () => {
        const {item_data} = this.state
        const table_data = [
            {
                edit_key: 'source',
                edit_value: [render_source_text, {
                    item_data,
                    on_source_change: this.on_source_change,
                }]
            },
            {
                edit_key: 'link',
                edit_value: [render_link_text, {
                    item_data,
                    on_link_change: this.on_link_change,
                }]
            },
        ]
        return <CoolTable
            columns={TABLE_EDITOR_COLUMNS}
            data={table_data}
            options={[TABLE_NO_HEADER, TABLE_NO_BORDER]}
        />
    }

    update_item_data = (content_data) => {
        const {content} = this.state
        const {content_meta} = content
        content_meta.can_store = true;
        content_meta.modified = content_data.modified;
        content.content_data = copy_json(content_data)
        this.setState({content})
    }

    update_meta_data = (content_meta) => {
        const {content} = this.state
        content.content_meta = copy_json(content_meta)
        this.setState({content})
    }

    render() {
        const {content} = this.state
        const {category} = this.props
        if (!content) {
            // console.log('content null', content)
            return []
        }
        const {content_data, content_meta} = content
        if (!content_data) {
            console.log('content_data null', content)
            return []
        }
        const preamble_section = render_preamble(
            content, category, this.update_item_data)
        const content_section = this.render_content()
        const meta_section = render_meta(
            content_meta, content_data, category, this.update_meta_data)
        return <styles.ScrollingLoreList>
            {preamble_section}
            {content_section}
            {meta_section}
        </styles.ScrollingLoreList>
    }
}

export default ContentReference
