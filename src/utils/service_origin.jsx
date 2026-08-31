export const service_origin = port => {
   if (typeof window === 'undefined') return `http://localhost:${port}`
   const origin = new URL(window.location.origin)
   origin.port = `${port}`
   return origin.origin
}

export default service_origin
