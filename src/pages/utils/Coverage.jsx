import React, {Component} from "react";
import PropTypes from "prop-types";
import {FRACTO_TILES_PORT} from "../../../../../constants.js";
import {service_origin} from "../../utils/service_origin.jsx";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'

export class Coverage extends Component {
   static propTypes = {
      frame_settings: PropTypes.object.isRequired,
   }

   state = {
      coverage: [],
   }

   componentDidMount() {
      this.get_coverage()
   }

   componentDidUpdate(prevProps, prevState, snapshot) {
      const prev_frame_settings = JSON.stringify(prevProps.frame_settings)
      const current_frame_settings = JSON.stringify(this.props.frame_settings)
      if (prev_frame_settings !== current_frame_settings) {
         this.setState({coverage: []})
         this.get_coverage()
      }
   }

   get_coverage = async () => {
      const {frame_settings} = this.props
      const all_params = [
         `scope=${frame_settings.scope}`,
         `re=${frame_settings.focal_point.x}`,
         `im=${frame_settings.focal_point.y}`,
      ].join('&')
      const url = `${service_origin(FRACTO_TILES_PORT)}/tile_coverage?${all_params}`
      try {
         const response = await fetch(url)
         const result = await response.json()
         this.setState({coverage: result.coverage})
      } catch (e) {
         console.log(e.message)
         return []
      }
   }

   render() {
      const {coverage} = this.state
      const coverage_list = coverage.length
         ? coverage
            .filter((item) => item.tile_count > 1)
            .map((item) => {
               return `${item.level}:${item.tile_count}`
            })
            .splice(-6)
            .reverse()
            .join(', ')
         : 'waiting...'
      const list_style = {
         fontSize: '0.85rem',
         lineHeight: '1rem',
         fontWeight: 'bold',
         color: 'black',
         width: '25rem',
         textOverflow: 'wrap',
         verticalAlign: 'middle',
      }
      return <styles.NumericValue
         style={list_style}
         title={coverage_list}>
         {coverage_list}
      </styles.NumericValue>
   }
}

export const render_coverage = (frame_settings) => {
   return <Coverage frame_settings={frame_settings}/>
}
