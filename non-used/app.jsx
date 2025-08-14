import { useEffect, useState } from 'react';
import CoinCard from './components/CoinCard.js';
import { api } from './utils/api.js';
import { CHAINS, fmtUSD } from './utils/helpers.js';

function App() {
  const [dark, setDark] = useState(true);
  const [coins, setCoins] = useState([]);
  const [lastUpd, setLastUpd] = useState('');
  const [modal, setModal] = useState(null);
  const [wallet, setWallet] = useState({ address: null, balance: 0, usd: 0 });
  const [chainKey, setChainKey] = useState('ethereum');

  // Theme toggle
  useEffect(() => {
    const root = document.documentElement;
    dark ? root.classList.add('dark') : root.classList.remove('dark');
    const toggle = document.getElementById('themeToggle');
    toggle.onclick = () => setDark(d => !d);
  }, [dark]);

  // Fetch top coins and update ticker
  useEffect(() => {
    let stop = false;
    const fetchCoins = async () => {
      const data = await api.topCoins();
      if (stop) return;
      setCoins(data);
      setLastUpd(new Date().toLocaleTimeString());
      buildTicker(data);
    };
    fetchCoins();
    const interval = setInterval(fetchCoins, 60_000);
    return () => { stop = true; clearInterval(interval); };
  }, []);

  // Chain selector
  useEffect(() => {
    const el = document.getElementById('chainSelect');
    el.onchange = async (e) => {
      const [key, cg, sym] = e.target.value.split('|');
      setChainKey(key);
      document.getElementById('sym').textContent = sym;
      if (wallet.address) await refreshBalance(key);
    };
  }, [wallet.address]);

  // Wallet connect/disconnect
  useEffect(() => {
    const btn = document.getElementById('connectBtn');
    btn.onclick = async () => {
      if (wallet.address) {
        setWallet({ address: null, balance: 0, usd: 0 });
        document.getElementById('walletPanel').classList.add('hidden');
        btn.querySelector('span').textContent = 'Connect Wallet';
        return;
      }
      const injected = window.ethereum || window.okxwallet;
      if (!injected) {
        alert('Please install MetaMask or OKX Wallet.');
        return;
      }
      try {
        const provider = new ethers.BrowserProvider(injected);
        const signer = await provider.getSigner();
        const addr = await signer.getAddress();
        if (injected.request) await injected.request({ method: 'eth_requestAccounts' });
        document.getElementById('walletPanel').classList.remove('hidden');
        document.getElementById('addr').textContent = addr;
        btn.querySelector('span').textContent = 'Disconnect';
        setWallet(w => ({ ...w, address: addr }));
        await refreshBalance(chainKey);
      } catch (e) {
        console.error(e);
        alert('Failed to connect wallet.');
      }
    };
  }, [chainKey, wallet.address]);

  async function refreshBalance(key) {
    try {
      const injected = window.ethereum || window.okxwallet;
      const provider = new ethers.BrowserProvider(injected);
      const addr = (await provider.getSigner()).address;
      const wei = await provider.getBalance(addr);
      const eth = parseFloat(ethers.formatEther(wei));
      document.getElementById('bal').textContent = eth.toFixed(4);
      const cgId = CHAINS[key].cgId;
      const price = (await api.simplePrice(cgId))[cgId].usd;
      const usd = eth * price;
      document.getElementById('usd').textContent = fmtUSD(usd);
      setWallet({ address: addr, balance: eth, usd });
    } catch (e) {
      console.error('Balance error', e);
    }
  }

  async function openModal(coin) {
    document.getElementById('modal').classList.remove('hidden');
    document.getElementById('modalTitle').textContent = `${coin.name} (${coin.symbol.toUpperCase()})`;
    const detail = await api.coinDetail(coin.id);
    const chart = await api.coinChart7d(coin.id);
    const price = detail.market_data.current_price.usd;
    const chg = detail.market_data.price_change_percentage_24h;
    const mc = detail.market_data.market_cap.usd;
    const vol = detail.market_data.total_volume.usd;
    const isUp = chg >= 0;
    document.getElementById('m_price').textContent = fmtUSD(price);
    document.getElementById('m_change').textContent = `${isUp ? '▲' : '▼'} ${Math.abs(chg).toFixed(2)}%`;
    document.getElementById('m_change').className = `text-lg font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`;
    document.getElementById('m_mc').textContent = fmtUSD(mc);
    document.getElementById('m_vol').textContent = fmtUSD(vol);
    const ctx = document.getElementById('m_chart').getContext('2d');
    if (window.__modalChart) window.__modalChart.destroy();
    window.__modalChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chart.prices.map(p => new Date(p[0]).toLocaleDateString()),
        datasets: [{
          data: chart.prices.map(p => p[1]),
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.25,
          borderColor: '#8B5CF6' // Purple chart line
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { display: false }, grid: { display: false } },
          y: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,.05)' } }
        }
      }
    });
  }

  function buildTicker(data) {
    const inner = document.getElementById('tickerInner');
    inner.innerHTML = '';
    const row = document.createElement('div');
    row.className = 'inline-flex gap-6 items-center';
    data.forEach(c => {
      const up = c.price_change_percentage_24h >= 0;
      const el = document.createElement('button');
      el.className = 'inline-flex items-center gap-2 hover:underline';
      el.innerHTML = `
        <img src="${c.image}" class="h-4 w-4 rounded-full"/>
        <span class="text-xs">${c.symbol.toUpperCase()}</span>
        <span class="text-xs font-semibold">${fmtUSD(c.current_price)}</span>
        <span class="text-[11px] ${up ? 'text-green-400' : 'text-red-400'}">${up ? '▲' : '▼'} ${Math.abs(c.price_change_percentage_24h).toFixed(2)}%</span>`;
      el.onclick = () => openModal(c);
      row.appendChild(el);
    });
    const row2 = row.cloneNode(true);
    inner.appendChild(row);
    inner.appendChild(row2);
    let x = 0;
    function step() {
      x -= 0.5;
      if (Math.abs(x) >= row.getBoundingClientRect().width) x = 0;
      inner.style.transform = `translateX(${x}px)`;
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  window.closeModal = () => {
    document.getElementById('modal').classList.add('hidden');
  };

  return (
    <div id="grid" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {coins.map(c => (
        <CoinCard key={c.id} coin={c} onClick={() => openModal(c)} />
      ))}
    </div>
  );
}

export default App;