/** Performs a JSON request and rejects non-2xx responses.
 * @param {string} url Absolute or UI-relative request URL.
 * @param {Object} [options={}] Fetch options.
 * @returns {Promise<*>} Parsed JSON response body.
 * @calledBy all backend service clients
 */
export const request_json = async (url, options = {}) => {
  const response = await fetch(url, { credentials: "include", ...options });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code =
      typeof result?.error === "string" ? result.error : result?.error?.code;
    const detail = typeof code === "string" ? `: ${code}` : "";
    const error = new Error(`HTTP ${response.status}${detail}`);
    error.status = response.status;
    if (typeof code === "string") error.code = code;
    throw error;
  }
  return result;
};

/** Encodes an object as a URL query string.
 * @param {Object} params Primitive query values.
 * @returns {string} URLSearchParams-compatible encoded query string.
 * @calledBy backend clients as needed
 */
export const query_string = (params) => new URLSearchParams(params).toString();
