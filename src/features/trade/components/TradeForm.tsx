import { useTradeForm } from '../hooks/useTradeForm';
import Decimal from 'decimal.js';

// 百分比按钮组
function PercentageButtons({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (p: number) => void;
}) {
  const percentages = [25, 50, 75, 100];
  
  return (
    <div className="grid grid-cols-4 gap-2">
      {percentages.map((p) => (
        <button
          key={p}
          onClick={() => onSelect(p)}
          className={`py-1 text-xs rounded bg-bg-input border transition-all ${
            selected === p
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          {p}%
        </button>
      ))}
    </div>
  );
}



// 主表单组件
export function TradeForm() {
  const {
    form,
    balance,
    submitting,
    validation,
    setSide,
    setPrice,
    setAmount,
    setTotal,
    setPercentage,
    submitOrder,
  } = useTradeForm();
  const availableBalance = form.side === 'buy' ? balance.USDT : balance.BTC;
  const balanceUnit = form.side === 'buy' ? 'USDT' : 'BTC';

  return (
    <div className="flex flex-col h-full bg-bg-card">
      {/* Header Tabs */}
      <div className="flex border-b border-line">
         <button
            onClick={() => setSide('buy')}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
              form.side === 'buy' 
                ? 'border-up text-up bg-up-bg' 
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Buy
          </button>
          <button
            onClick={() => setSide('sell')}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
              form.side === 'sell' 
                ? 'border-down text-down bg-down-bg' 
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Sell
          </button>
      </div>

      {/* Form Body */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Balance */}
        <div className="flex justify-between text-xs">
          <span className="text-text-secondary">Avail.</span>
          <span className="text-text-primary font-mono font-medium">
            {new Decimal(availableBalance).toFixed(form.side === 'buy' ? 2 : 6)} <span className="text-text-tertiary">{balanceUnit}</span>
          </span>
        </div>

        {/* Price Input */}
        <div className="space-y-1">
          <label className="text-xs text-text-tertiary">Price</label>
          <div className="relative group">
            <input
              type="text"
              value={form.price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-bg-input text-white px-3 py-2 text-sm rounded border border-transparent focus:border-accent outline-none font-mono transition-colors hover:border-line-light"
              placeholder="0.00"
            />
             <span className="absolute right-3 top-2 text-xs text-text-tertiary pointer-events-none">USDT</span>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-1">
          <label className="text-xs text-text-tertiary">Amount</label>
           <div className="relative group">
            <input
              type="text"
              value={form.amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-bg-input text-white px-3 py-2 text-sm rounded border border-transparent focus:border-accent outline-none font-mono transition-colors hover:border-line-light"
              placeholder="0.00"
            />
            <span className="absolute right-3 top-2 text-xs text-text-tertiary pointer-events-none">BTC</span>
          </div>
        </div>

        {/* Percentage Slider / Buttons */}
        <PercentageButtons
          selected={form.percentageUsed}
          onSelect={setPercentage}
        />

        {/* Total Input (Read only ish) */}
         <div className="space-y-1">
          <label className="text-xs text-text-tertiary">Total</label>
           <div className="relative group">
            <input
              type="text"
              value={form.total}
              onChange={(e) => setTotal(e.target.value)}
              className="w-full bg-bg-input text-white px-3 py-2 text-sm rounded border border-transparent focus:border-accent outline-none font-mono transition-colors hover:border-line-light"
              placeholder="0.00"
            />
            <span className="absolute right-3 top-2 text-xs text-text-tertiary pointer-events-none">USDT</span>
          </div>
        </div>
        
        {/* Summary Details can go here later */}
      </div>

      {/* Submit Button */}
      <div className="p-4 pt-0">
        <button
          disabled={!validation.isValid || submitting}
          onClick={submitOrder}
          className={`w-full py-3 rounded text-sm font-bold text-white transition-all transform active:scale-[0.98] ${
            form.side === 'buy' 
              ? 'bg-up hover:bg-up-light shadow-lg shadow-up/20' 
              : 'bg-down hover:bg-down-light shadow-lg shadow-down/20'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {submitting ? 'Processing...' : (
             form.side === 'buy' ? 'Buy BTC' : 'Sell BTC' 
          )}
        </button>
      </div>
    </div>
  );
}
