import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { useTradeForm } from '../hooks/useTradeForm';
import { OrderType } from '../atoms/tradeAtom';
import { showOrderConfirmationAtom } from '../atoms/settingsAtom';
import { TradeConfirmationModal } from './TradeConfirmationModal';
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
    <div className="flex gap-1 p-1 bg-bg-panel/70 border border-line-dark rounded-lg">
      {types.map((t) => (
        <button
          key={t.value}
          onClick={() => onSelect(t.value)}
          className={`flex-1 py-1.5 text-xs rounded-md transition-all ${
            selected === t.value
              ? 'bg-bg-soft text-text-primary font-medium shadow-sm'
              : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-soft/40'
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
          className={`py-1 text-xs rounded border transition-all ${
            selected === p
              ? 'border-accent text-accent bg-accent/10'
              : 'border-line-dark text-text-secondary hover:text-text-primary hover:bg-bg-soft/40'
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

  const showConfirmation = useAtomValue(showOrderConfirmationAtom);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  
  const availableBalance = form.side === 'buy' ? balance.USDT : balance.BTC;
  const balanceUnit = form.side === 'buy' ? 'USDT' : 'BTC';
  const isMarketOrder = form.type === 'market';
  const isStopLimit = form.type === 'stop_limit';

  const handlePreSubmit = () => {
    if (showConfirmation) {
      setIsConfirmationOpen(true);
    } else {
      submitOrder();
    }
  };

  const handleConfirmSubmit = () => {
    submitOrder();
    setIsConfirmationOpen(false); // Close modal after trigger (though hook might reset form)
  };

  return (
    <div className="flex flex-col h-full bg-bg-card/90 backdrop-blur">
      {/* Header Tabs - Buy/Sell */}
      <div className="flex border-b border-line-dark bg-bg-soft/70">
        <button
          onClick={() => setSide('buy')}
          className={`flex-1 py-3 text-xs font-semibold uppercase tracking-[0.22em] transition-colors border-b-2 ${
            form.side === 'buy' 
              ? 'border-up text-up bg-up-bg/50' 
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setSide('sell')}
          className={`flex-1 py-3 text-xs font-semibold uppercase tracking-[0.22em] transition-colors border-b-2 ${
            form.side === 'sell' 
              ? 'border-down text-down bg-down-bg/50' 
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
                className="w-full bg-bg-soft/80 text-text-primary px-3 py-2 text-sm rounded border border-line-dark focus:border-accent outline-none font-mono transition-colors hover:border-line-light focus:ring-1 focus:ring-accent/40"
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
                className="w-full bg-bg-soft/80 text-text-primary px-3 py-2 text-sm rounded border border-line-dark focus:border-accent outline-none font-mono transition-colors hover:border-line-light focus:ring-1 focus:ring-accent/40"
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
            <div className="bg-bg-soft/70 text-text-secondary px-3 py-2 text-sm rounded font-mono border border-line-dark">
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
              className="w-full bg-bg-soft/80 text-text-primary px-3 py-2 text-sm rounded border border-line-dark focus:border-accent outline-none font-mono transition-colors hover:border-line-light focus:ring-1 focus:ring-accent/40"
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
              className="w-full bg-bg-soft/80 text-text-primary px-3 py-2 text-sm rounded border border-line-dark focus:border-accent outline-none font-mono transition-colors hover:border-line-light focus:ring-1 focus:ring-accent/40"
              placeholder="0.00"
              disabled={isMarketOrder}
            />
            <span className="absolute right-3 top-2 text-xs text-text-tertiary pointer-events-none">USDT</span>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="p-4 pt-3 border-t border-line-dark bg-bg-panel/50">
        <button
          disabled={!validation.isValid || submitting}
          onClick={handlePreSubmit}
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

      {/* Confirmation Modal */}
      <TradeConfirmationModal 
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        onConfirm={handleConfirmSubmit}
        data={{
          side: form.side,
          type: form.type,
          price: form.price,
          amount: form.amount,
          total: form.total,
          symbol: 'BTC/USDT'
        }}
      />
    </div>
  );
}
