const connectBtn = document.getElementById("connectBtn");
const portfolioDiv = document.getElementById("portfolio");

let provider;
let signer;
let userAddress;

connectBtn.onclick = async () => {
    console.log("Tombol Connect diklik"); // debug
    if (!window.ethereum) {
        alert("MetaMask belum terpasang!");
        return;
    }
    try {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();
        userAddress = await signer.getAddress();
        console.log("Wallet address:", userAddress);
        loadPortfolio();
    } catch (err) {
        console.error("Error koneksi:", err);
    }
};


async function loadPortfolio() {
    const balanceWei = await provider.getBalance(userAddress);
    const balanceEth = parseFloat(ethers.formatEther(balanceWei));

    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
    const prices = await res.json();
    const ethPrice = prices.ethereum.usd;

    const totalValue = balanceEth * ethPrice;

    portfolioDiv.innerHTML = `
        <p>Address: ${userAddress}</p>
        <p>ETH Balance: ${balanceEth.toFixed(4)} ETH</p>
        <p>ETH Price: $${ethPrice}</p>
        <h3>Total Value: $${totalValue.toFixed(2)}</h3>
    `;
}
