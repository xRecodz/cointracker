// ====== API Wrapper ======
const api = {
  async topCoins(limit = 10) {
    return await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=24h`
    ).then(res => res.json());
  },
};

// ====== React Component ======
const { useEffect, useState } = React;

function App() {
  const [coins, setCoins] = useState([]);

  useEffect(() => {
    loadCoins();
    buildTicker();
  }, []);

  async function loadCoins() {
    const data = await api.topCoins(12);
    setCoins(data);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {coins.map(c => (
        <div
          key={c.id}
          className="rounded-2xl bg-neutral-900/50 border border-white/10 p-4 flex items-center gap-2 hover:bg-neutral-900 cursor-pointer"
        >
          <img src={c.image} alt={c.name} className="h-7 w-7 rounded-full" />
          <span className="font-semibold">{c.name}</span>
          <span className="ml-auto font-medium">${c.current_price.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// ====== Wallet Connect & Balance ======
async function connectWalletInit() {
  const connectBtn = document.getElementById('connectBtn');
  const disconnectBtn = document.getElementById('disconnectWallet');
  const walletProfile = document.getElementById('walletProfile');
  const balanceText = document.getElementById('walletBalanceText');

  // Fungsi untuk menampilkan saldo
  async function updateBalance() {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();

      // Ambil saldo wallet
      const balanceWei = await provider.getBalance(addr);
      const balanceEth = parseFloat(ethers.formatEther(balanceWei));

      // Tentukan ID koin untuk CoinGecko
      const chainName = document.getElementById("chainName")
        ? document.getElementById("chainName").textContent.trim().toLowerCase()
        : "ethereum";

      let coinId = "ethereum";
      if (chainName === "bsc") coinId = "binancecoin";
      if (chainName === "polygon") coinId = "matic-network";

      // Ambil harga USD
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
      const priceData = await res.json();
      const usdPrice = priceData[coinId].usd;

      const totalUSD = (balanceEth * usdPrice).toFixed(2);

      // Update di UI
      balanceText.textContent = `${balanceEth.toFixed(4)} ${chainName.toUpperCase()} ($${totalUSD})`;
      walletProfile.classList.remove('hidden');
      connectBtn.classList.add('hidden');

      // Simpan state di localStorage
      localStorage.setItem("walletConnected", "true");
    } catch (err) {
      console.error(err);
    }
  }

  // Klik tombol connect
  connectBtn.addEventListener('click', async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('MetaMask not found!');
      return;
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      await updateBalance();
    } catch (err) {
      console.error(err);
    }
  });

  // Klik tombol disconnect
  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', () => {
      localStorage.removeItem("walletConnected");
      walletProfile.classList.add('hidden');
      connectBtn.classList.remove('hidden');
      balanceText.textContent = "";
    });
  }

  // Auto reconnect jika sebelumnya tersambung
  if (localStorage.getItem("walletConnected") === "true") {
    updateBalance();
  }

  // Update saldo jika ganti network di MetaMask
  if (window.ethereum) {
    window.ethereum.on('chainChanged', () => {
      if (localStorage.getItem("walletConnected") === "true") {
        updateBalance();
      }
    });
    window.ethereum.on('accountsChanged', () => {
      if (localStorage.getItem("walletConnected") === "true") {
        updateBalance();
      }
    });
  }
}

// ====== Build Ticker ======
async function buildTicker() {
  const data = await api.topCoins(10);
  const tickerInner = document.getElementById('tickerInner');
  if (!tickerInner) return;

  tickerInner.innerHTML = '';

  data.forEach(c => {
    const item = document.createElement('span');
    item.className = `mx-4 ${c.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`;
    item.innerHTML = `${c.symbol.toUpperCase()}: $${c.current_price.toLocaleString()} (${c.price_change_percentage_24h.toFixed(2)}%)`;
    tickerInner.appendChild(item);
  });

  // Duplicate for smooth scrolling
  data.forEach(c => {
    const item = document.createElement('span');
    item.className = `mx-4 ${c.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`;
    item.innerHTML = `${c.symbol.toUpperCase()}: $${c.current_price.toLocaleString()} (${c.price_change_percentage_24h.toFixed(2)}%)`;
    tickerInner.appendChild(item);
  });
}

// ====== Sidebar Toggle ======
function sidebarToggleInit() {
  const menuBtn = document.getElementById('menuBtn');
  const sidebar = document.getElementById('sidebar');
  if (!menuBtn || !sidebar) return;

  menuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('-translate-x-full');
  });
}

// ====== Init App ======
document.addEventListener("DOMContentLoaded", () => {
  sidebarToggleInit();
  connectWalletInit();
  ReactDOM.createRoot(document.getElementById("app-root")).render(<App />);
});