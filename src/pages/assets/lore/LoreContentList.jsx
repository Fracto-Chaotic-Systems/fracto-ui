import React, {Component} from "react";
import PropTypes from "prop-types";
import DataBackend from "../../../backend/DataBackend.jsx";
import {LoreStyles as styles} from './LoreStyles.jsx'

export class LoreContentList extends Component {
    static propTypes = {
        category_id: PropTypes.number.isRequired,
        width_px: PropTypes.number.isRequired,
        height_px: PropTypes.number.isRequired,
        on_select_content: PropTypes.func.isRequired,
    }

    state = {
        order_by: -1,
        content_list: [],
    }

    componentDidMount() {
        this.load_content()
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (prevProps.category_id !== this.props.category_id) {
            this.load_content()
        }
    }

    load_content = () => {
        const {category_id} = this.props
        DataBackend.lore_content_listing(category_id, response => {
            console.log('load_content', category_id, response)
            this.setState({content_list: response.result})
        })
    }

    render_content_list = () => {
        const {content_list} = this.state
        return `content_list has ${content_list.length} items`
    }

    render() {
        const content_list = this.render_content_list()
        return <styles.ScrollingLoreList>
            {content_list}
        </styles.ScrollingLoreList>
    }
}