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

  // ==== ORIGINAL loadMyAssets ====
async function loadMyAssets() {
  const data = await api.coins("&ids=bitcoin,ethereum");
  setCoins(data);
  buildTicker(data);

  // ==== Tampilan awal dengan tombol wallet ====
  const root = document.getElementById("app-root");
  root.innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold">💼 My Assets</h2>
      <button id="walletActionBtn" class="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 px-4 rounded-lg shadow transition">
        Connect Wallet
      </button>
    </div>
    <div id="assetsContainer" class="grid gap-4"></div>
  `;

  const walletBtn = document.getElementById("walletActionBtn");
  const assetsContainer = document.getElementById("assetsContainer");

  const COVALENT_API_KEY = "YOUR_API_KEY"; // Ganti dengan API Key kamu
  const chainsList = [
    { name: "Ethereum", id: 1 },
    { name: "Binance Smart Chain", id: 56 },
    { name: "Polygon", id: 137 },
    { name: "Arbitrum One", id: 42161 },
    { name: "Optimism", id: 10 }
  ];

  // ==== Fungsi ambil data multi-chain ====
  async function loadAssetsMultiChain(address) {
    assetsContainer.innerHTML = `<div class="text-neutral-400 p-4">Mengambil data aset...</div>`;

    for (let chain of chainsList) {
      try {
        const res = await fetch(`https://api.covalenthq.com/v1/${chain.id}/address/${address}/balances_v2/?key=${COVALENT_API_KEY}`);
        const json = await res.json();

        if (!json.data?.items) continue;

        const section = document.createElement("div");
        section.className = "bg-neutral-900 border border-white/10 rounded-lg p-4";
        section.innerHTML = `<h3 class="text-lg font-bold mb-3">${chain.name}</h3>`;

        const tokens = json.data.items.filter(t => Number(t.balance) > 0);
        if (tokens.length === 0) {
          section.innerHTML += `<p class="text-neutral-500 text-sm">Tidak ada aset di jaringan ini.</p>`;
        } else {
          tokens.forEach(token => {
            const amount = token.balance / (10 ** token.contract_decimals);
            const amountUsd = token.quote ? `$${token.quote.toFixed(2)}` : "-";
            section.innerHTML += `
              <div class="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                <img src="${token.logo_url || 'https://via.placeholder.com/24'}" class="h-6 w-6 rounded-full">
                <span>${token.contract_name || 'Unknown'} (${token.contract_ticker_symbol || ''})</span>
                <span class="ml-auto text-yellow-400">${amount.toFixed(4)}</span>
                <span class="ml-4 text-neutral-400 text-sm">${amountUsd}</span>
              </div>
            `;
          });
        }

        assetsContainer.appendChild(section);
      } catch (err) {
        console.error(`Error loading ${chain.name}`, err);
      }
    }
  }

  // ==== Fungsi connect wallet ====
  async function connectWallet() {
    if (!window.ethereum) {
      alert("MetaMask tidak ditemukan.");
      return;
    }
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (accounts.length > 0) {
      walletBtn.textContent = "Disconnect Wallet";
      walletBtn.onclick = disconnectWallet;
      loadAssetsMultiChain(accounts[0]);
    }
  }

  // ==== Fungsi disconnect wallet ====
  function disconnectWallet() {
    assetsContainer.innerHTML = `<p class="text-yellow-500 p-4">Wallet terputus.</p>`;
    walletBtn.textContent = "Connect Wallet";
    walletBtn.onclick = connectWallet;
  }

  // ==== Cek status awal ====
  if (window.ethereum) {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts.length > 0) {
      walletBtn.textContent = "Disconnect Wallet";
      walletBtn.onclick = disconnectWallet;
      loadAssetsMultiChain(accounts[0]);
    } else {
      walletBtn.onclick = connectWallet;
    }

    // Auto update jika user ganti akun di MetaMask
    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length > 0) {
        walletBtn.textContent = "Disconnect Wallet";
        walletBtn.onclick = disconnectWallet;
        loadAssetsMultiChain(accounts[0]);
      } else {
        disconnectWallet();
      }
    });
  } else {
    walletBtn.onclick = connectWallet;
  }
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
      data: { labels, datasets: [{ data: prices, borderColor: "#F4C542", backgroundColor: "rgba(244,197,66,0.1)", fill: true, tension: 0.3 }] },
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
          <div key={c.id} onClick={() => openCoinModal(c)}
            className="rounded-2xl bg-neutral-900/50 border border-white/10 p-4 cursor-pointer hover:bg-neutral-800/50 transition flex flex-col">
            <div className="flex items-center gap-2">
              <img src={c.image} alt={c.symbol} className="h-7 w-7 rounded-full" />
              <span className="font-semibold">{c.name}</span>
              <span className="ml-auto font-semibold">{fmtUSD(c.current_price)}</span>
            </div>
            <div className={`text-sm mt-1 ${c.price_change_percentage_24h >= 0 ? "text-green-400" : "text-red-400"}`}>
              {c.price_change_percentage_24h?.toFixed(2)}%
            </div>
            <div className="h-10 mt-2"><canvas id={`spark-${c.id}`}></canvas></div>
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
      const act = link.dataset.action;
      
      // Cek apakah fungsi khusus ada
      let handled = false;
      if (act === "my-assets" && typeof loadMyAssets === "function") {
        e.preventDefault();
        loadMyAssets();
        handled = true;
      }
      if (act === "top-coins" && typeof loadTopCoins === "function") {
        e.preventDefault();
        loadTopCoins();
        handled = true;
      }
      if (act === "top-rwa" && typeof loadRWACoins === "function") {
        e.preventDefault();
        loadRWACoins();
        handled = true;
      }
      if (act === "trending" && typeof loadTrendingCoins === "function") {
        e.preventDefault();
        loadTrendingCoins();
        handled = true;
      }

      // Tutup sidebar jika mobile
      if (window.innerWidth < 768) {
        sidebar.classList.add("-translate-x-full");
      }

      // Jika tidak ada handler JS, biarkan klik kiri buka href normal
      if (!handled) {
        window.location.href = link.href;
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
      const [key, cgId, sym, chainId, icon] = item.dataset.chain.split("|");
      nameEl.textContent = sym === "ETH" ? "Ethereum" : sym;
      iconEl.src = icon;
      menu.classList.add("hidden");
      if (!window.ethereum) return alert("MetaMask not found");

      try {
        await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
      } catch (err) {
        if (err.code === 4902) {
          const params = getAddNetworkParams(chainId);
          if (params) {
            await window.ethereum.request({ method: "wallet_addEthereumChain", params: [params] });
          }
        } else {
          console.error(err);
        }
      }
      refreshBalance(cgId);
    };
  });

  document.addEventListener("click", (e) => {
    if (!btn.contains(e.target) && !menu.contains(e.target)) menu.classList.add("hidden");
  });
}

