
export const getViewportDimensions = () => {
   let viewport = {}
   if (typeof window.innerWidth != 'undefined') {
      viewport.width = window.innerWidth;
      viewport.height = window.innerHeight;
   } else if (typeof document.documentElement !== 'undefined' && typeof document.documentElement.clientWidth !== 'undefined' && document.documentElement.clientWidth !== 0) {
      viewport.width = document.documentElement.clientWidth;
      viewport.height = document.documentElement.clientHeight;
   } else {
      viewport.width = document.getElementsByTagName('body')[0].clientWidth;
      viewport.height = document.getElementsByTagName('body')[0].clientHeight;
   }
   return viewport;
}

export const copy_json = (json) => {
   return JSON.parse(JSON.stringify(json));
}
