import { useTradeForm } from '../hooks/useTradeForm';
import { OrderType } from '../atoms/tradeAtom';
import Decimal from 'decimal.js';

// 订单类型选择器
function OrderTypeSelector({
  selected,
  onSelect,
}: {
  selected: OrderType;
  onSelect: (type: OrderType) => void;
}) {
  const types: { value: OrderType; label: string }[] = [
    { value: 'limit', label: 'Limit' },
    { value: 'market', label: 'Market' },
    { value: 'stop_limit', label: 'Stop-Limit' },
  ];
  
  return (
    <div className="flex gap-1 p-1 bg-bg rounded-lg">
      {types.map((t) => (
        <button
          key={t.value}
          onClick={() => onSelect(t.value)}
          className={`flex-1 py-1.5 text-xs rounded-md transition-all ${
            selected === t.value
              ? 'bg-bg-input text-text-primary font-medium'
              : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

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
    setType,
    setPrice,
    setAmount,
    setTotal,
    setStopPrice,
    setPercentage,
    submitOrder,
  } = useTradeForm();
  
  const availableBalance = form.side === 'buy' ? balance.USDT : balance.BTC;
  const balanceUnit = form.side === 'buy' ? 'USDT' : 'BTC';
  const isMarketOrder = form.type === 'market';
  const isStopLimit = form.type === 'stop_limit';

  return (
    <div className="flex flex-col h-full bg-bg-card">
      {/* Header Tabs - Buy/Sell */}
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
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {/* Order Type Selector */}
        <OrderTypeSelector selected={form.type} onSelect={setType} />

        {/* Balance */}
        <div className="flex justify-between text-xs">
          <span className="text-text-secondary">Avail.</span>
          <span className="text-text-primary font-mono font-medium">
            {new Decimal(availableBalance).toFixed(form.side === 'buy' ? 2 : 6)}{' '}
            <span className="text-text-tertiary">{balanceUnit}</span>
          </span>
        </div>

        {/* Stop Price Input (only for stop-limit) */}
        {isStopLimit && (
          <div className="space-y-1">
            <label className="text-xs text-text-tertiary">Stop Price</label>
            <div className="relative group">
              <input
                type="text"
                value={form.stopPrice}
                onChange={(e) => setStopPrice(e.target.value)}
                className="w-full bg-bg-input text-white px-3 py-2 text-sm rounded border border-transparent focus:border-accent outline-none font-mono transition-colors hover:border-line-light"
                placeholder="Trigger price"
              />
              <span className="absolute right-3 top-2 text-xs text-text-tertiary pointer-events-none">USDT</span>
            </div>
          </div>
        )}

        {/* Price Input (hidden for market orders) */}
        {!isMarketOrder && (
          <div className="space-y-1">
            <label className="text-xs text-text-tertiary">
              {isStopLimit ? 'Limit Price' : 'Price'}
            </label>
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
        )}

        {/* Market Price Indicator */}
        {isMarketOrder && (
          <div className="space-y-1">
            <label className="text-xs text-text-tertiary">Price</label>
            <div className="bg-bg-input text-text-secondary px-3 py-2 text-sm rounded font-mono">
              Market Price
            </div>
          </div>
        )}

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

        {/* Percentage Buttons */}
        <PercentageButtons
          selected={form.percentageUsed}
          onSelect={setPercentage}
        />

        {/* Total Input */}
        <div className="space-y-1">
          <label className="text-xs text-text-tertiary">Total</label>
          <div className="relative group">
            <input
              type="text"
              value={form.total}
              onChange={(e) => setTotal(e.target.value)}
              className="w-full bg-bg-input text-white px-3 py-2 text-sm rounded border border-transparent focus:border-accent outline-none font-mono transition-colors hover:border-line-light"
              placeholder="0.00"
              disabled={isMarketOrder}
            />
            <span className="absolute right-3 top-2 text-xs text-text-tertiary pointer-events-none">USDT</span>
          </div>
        </div>
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
            form.side === 'buy' ? `Buy BTC` : `Sell BTC`
          )}
        </button>
      </div>
    </div>
  );
}
