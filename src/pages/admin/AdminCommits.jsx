import React, {Component} from "react";
import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import AppText from "../../AppText.jsx";
import {KEY_ADMIN_COMMITS_TITLE} from "../../text/AdminText.jsx";
import AdminBackend from "../../backend/AdminBackend.jsx";
import AppSettings from "../../AppSettings.jsx";
import {KEY_ADMIN_COMMITS_REPOSITORY_VISIBILITY} from "../../settings/AdminSettings.jsx";
import CoolTable from "../../utils/ui/CoolTable.jsx";
import {CoolStyles} from "../../utils/ui/CoolImports.jsx";
import ReactTimeAgo from "react-time-ago";
import {CELL_ALIGN_CENTER, CELL_ALIGN_LEFT, CELL_ALIGN_RIGHT, CELL_TYPE_CALLBACK, CELL_TYPE_NUMBER, CELL_TYPE_TEXT} from "../../utils/ui/styles/CoolTableStyles.jsx";
import {
   KEY_ADMIN_COMMITS_ERROR,
   KEY_ADMIN_COMMITS_LOADING,
   KEY_ADMIN_COMMIT_CREATED,
   KEY_ADMIN_COMMIT_DATE,
   KEY_ADMIN_COMMIT_FILES,
   KEY_ADMIN_COMMIT_HASH,
   KEY_ADMIN_COMMIT_CHANGES,
   KEY_ADMIN_COMMIT_INSERTED,
   KEY_ADMIN_COMMIT_DELETED,
   KEY_ADMIN_COMMIT_MESSAGE,
   KEY_ADMIN_COMMIT_REMOVED,
   KEY_ADMIN_COMMIT_REPOSITORY,
   KEY_ADMIN_REPOSITORY_ADMIN,
   KEY_ADMIN_REPOSITORY_ASSETS,
   KEY_ADMIN_REPOSITORY_DATA,
   KEY_ADMIN_REPOSITORY_MAIN,
   KEY_ADMIN_REPOSITORY_TILES,
   KEY_ADMIN_REPOSITORY_UI,
} from "../../text/AdminText.jsx";

const TABLE_HEADER_SPACE_PX = 40
const MONOSPACE_CHARACTER_WIDTH_PX = 8
const COLUMN_HORIZONTAL_PADDING_PX = 16
const COMMIT_FIELDS = [
   ['repository', KEY_ADMIN_COMMIT_REPOSITORY, CELL_TYPE_TEXT, CELL_ALIGN_CENTER],
   ['hash', KEY_ADMIN_COMMIT_HASH, CELL_TYPE_TEXT, CELL_ALIGN_CENTER],
   ['date', KEY_ADMIN_COMMIT_DATE, CELL_TYPE_CALLBACK, CELL_ALIGN_CENTER],
   ['message', KEY_ADMIN_COMMIT_MESSAGE, CELL_TYPE_TEXT, CELL_ALIGN_LEFT],
   ['change_summary', KEY_ADMIN_COMMIT_CHANGES, CELL_TYPE_TEXT, CELL_ALIGN_LEFT],
]
const REPOSITORY_LABEL_KEYS = {
   fracto: KEY_ADMIN_REPOSITORY_MAIN,
   'fracto-admin-server': KEY_ADMIN_REPOSITORY_ADMIN,
   'fracto-data-server': KEY_ADMIN_REPOSITORY_DATA,
   'fracto-tiles-server': KEY_ADMIN_REPOSITORY_TILES,
   'fracto-asset-server': KEY_ADMIN_REPOSITORY_ASSETS,
   'fracto-ui': KEY_ADMIN_REPOSITORY_UI,
}
const REPOSITORY_NAMES = Object.keys(REPOSITORY_LABEL_KEYS)

const text_value = value => value === null || value === undefined ? '' : String(value)
const text_label = key => AppText.get(key) || key
const repository_label = repository => text_label(REPOSITORY_LABEL_KEYS[repository]) || repository
// Git's conventional abbreviated object name is seven hexadecimal characters.
const hash_label = hash => text_value(hash).slice(0, 7)
const render_commit_date = date => {
   const timestamp = new Date(date)
   return <span title={timestamp.toLocaleString()}>
      <ReactTimeAgo date={timestamp}/>
   </span>
}
const commit_columns = (commits, available_width) => {
   const intrinsic = COMMIT_FIELDS.map(([id, label_key]) => {
      const widest = Math.max(
         text_label(label_key).length,
         ...commits.map(commit => {
            if (id === 'repository') return repository_label(commit[id]).length
            if (id === 'hash') return hash_label(commit[id]).length
            if (id === 'date') return 'moments ago'.length
            return text_value(commit[id]).length
         }),
      )
      return Math.max(48, widest * MONOSPACE_CHARACTER_WIDTH_PX + COLUMN_HORIZONTAL_PADDING_PX)
   })
   const intrinsic_total = intrinsic.reduce((sum, width) => sum + width, 0)
   const target_width = Math.max(intrinsic_total, available_width || intrinsic_total)
   return COMMIT_FIELDS.map(([id, label_key, type, align], index) => {
      const width_px = Math.round(target_width * intrinsic[index] / intrinsic_total)
      return {
         id, label_key, type, align, width_px, max_width_px: width_px,
         style: {
            backgroundColor: 'white', fontFamily: 'monospace',
            // CoolTable is shared by dark and light surfaces. Keep this
            // table readable even when an ancestor supplies a light-text
            // color (the white cell background otherwise makes the rows
            // appear empty).
            color: 'black',
            whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word',
            overflow: 'visible', maxHeight: 'none', height: 'auto', verticalAlign: 'top',
         },
      }
   })
}