function getAddNetworkParams(chainId) {
  switch (chainId) {
    case "0x1":
      return { chainId: "0x1", chainName: "Ethereum Mainnet", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: ["https://mainnet.infura.io/v3/"], blockExplorerUrls: ["https://etherscan.io"] };
    case "0x38":
      return { chainId: "0x38", chainName: "Binance Smart Chain", nativeCurrency: { name: "Binance Coin", symbol: "BNB", decimals: 18 }, rpcUrls: ["https://bsc-dataseed.binance.org/"], blockExplorerUrls: ["https://bscscan.com"] };
    case "0x89":
      return { chainId: "0x89", chainName: "Polygon Mainnet", nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 }, rpcUrls: ["https://polygon-rpc.com/"], blockExplorerUrls: ["https://polygonscan.com"] };
    default: return null;
  }
}

function connectWalletInit() {
  const connectBtn = document.getElementById("connectBtn");
  const profile = document.getElementById("walletProfile");
  const walletBtn = document.getElementById("walletBtn");
  const walletDropdown = document.getElementById("walletDropdown");

  const balanceText = document.getElementById("walletBalanceText");
  const addrShort = document.getElementById("walletAddrShort");
  const addrFull = document.getElementById("walletAddrFull");
  const balanceFull = document.getElementById("walletBalanceFull");

  connectBtn.onclick = async () => {
    if (!window.ethereum) return alert("MetaMask not found");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      const balanceWei = await provider.getBalance(addr);
      const balanceEth = parseFloat(ethers.formatEther(balanceWei));
      const price = (await api.simplePrice("ethereum")).ethereum.usd;
      const balanceUsd = fmtUSD(balanceEth * price);

      balanceText.textContent = balanceUsd;
      addrShort.textContent = addr.slice(0, 6) + "..." + addr.slice(-4);
      addrFull.textContent = addr;
      balanceFull.textContent = balanceUsd;

      connectBtn.classList.add("hidden");
      profile.classList.remove("hidden");

      // Simpan status connect
      localStorage.setItem("walletConnected", "true");
    } catch (err) { console.error(err); }
  };

  walletBtn.onclick = () => walletDropdown.classList.toggle("hidden");

  document.getElementById("disconnectWallet").onclick = () => {
    profile.classList.add("hidden");
    walletDropdown.classList.add("hidden");
    connectBtn.classList.remove("hidden");
    localStorage.removeItem("walletConnected");
  };

  document.addEventListener("click", (e) => {
    if (!walletBtn.contains(e.target) && !walletDropdown.contains(e.target)) walletDropdown.classList.add("hidden");
  });

  // 🔹 Auto-connect jika sebelumnya sudah connect
  if (localStorage.getItem("walletConnected") && window.ethereum) {
    connectBtn.click();
  }

  // 🔹 Update UI saat user switch account / disconnect
  if (window.ethereum) {
    window.ethereum.on("accountsChanged", async (accounts) => {
      if (accounts.length > 0) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const addr = await signer.getAddress();
        const balanceWei = await provider.getBalance(addr);
        const balanceEth = parseFloat(ethers.formatEther(balanceWei));
        const price = (await api.simplePrice("ethereum")).ethereum.usd;
        const balanceUsd = fmtUSD(balanceEth * price);

        balanceText.textContent = balanceUsd;
        addrShort.textContent = addr.slice(0, 6) + "..." + addr.slice(-4);
        addrFull.textContent = addr;
        balanceFull.textContent = balanceUsd;

        connectBtn.classList.add("hidden");
        profile.classList.remove("hidden");
      } else {
        // Jika semua akun di disconnect
        profile.classList.add("hidden");
        walletDropdown.classList.add("hidden");
        connectBtn.classList.remove("hidden");
        localStorage.removeItem("walletConnected");
      }
    });
  }
}

async function refreshBalance(cgId) {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const wei = await provider.getBalance(await signer.getAddress());
    const eth = parseFloat(ethers.formatEther(wei));
    const price = (await api.simplePrice(cgId))[cgId].usd;
    document.getElementById("walletBalanceText").textContent = fmtUSD(eth * price);
    document.getElementById("walletBalanceFull").textContent = fmtUSD(eth * price);
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