const DEFAULT_TO_JSON = () => ({});
export const setProxyDefaultProperty = (proxyObj: object) => {
    // JSON.stringfy
    (proxyObj as any).toJSON = DEFAULT_TO_JSON;
    // ignore promise check
    (proxyObj as any).then = undefined;
};
