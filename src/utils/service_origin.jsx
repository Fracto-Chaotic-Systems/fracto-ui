/** Builds a service URL using the browser's current host and a service port.
 * @param {number} port Target service port.
 * @returns {string} Origin suitable for endpoint URL construction.
 * @calledBy all browser-side backend clients
 * @note The localhost fallback is only for non-browser tooling; browser calls preserve the remote hostname.
 */
export const service_origin = port => {
   if (typeof window === 'undefined') return `http://localhost:${port}`
   const origin = new URL(window.location.origin)
   origin.port = `${port}`
   return origin.origin
}

export default service_origin
