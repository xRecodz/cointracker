const connectBtn = document.getElementById("connectBtn");
const portfolioDiv = document.getElementById("portfolio");
const topCoinsDiv = document.getElementById("topCoins");
const coinMarquee = document.getElementById("coinMarquee");

let provider, signer, userAddress;

// Connect wallet (support MetaMask & OKX)
connectBtn.onclick = async () => {
    const walletProvider = window.ethereum || window.okxwallet;
    if (!walletProvider) {
        alert("Please install MetaMask or OKX Wallet!");
        return;
    }
    try {
        provider = new ethers.BrowserProvider(walletProvider);
        signer = await provider.getSigner();
        userAddress = await signer.getAddress();
        console.log("Connected:", userAddress);
        loadPortfolio();
    } catch (err) {
        console.error("Error connecting:", err);
    }
};

// Load portfolio (default ETH)
async function loadPortfolio(coinId = "ethereum") {
    const balanceWei = await provider.getBalance(userAddress);
    const balance = parseFloat(ethers.formatEther(balanceWei));

    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
    const prices = await res.json();
    const price = prices[coinId].usd;

    const totalValue = balance * price;

    portfolioDiv.innerHTML = `
        <p>Address: ${userAddress}</p>
        <p>Balance: ${balance.toFixed(4)} ${coinId.toUpperCase()}</p>
        <p>Price: $${price}</p>
        <h3>Total Value: $${totalValue.toFixed(2)}</h3>
    `;
}

// Load top 10 coins
async function loadTopCoins() {
    const res = await fetch(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1"
    );
    const data = await res.json();

    // List in marquee
    coinMarquee.innerHTML = data
        .map(coin => `<span class="marquee-coin" onclick="loadPortfolio('${coin.id}')">${coin.symbol.toUpperCase()}: $${coin.current_price}</span>`)
        .join(" ");

    // List in normal div
    topCoinsDiv.innerHTML = "<h2>Top 10 Coins</h2>" + data
        .map(coin => `
            <div class="coin-item" onclick="loadPortfolio('${coin.id}')">
                <span>${coin.market_cap_rank}. ${coin.name} (${coin.symbol.toUpperCase()})</span>
                <span>$${coin.current_price}</span>
            </div>
        `)
        .join("");
}

// First load
loadTopCoins();
setInterval(loadTopCoins, 60000); // Update every 1 min
