const connectBtn = document.getElementById("connectBtn");
const walletInfoDiv = document.getElementById("walletInfo");
const walletAddressEl = document.getElementById("walletAddress");
const walletBalanceEl = document.getElementById("walletBalance");
const topCoinsDiv = document.getElementById("topCoins");
const coinMarquee = document.getElementById("coinMarquee");

let provider, signer, userAddress;

// Connect / Disconnect wallet
connectBtn.onclick = async () => {
    if (userAddress) {
        // Disconnect
        userAddress = null;
        walletInfoDiv.style.display = "none";
        connectBtn.textContent = "Connect Wallet";
        return;
    }

    const walletProvider = window.ethereum || window.okxwallet;
    if (!walletProvider) {
        alert("Please install MetaMask or OKX Wallet!");
        return;
    }
    try {
        provider = new ethers.BrowserProvider(walletProvider);
        signer = await provider.getSigner();
        userAddress = await signer.getAddress();
        connectBtn.textContent = "Disconnect";
        walletInfoDiv.style.display = "block";
        loadPortfolio();
    } catch (err) {
        console.error("Error connecting:", err);
    }
};

// Load portfolio
async function loadPortfolio(coinId = "ethereum") {
    const balanceWei = await provider.getBalance(userAddress);
    const balance = parseFloat(ethers.formatEther(balanceWei));

    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
    const prices = await res.json();
    const price = prices[coinId].usd;

    walletAddressEl.textContent = userAddress;
    walletBalanceEl.textContent = `${balance.toFixed(4)} ${coinId.toUpperCase()} ($${(balance * price).toFixed(2)})`;
}

// Load top 10 coins
async function loadTopCoins() {
    const res = await fetch(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1"
    );
    const data = await res.json();

    // Marquee
    coinMarquee.innerHTML = data
        .map(coin => `<span class="marquee-coin" onclick="loadPortfolio('${coin.id}')">${coin.symbol.toUpperCase()}: $${coin.current_price}</span>`)
        .join(" ");

    // List
    topCoinsDiv.innerHTML = "<h2 style='margin-left:15px;'>Top 10 Coins</h2>" + data
        .map(coin => `
            <div class="coin-item" onclick="loadPortfolio('${coin.id}')">
                <span>${coin.market_cap_rank}. ${coin.name} (${coin.symbol.toUpperCase()})</span>
                <span>$${coin.current_price}</span>
            </div>
        `)
        .join("");
}

// Load coin data on start
loadTopCoins();
setInterval(loadTopCoins, 60000);
