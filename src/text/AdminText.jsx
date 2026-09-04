import {KEY_SERVER_ROOT} from "../settings/RootSettings.jsx";

const ADMIN_FOLDER = 'admin'

export const KEY_OPERATOR_NAME_LABEL = `${ADMIN_FOLDER}/operator_name_label`
export const KEY_OPERATOR_NAME_PROMPT = `${ADMIN_FOLDER}/operator_name_prompt`
export const KEY_OPERATOR_EMAIL_LABEL = `${ADMIN_FOLDER}/operator_email_label`
export const KEY_OPERATOR_EMAIL_PROMPT = `${ADMIN_FOLDER}/operator_email_prompt`
export const KEY_SERVER_ROOT_LABEL = `${ADMIN_FOLDER}/server_root_label`
export const KEY_SERVER_ROOT_PROMPT = `${ADMIN_FOLDER}/server_root_prompt`
export const KEY_OPERATOR_CONSENT_LABEL = `${ADMIN_FOLDER}/operator_consent`
export const KEY_IDENTIFY_TITLE = `${ADMIN_FOLDER}/identify`
export const KEY_COMMITS_TITLE = `${ADMIN_FOLDER}/commits`
export const KEY_ADMIN_OVERVIEW = `${ADMIN_FOLDER}/admin_overview`
export const KEY_ADMIN_SETTINGS = `${ADMIN_FOLDER}/admin_settings`
export const KEY_ADMIN_STATUS = `${ADMIN_FOLDER}/admin_status`
export const KEY_ADMIN_STATUS_REFRESH = `${ADMIN_FOLDER}/admin_status_refresh`
export const KEY_ADMIN_COMMITS_TITLE = `${ADMIN_FOLDER}/admin_commits`
export const KEY_ADMIN_LOGS = `${ADMIN_FOLDER}/admin_logs`
export const KEY_ADMIN_COMMITS_LOADING = `${ADMIN_FOLDER}/admin_commits_loading`
export const KEY_ADMIN_COMMITS_ERROR = `${ADMIN_FOLDER}/admin_commits_error`
export const KEY_ADMIN_COMMIT_REPOSITORY = `${ADMIN_FOLDER}/commit_repository`
export const KEY_ADMIN_COMMIT_HASH = `${ADMIN_FOLDER}/commit_hash`
export const KEY_ADMIN_COMMIT_DATE = `${ADMIN_FOLDER}/commit_date`
export const KEY_ADMIN_COMMIT_AUTHOR = `${ADMIN_FOLDER}/commit_author`
export const KEY_ADMIN_COMMIT_MESSAGE = `${ADMIN_FOLDER}/commit_message`
export const KEY_ADMIN_COMMIT_FILES = `${ADMIN_FOLDER}/commit_files`
export const KEY_ADMIN_COMMIT_CREATED = `${ADMIN_FOLDER}/commit_created`
export const KEY_ADMIN_COMMIT_REMOVED = `${ADMIN_FOLDER}/commit_removed`
export const KEY_ADMIN_COMMIT_CHANGES = `${ADMIN_FOLDER}/commit_changes`
export const KEY_ADMIN_COMMIT_INSERTED = `${ADMIN_FOLDER}/commit_inserted`
export const KEY_ADMIN_COMMIT_DELETED = `${ADMIN_FOLDER}/commit_deleted`
export const KEY_ADMIN_REPOSITORY_MAIN = `${ADMIN_FOLDER}/repository_main`
export const KEY_ADMIN_REPOSITORY_ADMIN = `${ADMIN_FOLDER}/repository_admin`
export const KEY_ADMIN_REPOSITORY_DATA = `${ADMIN_FOLDER}/repository_data`
export const KEY_ADMIN_REPOSITORY_TILES = `${ADMIN_FOLDER}/repository_tiles`
export const KEY_ADMIN_REPOSITORY_ASSETS = `${ADMIN_FOLDER}/repository_assets`
export const KEY_ADMIN_REPOSITORY_UI = `${ADMIN_FOLDER}/repository_ui`
export const KEY_ADMIN_IDENTITY_FORM_TITLE = `${ADMIN_FOLDER}/identity_form_title`
export const KEY_ADMIN_IDENTITY_FORM_SAVE = `${ADMIN_FOLDER}/identity_form_save`
export const KEY_ADMIN_IDENTITY_FORM_SUBTITLE =`${ADMIN_FOLDER}/identity_form_subtitle`

export const APP_ADMIN_TEXT = {
   [KEY_IDENTIFY_TITLE]: 'Identify',
   [KEY_COMMITS_TITLE]: 'Commits',
   [KEY_OPERATOR_NAME_LABEL]: 'Operator Name',
   [KEY_OPERATOR_NAME_PROMPT]: 'may be phony',
   [KEY_OPERATOR_EMAIL_LABEL]: 'Operator Email',
   [KEY_SERVER_ROOT_LABEL]: 'Server Root Path',
   [KEY_SERVER_ROOT_PROMPT]: 'must be real',
   [KEY_OPERATOR_EMAIL_PROMPT]: 'must be real',
   [KEY_OPERATOR_CONSENT_LABEL]: 'Clicking this checkbox has no affect. The intention is to enable consent but in a court of law it has no standing whatsoever. However, clicking it will allow you to continue using the application, so it may be worth your while to do so',
   [KEY_ADMIN_OVERVIEW]: 'admin overview',
   [KEY_ADMIN_SETTINGS]: 'admin settings',
   [KEY_ADMIN_STATUS]: 'admin status',
   [KEY_ADMIN_STATUS_REFRESH]: 'refresh status',
   [KEY_ADMIN_COMMITS_TITLE]: 'commits',
   [KEY_ADMIN_LOGS]: 'admin logs',
   [KEY_ADMIN_COMMITS_LOADING]: 'loading commits...',
   [KEY_ADMIN_COMMITS_ERROR]: 'unable to load commits:',
   [KEY_ADMIN_COMMIT_REPOSITORY]: 'repository',
   [KEY_ADMIN_COMMIT_HASH]: 'hash',
   [KEY_ADMIN_COMMIT_DATE]: 'date',
   [KEY_ADMIN_COMMIT_AUTHOR]: 'author',
   [KEY_ADMIN_COMMIT_MESSAGE]: 'message',
   [KEY_ADMIN_COMMIT_FILES]: 'files',
   [KEY_ADMIN_COMMIT_CREATED]: 'created',
   [KEY_ADMIN_COMMIT_REMOVED]: 'removed',
   [KEY_ADMIN_COMMIT_CHANGES]: 'changes',
   [KEY_ADMIN_COMMIT_INSERTED]: 'inserted',
   [KEY_ADMIN_COMMIT_DELETED]: 'deleted',
   [KEY_ADMIN_REPOSITORY_MAIN]: 'main',
   [KEY_ADMIN_REPOSITORY_ADMIN]: 'admin',
   [KEY_ADMIN_REPOSITORY_DATA]: 'data',
   [KEY_ADMIN_REPOSITORY_TILES]: 'tiles',
   [KEY_ADMIN_REPOSITORY_ASSETS]: 'assets',
   [KEY_ADMIN_REPOSITORY_UI]: 'UI',
   [KEY_ADMIN_IDENTITY_FORM_TITLE]: 'Operator Identification System',
   [KEY_ADMIN_IDENTITY_FORM_SUBTITLE]: 'Enter this basic information to begin using Fracto',
   [KEY_ADMIN_IDENTITY_FORM_SAVE]: 'Save Operator Details',
}
