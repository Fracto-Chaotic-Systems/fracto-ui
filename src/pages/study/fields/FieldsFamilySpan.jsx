import React, {Component} from "react";
import PropTypes from "prop-types";

import {CompOrbitalStyles as styles} from 'styles/CompOrbitalStyles'
import PageSettings from "pages/PageSettings";
import {
   KEY_COMPS_HEIGHT_PX,
   KEY_COMPS_WIDTH_PX
} from "pages/settings/PaneSettings";
import {
   KEY_UPDATE_INDEX,
   KEY_SCOPE,
   KEY_FOCAL_POINT,
} from "pages/settings/AppSettings";
import {collect_orbitals} from "fracto/CanvasBufferUtils";
import FractoUtil from "fracto/FractoUtil";

const GRADUAL_FACTOR_CHANGE = 1.015
const COMP_WIDTH_FACTOR = 0.55
const COMP_HEIGHT_FACTOR = 0.45

export class FieldsFamilySpan extends Component {
   static propTypes = {
      page_settings: PropTypes.object.isRequired,
      on_settings_changed: PropTypes.func.isRequired,
   }
   state = {
      wrapper_width_px: 0,
      wrapper_height_px: 0,
      canvas_buffer_width: 0,
      most_recent: {
         scope: 0,
         focal_point: {x: 0, y: 0}
      },
      canvas_ref: React.createRef(),
      orbital_bins: {},
      families: {},
      highest_family_count: 0,
      height_scalar: 0.45,
      stored_values: {},
      interval: null,
   };

   componentDidMount() {
      const {stored_values} = this.state
      const {page_settings} = this.props
      this.initialize()
      this.setState({
         stored_values: {
            [KEY_UPDATE_INDEX]: 0,
         }
      });
      const interval = setInterval(() => {
         const settings_changed = PageSettings.test_update_settings(
            [
               KEY_UPDATE_INDEX,
               KEY_SCOPE,
               KEY_FOCAL_POINT,
            ], page_settings, stored_values)
         if (settings_changed) {
            this.setState({stored_values})
            this.fill_pattern_bins()
         }
      }, 500)
      this.setState({interval})
   }

   componentWillUnmount() {
      const {interval} = this.state
      if (interval) {
         clearInterval(interval)
      }
   }

   componentDidUpdate(prevProps, prevState, snapshot) {
      const {wrapper_width_px} = this.state
      const {page_settings} = this.props
      const width_px = page_settings[KEY_COMPS_WIDTH_PX] * COMP_WIDTH_FACTOR
      const wrapper_width_changed = width_px !== wrapper_width_px
      if (wrapper_width_changed) {
         setTimeout(this.initialize, 500)
      }
   }

   initialize = () => {
      const {wrapper_width_px} = this.state
      const {page_settings} = this.props
      const width_px = page_settings[KEY_COMPS_WIDTH_PX] * COMP_WIDTH_FACTOR
      if (width_px !== wrapper_width_px) {
         const height_px = page_settings[KEY_COMPS_HEIGHT_PX] * COMP_HEIGHT_FACTOR
         this.setState({
            wrapper_width_px: Math.round(width_px),
            wrapper_height_px: Math.round(height_px)
         })
      }
   }

   fill_pattern_bins = () => {
      const {canvas_ref, wrapper_width_px, wrapper_height_px, height_scalar} = this.state
      const {page_settings} = this.props
      const {canvas_buffer} = page_settings
      if (!canvas_buffer) {
         return false;
      }
      const canvas = canvas_ref.current
      if (!canvas) {
         return false
      }
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f8f8f8'
      ctx.fillRect(0, 0, wrapper_width_px, wrapper_height_px);

      const orbital_bins = collect_orbitals(canvas_buffer)
      // console.log('fill_pattern_bins', orbital_bins)
      const families = {}
      Object.keys(orbital_bins).forEach(key => {
         if (key.indexOf('orbital_') < 0) {
            return
         }
         const family = FractoUtil.fracto_pattern_family(orbital_bins[key].orbital)
         const family_key = `family_${family}`
         if (!families[family_key]) {
            families[family_key] = {
               base: family,
               members: [],
               total_count: 0
            }
         }
         families[family_key].members.push(orbital_bins[key])
         families[family_key].total_count += orbital_bins[key].bin_count
      })
      let highest_family_count = 0
      Object.keys(families).forEach(key => {
         if (families[key].total_count < 5) {
            delete families[key]
         } else {
            if (highest_family_count < families[key].total_count) {
               highest_family_count = families[key].total_count
            }
         }
      })
      // console.log('families, highest_family_count', families, highest_family_count)
      const log_highest_count = Math.log(highest_family_count) * 1.5
      let least_base_y = wrapper_height_px
      Object.keys(families).forEach(key => {
         const family = families[key]
         const leftmost = family.base === 1 ? 0
            : Math.round(
               wrapper_width_px * (Math.log2(family.base) - Math.floor(Math.log2(family.base)))
            )
         let base_y = wrapper_height_px
         ctx.fillStyle = FractoUtil.fracto_pattern_color(family.base)
         family.members.sort((a, b) => a.orbital - b.orbital).forEach((member) => {
            const height_px = height_scalar * wrapper_height_px * Math.log(member.bin_count) / log_highest_count
            base_y -= height_px
            let width_px = Math.max(2, 100 - 16 * Math.log(member.orbital))
            if (width_px < 1) {
               width_px = 1
            }
            ctx.fillRect(leftmost, base_y, width_px + 1, height_px + 1)
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.lineWidth = 1
            ctx.strokeRect(leftmost, base_y, width_px + 1, height_px + 1)
            if (height_px > 15 && width_px > 15) {
               let font_size = Math.min(width_px - 10, height_px - 10)
               if (font_size > 24) {
                  font_size = 24
               }
               ctx.font = `lighter ${font_size}px Courier, monospace`;
               ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
               ctx.strokeOpacity = 0.5
               ctx.textAlign = 'top';
               const text_pos_x = leftmost + 1
               const text_pos_y = base_y + font_size + 1
               ctx.strokeText(`${member.orbital}`, text_pos_x, text_pos_y);
            }
            if (base_y < least_base_y) {
               least_base_y = base_y
            }
         })
         // console.log('family', family, leftmost, wrapper_height_px)
      })

      setTimeout(() => {
         let new_height_scalar = height_scalar
         if (least_base_y > 5) {
            new_height_scalar = height_scalar * GRADUAL_FACTOR_CHANGE
         } else if (least_base_y < 5) {
            new_height_scalar = height_scalar / GRADUAL_FACTOR_CHANGE
         }
         this.setState({
            orbital_bins,
            families,
            highest_family_count,
            height_scalar: new_height_scalar,
            canvas_buffer_width: canvas_buffer.length
         })
      }, 50)
      return true
   }

   render() {
      const {canvas_ref, wrapper_height_px, wrapper_width_px} = this.state
      const wrapper_style = {width: wrapper_width_px, height: wrapper_height_px};
      return <styles.ContentWrapper style={wrapper_style}>
         <styles.FamilySpanCanvas
            ref={canvas_ref}
            width={wrapper_width_px}
            height={wrapper_height_px}
         />
      </styles.ContentWrapper>
   }
}

export default FieldsFamilySpan;
