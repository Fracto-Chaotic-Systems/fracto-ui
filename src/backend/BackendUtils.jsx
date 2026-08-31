/** Performs a JSON request and rejects non-2xx responses.
 * @param {string} url Absolute or UI-relative request URL.
 * @param {Object} [options={}] Fetch options.
 * @returns {Promise<*>} Parsed JSON response body.
 * @calledBy all backend service clients
 */
export const request_json = async (url, options = {}) => {
   const response = await fetch(url, options)
   if (!response.ok) throw new Error(`HTTP ${response.status}`)
   return response.json()
}

/** Encodes an object as a URL query string.
 * @param {Object} params Primitive query values.
 * @returns {string} URLSearchParams-compatible encoded query string.
 * @calledBy backend clients as needed
 */
export const query_string = params => new URLSearchParams(params).toString()
