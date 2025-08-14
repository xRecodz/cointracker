// ✅ script.js
const connectWalletBtn = document.getElementById("connectWalletBtn");
const walletInfo = document.getElementById("walletInfo");
const walletAddress = document.getElementById("walletAddress");
const walletBalance = document.getElementById("walletBalance");
const coinsGrid = document.getElementById("coinsGrid");
const ticker = document.getElementById("ticker");

let provider;

connectWalletBtn.addEventListener("click", async () => {
  if (connectWalletBtn.innerText === "Disconnect") {
    connectWalletBtn.innerText = "Connect Wallet";
    walletInfo.classList.add("hidden");
    return;
  }

  if (typeof window.ethereum !== "undefined") {
    try {
      provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const address = accounts[0];
      walletAddress.innerText = address;

      const balance = await provider.getBalance(address);
      walletBalance.innerText = ethers.utils.formatEther(balance);

      connectWalletBtn.innerText = "Disconnect";
      walletInfo.classList.remove("hidden");
    } catch (err) {
      console.error("Wallet connection failed:", err);
    }
  } else {
    alert("Please install MetaMask or compatible wallet!");
  }
});

async function getTopCoins() {
  const res = await fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=true");
  const data = await res.json();

  // Render ticker
  ticker.innerHTML = data.map(coin => `${coin.name}: $${coin.current_price}`).join(" | ");

  // Render grid
  coinsGrid.innerHTML = data.map(coin => `
    <div class="coin-card">
      <img src="${coin.image}" alt="${coin.name}" width="32" />
      <h3>${coin.name}</h3>
      <p>$${coin.current_price}</p>
      <p style="color:${coin.price_change_percentage_24h >= 0 ? 'lime' : 'red'}">
        ${coin.price_change_percentage_24h.toFixed(2)}%
      </p>
    </div>
  `).join("");
}

getTopCoins();
