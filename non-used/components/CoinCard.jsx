import Sparkline from './Sparkline.jsx';
import { fmtUSD } from '../utils/helpers.js';

function CoinCard({ coin, onClick }) {
  const isUp = coin.price_change_percentage_24h >= 0;
  const color = isUp ? '#22c55e' : '#ef4444';

  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl bg-neutral-900/50 hover:bg-neutral-900 border border-white/10 p-4 transition shadow-soft"
    >
      <div className="flex items-center gap-3">
        <img src={coin.image} alt={coin.symbol} className="h-7 w-7 rounded-full"/>
        <div className="font-semibold">
          {coin.name} <span className="text-xs text-neutral-400">({coin.symbol.toUpperCase()})</span>
        </div>
        <div className="ml-auto font-semibold">{fmtUSD(coin.current_price)}</div>
      </div>
      <div className="flex items-center gap-3 mt-2">
        <div className={`text-sm font-medium ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          {isUp ? '▲' : '▼'} {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
        </div>
        <div className="ml-auto w-32">
          <Sparkline data={(coin.sparkline_in_7d?.price || []).slice(-40)} color={color} />
        </div>
      </div>
    </button>
  );
}

export default CoinCard;