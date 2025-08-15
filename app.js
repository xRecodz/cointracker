const { useEffect, useState } = React;

const api = {
  async coins(params = "") {
    return (await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd${params}&order=market_cap_desc&per_page=12&page=1&sparkline=true&price_change_percentage=24h`
    )).json();
  },
  async simplePrice(id) {
    return (await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`
    )).json();
  },
  async history(id, days = 30) {
    return (await fetch(
      `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`
    )).json();
  },
  async trending() {
    return (await fetch(`https://api.coingecko.com/api/v3/search/trending`)).json();
  }
};

const CHAINS = {
  ethereum: { cgId: "ethereum", symbol: "ETH" },
  bsc: { cgId: "binancecoin", symbol: "BNB" },
  polygon: { cgId: "matic-network", symbol: "MATIC" }
};

const fmtUSD = n =>
  n?.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });

const sparkInstances = {};

function App() {
  const [coins, setCoins] = useState([]);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [chartInstance, setChartInstance] = useState(null);

  useEffect(() => {
    themeInit();
    menuInit();
    chainInit();
    connectWalletInit();
    loadTopCoins();

    const iv = setInterval(loadTopCoins, 60000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (coins.length > 0) coins.forEach(c => buildSparkline(c));
  }, [coins]);

  async function loadTopCoins() {
    const data = await api.coins();
    setCoins(data);
    buildTicker(data);
  }

  async function loadRWACoins() {
    const rwaIds = "chainlink,maker";
    const data = await api.coins(`&ids=${rwaIds}`);
    setCoins(data);
    buildTicker(data);
  }

  async function loadTrendingCoins() {
    const data = await api.trending();
    const ids = data.coins.map(c => c.item.id).join(",");
    const trendingData = await api.coins(`&ids=${ids}`);
    setCoins(trendingData);
    buildTicker(trendingData);
  }

  async function loadMyAssets() {
    const data = await api.coins("&ids=bitcoin,ethereum");
    setCoins(data);
    buildTicker(data);
  }

  async function openCoinModal(coin) {
    setSelectedCoin(coin);
    const history = await api.history(coin.id, 30);
    const labels = history.prices.map(p => new Date(p[0]).toLocaleDateString());
    const prices = history.prices.map(p => p[1]);

    if (chartInstance) chartInstance.destroy();
    const ctx = document.getElementById("cryptoChart").getContext("2d");
    const newChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          data: prices,
          borderColor: "#F4C542",
          backgroundColor: "rgba(244,197,66,0.1)",
          fill: true,
          tension: 0.3
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
    setChartInstance(newChart);
    document.getElementById("coinModal").classList.remove("hidden");
  }

  function closeModal() {
    document.getElementById("coinModal").classList.add("hidden");
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {coins.map((c) => (
          <div
            key={c.id}
            onClick={() => openCoinModal(c)}
            className="rounded-2xl bg-neutral-900/50 border border-white/10 p-4 cursor-pointer hover:bg-neutral-800/50 transition flex flex-col"
          >
            <div className="flex items-center gap-2">
              <img src={c.image} alt={c.symbol} className="h-7 w-7 rounded-full" />
              <span className="font-semibold">{c.name}</span>
              <span className="ml-auto font-semibold">{fmtUSD(c.current_price)}</span>
            </div>
            <div className={`text-sm mt-1 ${c.price_change_percentage_24h >= 0 ? "text-green-400" : "text-red-400"}`}>
              {c.price_change_percentage_24h?.toFixed(2)}%
            </div>
            <div className="h-10 mt-2">
              <canvas id={`spark-${c.id}`}></canvas>
            </div>
          </div>
        ))}
      </div>

      <div id="coinModal" className="hidden fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-neutral-900 p-6 rounded-xl border border-white/10 max-w-2xl w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">{selectedCoin?.name}</h2>
            <button onClick={closeModal} className="text-white text-xl">✖</button>
          </div>
          <canvas id="cryptoChart" height="200"></canvas>
          {selectedCoin && (
            <div className="mt-4 text-sm text-neutral-300">
              <p>Market Cap: {fmtUSD(selectedCoin.market_cap)}</p>
              <p>Volume 24h: {fmtUSD(selectedCoin.total_volume)}</p>
              <p>Circulating Supply: {selectedCoin.circulating_supply?.toLocaleString()} {selectedCoin.symbol.toUpperCase()}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function buildSparkline(coin) {
  const ctx = document.getElementById(`spark-${coin.id}`);
  if (!ctx) return;
  if (sparkInstances[coin.id]) sparkInstances[coin.id].destroy();
  if (!coin.sparkline_in_7d) return;
  sparkInstances[coin.id] = new Chart(ctx, {
    type: 'line',
    data: { labels: coin.sparkline_in_7d.price.map((_, i) => i),
      datasets: [{ data: coin.sparkline_in_7d.price, borderColor: coin.price_change_percentage_24h >= 0 ? "#4ade80" : "#f87171", borderWidth: 1, pointRadius: 0, fill: false, tension: 0.3 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
  });
}

function themeInit() {
  const root = document.documentElement;
  const btn = document.getElementById("themeToggle");
  if (!btn) return;
  let saved = localStorage.getItem("theme");
  if (saved === "light") root.classList.remove("dark");
  else root.classList.add("dark");
  btn.onclick = () => {
    const isDark = root.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  };
}

function menuInit() {
  const sidebar = document.getElementById("sidebar");

  document.querySelectorAll("#sidebar a[data-action]").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const act = link.dataset.action;
      if (act === "my-assets") loadMyAssets();
      if (act === "top-coins") loadTopCoins();
      if (act === "top-rwa") loadRWACoins();
      if (act === "trending") loadTrendingCoins();
      if (window.innerWidth < 768) {
        sidebar.classList.add("-translate-x-full");
      }
    });
  });
}

function chainInit() {
  const btn = document.getElementById("chainBtn");
  const menu = document.getElementById("chainMenu");
  const nameEl = document.getElementById("chainName");
  const iconEl = document.getElementById("chainIcon");
  btn.onclick = () => menu.classList.toggle("hidden");
  menu.querySelectorAll("button").forEach(item => {
    item.onclick = async () => {
      const [key, , sym, chainId, icon] = item.dataset.chain.split("|");
      nameEl.textContent = sym === "ETH" ? "Ethereum" : sym;
      iconEl.src = icon;
      menu.classList.add("hidden");
      if (window.ethereum) {
        try {
          await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
        } catch (err) { console.error(err); }
      }
      refreshBalance(key);
    };
  });
  document.addEventListener("click", (e) => { if (!btn.contains(e.target) && !menu.contains(e.target)) menu.classList.add("hidden"); });
}

function connectWalletInit() {
  const connectBtn = document.getElementById("connectBtn");
  const profile = document.getElementById("walletProfile");
  const walletBtn = document.getElementById("walletBtn");
  const walletBalanceText = document.getElementById("walletBalanceText");
  const addrShort = document.getElementById("walletAddrShort");
  const dropdown = document.getElementById("walletDropdown");

  connectBtn.onclick = async () => {
    if (!window.ethereum) return alert("MetaMask not found");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      const balance = await provider.getBalance(addr);
      const eth = parseFloat(ethers.formatEther(balance));
      const cgId = CHAINS.ethereum.cgId;
      const price = (await api.simplePrice(cgId))[cgId].usd;
      const usdValue = fmtUSD(eth * price);

      walletBalanceText.textContent = usdValue;
      addrShort.textContent = addr.slice(0, 6) + "..." + addr.slice(-4);

      connectBtn.classList.add("hidden");
      profile.classList.remove("hidden");
    } catch (err) {
      console.error(err);
    }
  };

  walletBtn.onclick = () => {
    dropdown.classList.toggle("hidden");
  };

  document.getElementById("disconnectWallet").onclick = () => {
    profile.classList.add("hidden");
    dropdown.classList.add("hidden");
    connectBtn.classList.remove("hidden");
  };

  document.addEventListener("click", (e) => {
    if (!walletBtn.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add("hidden");
    }
  });
}

async function refreshBalance(key) {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const wei = await provider.getBalance(await signer.getAddress());
    const eth = parseFloat(ethers.formatEther(wei));
    const cgId = CHAINS[key]?.cgId || "ethereum";
    const price = (await api.simplePrice(cgId))[cgId].usd;
    document.getElementById("walletBalance").textContent = fmtUSD(eth * price);
  } catch (e) { console.error(e); }
}

function buildTicker(data) {
  const inner = document.getElementById("tickerInner");
  inner.innerHTML = "";
  function createRow() {
    const row = document.createElement("div");
    row.className = "inline-flex gap-6 items-center";
    data.forEach(c => {
      const up = c.price_change_percentage_24h >= 0;
      const el = document.createElement("button");
      el.className = `inline-flex items-center gap-1 px-1 ${up ? "text-green-400" : "text-red-400"} hover:underline`;
      el.innerHTML = `<img src="${c.image}" class="h-4 w-4 rounded-full"/>` +
                     `<span>${c.symbol.toUpperCase()}</span>` +
                     `<span>${fmtUSD(c.current_price)}</span>`;
      row.appendChild(el);
    });
    return row;
  }
  inner.appendChild(createRow());
  inner.appendChild(createRow());
  let x = 0;
  function step() {
    x -= 0.5;
    if (Math.abs(x) >= inner.firstChild.getBoundingClientRect().width) x = 0;
    inner.style.transform = `translateX(${x}px)`;
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

ReactDOM.createRoot(document.getElementById("app-root")).render(<App />);
