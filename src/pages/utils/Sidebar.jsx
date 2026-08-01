import React, {Component} from 'react'
import PropTypes from "prop-types";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import AppText from "../../AppText.jsx";

export const SIDEBAR_BREAKER = 'sidebar_breaker'

export class Sidebar extends Component {
    static propTypes = {
        sidebar_list: PropTypes.array.isRequired,
        section_code: PropTypes.string.isRequired,
        on_change: PropTypes.func.isRequired,
    }

    render() {
        const {sidebar_list, section_code, on_change} = this.props
        const sidebar = sidebar_list.map((item, i) => {
            if (item.section_code === SIDEBAR_BREAKER) {
                if (item.section_text_key) {
                    const breaker_text = AppText.get(item.section_text_key)
                    return <styles.SidebarBreaker key={`breaker-${i}`}>
                        <styles.SideBarBreakerText>
                            {breaker_text}
                        </styles.SideBarBreakerText>
                    </styles.SidebarBreaker>
                } else {
                    return <styles.SidebarBreaker key={`breaker-${i}`}/>
                }
            }
            const item_style = item.section_code === section_code
                ? {background: 'linear-gradient(15deg, #557799 0%, #7799bb 50%, #bbddff 90%)'} : {}
            const title_style = item.section_code === section_code
                ? {fontWeight: 'bold', color: 'white'} : {}
            return <styles.SidebarItem
                style={item_style}
                key={`sidebar-item-${i}`}
                onClick={() => on_change(item.section_code)}>
                <styles.SidebarLink style={title_style}>{item.title}</styles.SidebarLink>
            </styles.SidebarItem>
        })
        const pane_style = {marginTop: '0.5rem'}
        return <styles.PaneWrapper style={pane_style}>
            {sidebar}
        </styles.PaneWrapper>
    }
}

export default Sidebar