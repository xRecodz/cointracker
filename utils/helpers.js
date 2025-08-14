export const CHAINS = {
  ethereum: { cgId: "ethereum", symbol: "ETH", chainIdHex: "0x1" },
  bsc: { cgId: "binancecoin", symbol: "BNB", chainIdHex: "0x38" },
  polygon: { cgId: "matic-network", symbol: "MATIC", chainIdHex: "0x89" },
};

export const fmtUSD = (n) => n?.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
export const cls = (...a) => a.filter(Boolean).join(' ');