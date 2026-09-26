import { request_json } from "./BackendUtils.jsx";
import { service_origin } from "../utils/service_origin.jsx";

const MAIN_ORIGIN = () => service_origin("main");

/** Read the current server-side authentication session. */
export const load_auth_session = () =>
  request_json(`${MAIN_ORIGIN()}/auth/session`, {
    credentials: "include",
  });

/** Start the provider login redirect. */
export const start_auth_login = () => {
  window.location.assign(`${MAIN_ORIGIN()}/auth/login?return_to=%2Fstudy`);
};

/** Invalidate the current server-side authentication session. */
export const logout_auth_session = () =>
  request_json(`${MAIN_ORIGIN()}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

export const AuthBackend = {
  load_auth_session,
  start_auth_login,
  logout_auth_session,
};

export default AuthBackend;
