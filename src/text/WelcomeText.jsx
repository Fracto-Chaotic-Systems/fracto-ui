const WELCOME_FOLDER = "welcome";

export const KEY_WELCOME_TITLE = `${WELCOME_FOLDER}/title`;
export const KEY_WELCOME_START = `${WELCOME_FOLDER}/start`;
export const KEY_WELCOME_NO_IMAGES = `${WELCOME_FOLDER}/no_images`;
export const KEY_WELCOME_CHECKING_ACCESS = `${WELCOME_FOLDER}/checking_access`;
export const KEY_WELCOME_SIGN_IN = `${WELCOME_FOLDER}/sign_in`;
export const KEY_WELCOME_SIGN_OUT = `${WELCOME_FOLDER}/sign_out`;
export const KEY_WELCOME_SIGNED_IN_AS = `${WELCOME_FOLDER}/signed_in_as`;
export const KEY_WELCOME_ACCESS_DENIED = `${WELCOME_FOLDER}/access_denied`;
export const KEY_WELCOME_AUTH_ERROR = `${WELCOME_FOLDER}/auth_error`;

export const APP_WELCOME_TEXT = {
  [KEY_WELCOME_TITLE]: "fracto",
  [KEY_WELCOME_START]: "the atlas of chaos",
  [KEY_WELCOME_NO_IMAGES]: "welcome images are currently unavailable",
  [KEY_WELCOME_CHECKING_ACCESS]: "checking access...",
  [KEY_WELCOME_SIGN_IN]: "sign in",
  [KEY_WELCOME_SIGN_OUT]: "sign out",
  [KEY_WELCOME_SIGNED_IN_AS]: "signed in as",
  [KEY_WELCOME_ACCESS_DENIED]:
    "your account is recognized, but access has not been enabled",
  [KEY_WELCOME_AUTH_ERROR]: "unable to verify access",
};
