export const API_URL = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? `http://${window.location.hostname}:10000`
    : window.location.origin;
export const WS_URL = (API_URL.replace(/^http/, 'ws')) + "/ws";

