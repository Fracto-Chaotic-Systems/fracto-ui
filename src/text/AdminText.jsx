const ADMIN_FOLDER = 'admin'

export const KEY_OPERATOR_NAME_LABEL = `${ADMIN_FOLDER}/operator_name_label`
export const KEY_OPERATOR_NAME_PROMPT = `${ADMIN_FOLDER}/operator_name_prompt`
export const KEY_OPERATOR_EMAIL_LABEL = `${ADMIN_FOLDER}/operator_email_label`
export const KEY_OPERATOR_EMAIL_PROMPT = `${ADMIN_FOLDER}/operator_email_prompt`
export const KEY_OPERATOR_CONSENT_LABEL = `${ADMIN_FOLDER}/operator_consent`
export const KEY_IDENTIFY_TITLE = `${ADMIN_FOLDER}/identify`
export const KEY_ADMIN_OVERVIEW = `${ADMIN_FOLDER}/admin_overview`
export const KEY_ADMIN_SETTINGS = `${ADMIN_FOLDER}/admin_settings`
export const KEY_ADMIN_STATUS = `${ADMIN_FOLDER}/admin_status`
export const KEY_ADMIN_LOGS = `${ADMIN_FOLDER}/admin_logs`
export const KEY_ADMIN_IDENTITY_FORM_TITLE = `${ADMIN_FOLDER}/identity_form_title`
export const KEY_ADMIN_IDENTITY_FORM_SAVE = `${ADMIN_FOLDER}/identity_form_save`
export const KEY_ADMIN_IDENTITY_FORM_SUBTITLE =`${ADMIN_FOLDER}/identity_form_subtitle`

export const APP_ADMIN_TEXT = {
   [KEY_IDENTIFY_TITLE]: 'Identify',
   [KEY_OPERATOR_NAME_LABEL]: 'Operator Name',
   [KEY_OPERATOR_NAME_PROMPT]: 'may be phony',
   [KEY_OPERATOR_EMAIL_LABEL]: 'Operator Email',
   [KEY_OPERATOR_EMAIL_PROMPT]: 'must be real',
   [KEY_OPERATOR_CONSENT_LABEL]: 'Clicking this checkbox has no affect. The intention is to enable consent but in a court of law it has no standing whatsoever. However, clicking it will allow you to continue using the application, so it may be worth your while to do so',
   [KEY_ADMIN_OVERVIEW]: 'admin overview',
   [KEY_ADMIN_SETTINGS]: 'admin settings',
   [KEY_ADMIN_STATUS]: 'admin status',
   [KEY_ADMIN_LOGS]: 'admin logs',
   [KEY_ADMIN_IDENTITY_FORM_TITLE]: 'Operator Identification System',
   [KEY_ADMIN_IDENTITY_FORM_SUBTITLE]: 'Enter this basic information to begin using Fracto',
   [KEY_ADMIN_IDENTITY_FORM_SAVE]: 'Save Operator Details',
}