export class AdminCommits extends Component {

   state = {
      commits: [], commits_error: null, rendered_width: 0,
      repository_visibility: Object.fromEntries(REPOSITORY_NAMES.map(name => [name, true])),
      table_ref: React.createRef(),
   }

   componentDidMount() {
      const saved_visibility = AppSettings.get(KEY_ADMIN_COMMITS_REPOSITORY_VISIBILITY) || {}
      this.setState({
         repository_visibility: {
            ...this.state.repository_visibility,
            ...saved_visibility,
         },
      })
      this.update_width()
      AdminBackend.commits()
         .then(result => {
            const commits = Array.isArray(result?.commits) ? result.commits : []
            this.setState({commits}, this.update_width)
         })
         .catch(commits_error => {
            this.setState({commits_error})
         })
   }

   componentWillUnmount() {
      this.unmounted = true
   }

   update_width = () => {
      if (!this.unmounted && this.state.table_ref.current) {
         this.setState({rendered_width: this.state.table_ref.current.clientWidth})
      }
   }

   toggle_repository = repository => {
      this.setState(({repository_visibility}) => ({
         repository_visibility: {
            ...repository_visibility,
            [repository]: !repository_visibility[repository],
         },
      }), () => {
         AppSettings.on_settings_changed({
            [KEY_ADMIN_COMMITS_REPOSITORY_VISIBILITY]: this.state.repository_visibility,
         })
      })
   }

   render() {
      const {commits, commits_error, rendered_width, repository_visibility, table_ref} = this.state
      const visible_commits = commits.filter(commit => repository_visibility[commit.repository] !== false)
      const commit_rows = visible_commits.map(commit => ({
         ...commit,
         repository: repository_label(commit.repository),
         hash: hash_label(commit.hash),
         date: [render_commit_date, commit.date],
         change_summary: `${commit.files_changed} ${text_label(KEY_ADMIN_COMMIT_FILES)}: ` +
            `${commit.insertions} ${text_label(KEY_ADMIN_COMMIT_INSERTED)}, ` +
            `${commit.deletions} ${text_label(KEY_ADMIN_COMMIT_DELETED)}, ` +
            `${commit.files_created} ${text_label(KEY_ADMIN_COMMIT_CREATED)}, ` +
            `${commit.files_removed} ${text_label(KEY_ADMIN_COMMIT_REMOVED)}`,
      }))
      return <>
         <styles.SectionTitle
            key={'admin-commits-title'}>
            {AppText.get(KEY_ADMIN_COMMITS_TITLE)}
         </styles.SectionTitle>
         <CoolStyles.Block ref={table_ref} style={{width: '100%', overflow: 'hidden'}}>
            <CoolStyles.Block style={{height: `${TABLE_HEADER_SPACE_PX}px`, display: 'flex', alignItems: 'center', gap: '1rem', padding: '0 1rem'}}>
               {REPOSITORY_NAMES.map(repository => <label key={`repository-filter-${repository}`}>
                  <input
                     type="checkbox"
                     checked={repository_visibility[repository] !== false}
                     onChange={() => this.toggle_repository(repository)}
                  />{' '}{repository_label(repository)}
               </label>)}
            </CoolStyles.Block>
            {commits_error && <CoolStyles.Block>{AppText.get(KEY_ADMIN_COMMITS_ERROR)} {commits_error.message}</CoolStyles.Block>}
            {!commits_error && !commits.length && <CoolStyles.Block>{AppText.get(KEY_ADMIN_COMMITS_LOADING)}</CoolStyles.Block>}
            {!!commits.length && <CoolTable
               columns={commit_columns(commit_rows, rendered_width)}
               data={commit_rows}
               table_style={{width: '100%', backgroundColor: 'white', color: 'black'}}
            />}
         </CoolStyles.Block>
      </>
   }
}

export default AdminCommits
