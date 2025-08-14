export const api = {
  async topCoins() {
    const url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=true&price_change_percentage=24h";
    const r = await fetch(url);
    return r.json();
  },
  async coinDetail(id) {
    const url = `https://api.coingecko.com/api/v3/coins/${id}?localization=false&market_data=true`;
    const r = await fetch(url);
    return r.json();
  },
  async coinChart7d(id) {
    const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=7`;
    const r = await fetch(url);
    return r.json();
  },
  async simplePrice(id) {
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
    return r.json();
  }
};