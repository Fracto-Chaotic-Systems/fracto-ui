export const request_json = async (url, options = {}) => {
   const response = await fetch(url, options)
   if (!response.ok) throw new Error(`HTTP ${response.status}`)
   return response.json()
}

export const query_string = params => new URLSearchParams(params).toString()
