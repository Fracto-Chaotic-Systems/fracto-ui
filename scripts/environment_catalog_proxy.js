import {create_http_proxy} from "@fracto/sdk/utils/HttpProxy.js";
export const create_environment_catalog_proxy = () => create_http_proxy({origin:()=>`http://127.0.0.1:${Number(process.env.FRACTO_ASSET_PORT||3003)}`,prefix:"/environment-catalog",error:"catalog_unavailable"});
