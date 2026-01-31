/**
 * 运行时配置
 * 统一管理 REST/WS 基础地址，便于环境切换
 */

const normalizeBase = (value: string) => {
  if (value.endsWith('/')) return value.slice(0, -1);
  return value;
};

export const runtimeConfig = {
  apiBase: normalizeBase(import.meta.env.VITE_API_BASE || '/api'),
  wsBase: import.meta.env.VITE_WS_BASE || 'wss://stream.binance.com:9443/ws',
};
