import {Component, createRef} from 'react'
import PropTypes from 'prop-types'

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import {load_logs_data, relative_time, render_lines} from '../console_render.jsx'
import AppSettings from '../../AppSettings.jsx'
import AppText from '../../AppText.jsx'
import {
   KEY_LOG_AUTO_SCROLL,
   KEY_LOG_LOAD_ERROR,
   KEY_LOG_LOADING_FILE,
   KEY_LOG_CLEAR,
   KEY_LOG_LINES,
   KEY_LOG_MATCHES,
   KEY_LOG_NO_MATCHES,
   KEY_LOG_SEARCH,
   KEY_LOG_UPDATED,
   KEY_LOG_UPDATED_MOMENTS,
   KEY_LOG_SHOW_TIMESTAMPS,
} from '../../text/RootText.jsx'

const LOG_CONTROLS_HEIGHT_PX = 40

export class LogViewer extends Component {
   static propTypes = {
      port: PropTypes.number.isRequired,
      splitter_key: PropTypes.string.isRequired,
      timestamp_key: PropTypes.string.isRequired,
      title: PropTypes.node,
      refresh_interval_ms: PropTypes.number,
   }

   static defaultProps = {
      title: null,
      refresh_interval_ms: 1000,
   }

   state = {logs_data: {}, interval: null, error: null, auto_scroll: true, show_timestamps: true, last_refreshed_at: null, search_text: ''}
   console_ref = createRef()
   auto_scrolling = false

   componentDidMount() {
      this.refresh()
      this.setState({
         interval: setInterval(this.refresh, this.props.refresh_interval_ms),
         show_timestamps: AppSettings.get(this.props.timestamp_key),
      })
   }

   componentWillUnmount() {
      if (this.state.interval) clearInterval(this.state.interval)
      this.unmounted = true
   }

   refresh = async () => {
      try {
         const logs_data = await load_logs_data(this.props.port, this.props.splitter_key)
         if (!this.unmounted) this.setState({logs_data, error: null, last_refreshed_at: Date.now()})
      } catch (error) {
         if (!this.unmounted) this.setState({error: error.message})
      }
   }

   componentDidUpdate(previous_props, previous_state) {
      const logs_changed = previous_state.logs_data.console_lines !== this.state.logs_data.console_lines
      const auto_scroll_enabled = this.state.auto_scroll && !previous_state.auto_scroll
      if ((logs_changed || auto_scroll_enabled) && this.state.auto_scroll) {
         this.scroll_to_bottom()
      }
   }

   scroll_to_bottom = () => {
      const element = this.console_ref.current
      if (!element) return
      this.auto_scrolling = true
      element.scrollTop = element.scrollHeight
      setTimeout(() => { this.auto_scrolling = false }, 0)
   }

   disable_auto_scroll = () => {
      if (!this.auto_scrolling && this.state.auto_scroll) this.setState({auto_scroll: false})
   }

   toggle_auto_scroll = event => {
      this.setState({auto_scroll: event.target.checked})
   }

   toggle_timestamps = event => {
      const show_timestamps = event.target.checked
      AppSettings.on_settings_changed({[this.props.timestamp_key]: show_timestamps})
      this.setState({show_timestamps})
   }

   rendered_lines = () => {
      const records = this.state.logs_data.records || []
      const lines = records.map(record => record.statement || record.message)
      const timestamps = this.state.show_timestamps
         ? records.map(record => record.timestamp)
         : []
      const styled_segments = records.map(record => record.segments)
      const levels = records.map(record => record.level)
      return render_lines(lines, timestamps, styled_segments, levels, this.state.search_text)
   }

   update_search = event => {
      this.setState({search_text: event.target.value})
   }

   clear_search = () => {
      this.setState({search_text: ''})
   }

