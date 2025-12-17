
const ADMIN_FOLDER = 'admin'

export const KEY_OPERATOR_NAME_PROMPT = `${ADMIN_FOLDER}/operator_name_text`
export const KEY_OPERATOR_EMAIL_PROMPT = `${ADMIN_FOLDER}/operator_email_text`
export const KEY_OPERATOR_CONSENT_PROMPT = `${ADMIN_FOLDER}/operator_consent`
export const KEY_IDENTIFY_TITLE = `${ADMIN_FOLDER}/identify`

export const APP_ADMIN_TEXT = {
   [KEY_IDENTIFY_TITLE]: 'Identify',
   [KEY_OPERATOR_NAME_PROMPT]: 'Operator Name',
   [KEY_OPERATOR_EMAIL_PROMPT]: 'Operator Email',
   [KEY_OPERATOR_CONSENT_PROMPT]: 'Clicking this checkbox has no affect. The intention is to enable consent but in a court of law it has no standing whatsoever. However, clicking it will allow you to continue using the application, so it may be worth your while to do so'
}