   search_summary = () => {
      const search_term = this.state.search_text
      if (search_term.length < 3) return null
      const escaped_term = search_term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const matcher = new RegExp(escaped_term, 'gi')
      let match_count = 0
      let line_count = 0
      const records = this.state.logs_data.records || []
      records.forEach(record => {
         const message = String(record.statement || record.message || '')
         const matches = message.match(matcher) || []
         match_count += matches.length
         if (matches.length) line_count += 1
      })
      if (!match_count) return <em>{AppText.get(KEY_LOG_NO_MATCHES)}</em>
      const count_style = {fontFamily: 'monospace', fontWeight: 'bold'}
      return <>
         <span style={count_style}>{match_count}</span>{' '}
         <em>{AppText.get(KEY_LOG_MATCHES)} </em>
         <span style={count_style}>{line_count}</span>{' '}
         <em>{AppText.get(KEY_LOG_LINES)}</em>
      </>
   }

   updated_label = () => {
      const records = this.state.logs_data.records || []
      const last_message = [...records].reverse().find(record => record.timestamp)
      const updated_at = last_message?.timestamp || this.state.last_refreshed_at
      const time_ago = !updated_at || Date.now() - new Date(updated_at).getTime() < 60000
         ? AppText.get(KEY_LOG_UPDATED_MOMENTS)
         : relative_time(new Date(updated_at).toISOString())
      return <>
         <strong>{AppText.get(KEY_LOG_UPDATED)}:</strong>{' '}
         <em>{time_ago}</em>
      </>
   }

   render() {
      const {logs_data, error} = this.state
      const console_style = {
         height: `${Math.max(0, (logs_data.content_area?.height_px || 0) - LOG_CONTROLS_HEIGHT_PX)}px`,
         maxWidth: `${logs_data.content_area?.width_px || 0}px`,
         paddingBottom: '1rem',
         overflowX: 'auto',
         overflowY: 'scroll',
      }
      return <>
         {this.props.title}
         <styles.CenteredBlock>
            <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', margin: '0.25rem auto', fontSize: '0.8rem'}}>
               <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <label style={{marginLeft: '0.5rem', textTransform: 'uppercase'}}>
                     <input
                        type="checkbox"
                        checked={this.state.auto_scroll}
                        onChange={this.toggle_auto_scroll}
                     />{' '}
                     {AppText.get(KEY_LOG_AUTO_SCROLL)}
                  </label>
                  <label style={{textTransform: 'uppercase'}}>
                     <input
                        type="checkbox"
                        checked={this.state.show_timestamps}
                        onChange={this.toggle_timestamps}
                     />{' '}
                     {AppText.get(KEY_LOG_SHOW_TIMESTAMPS)}
                  </label>
                  <input
                     type="search"
                     value={this.state.search_text}
                     placeholder={AppText.get(KEY_LOG_SEARCH)}
                     onChange={this.update_search}
                  />
                  <button type="button" onClick={this.clear_search}>
                     {AppText.get(KEY_LOG_CLEAR)}
                  </button>
                  {this.search_summary() && <span>{this.search_summary()}</span>}
               </div>
               <div style={{textAlign: 'right', lineHeight: '1rem', marginRight: '1rem'}}>
                  <styles.FilenameWrapper style={{margin: 0, color: 'black'}}>
                     {logs_data.logfile_name || AppText.get(KEY_LOG_LOADING_FILE)}
                  </styles.FilenameWrapper>
                  <div>{this.updated_label()}</div>
               </div>
            </div>
            <styles.CenteredBlock
               ref={this.console_ref}
               style={console_style}
               onClick={this.disable_auto_scroll}
               onScroll={() => {
                  if (!this.auto_scrolling) this.disable_auto_scroll()
               }}>
            {error && <div style={{color: '#b22222', fontStyle: 'italic', fontWeight: 'bold'}}>
               {AppText.get(KEY_LOG_LOAD_ERROR)} {error}
            </div>}
            <styles.ConsoleWrapper>
               {this.rendered_lines()}
               <styles.ConsoleLine key="console-line-end">{' '}</styles.ConsoleLine>
            </styles.ConsoleWrapper>
            </styles.CenteredBlock>
         </styles.CenteredBlock>
      </>
   }
}

export default LogViewer
