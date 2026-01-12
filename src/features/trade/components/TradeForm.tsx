import { useTradeForm } from '../hooks/useTradeForm';
import { Button, Input, Card } from '@/components/ui';
import Decimal from 'decimal.js';

// 买卖切换组件
function SideToggle({ 
  side, 
  onSideChange 
}: { 
  side: 'buy' | 'sell'; 
  onSideChange: (side: 'buy' | 'sell') => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 p-1 bg-bg-tertiary/50 rounded-lg">
      <button
        onClick={() => onSideChange('buy')}
        className={`py-2 rounded-md text-sm font-medium transition-all ${
          side === 'buy'
            ? 'bg-up text-white shadow-md'
            : 'text-slate-400 hover:text-white'
        }`}
      >
        买入
      </button>
      <button
        onClick={() => onSideChange('sell')}
        className={`py-2 rounded-md text-sm font-medium transition-all ${
          side === 'sell'
            ? 'bg-down text-white shadow-md'
            : 'text-slate-400 hover:text-white'
        }`}
      >
        卖出
      </button>
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
    <div className="grid grid-cols-4 gap-1.5">
      {percentages.map((p) => (
        <button
          key={p}
          onClick={() => onSelect(p)}
          className={`py-1.5 text-xs rounded-md border transition-all ${
            selected === p
              ? 'bg-accent/20 border-accent/40 text-accent'
              : 'bg-bg-tertiary/50 border-white/10 text-slate-400 hover:border-white/20'
          }`}
        >
          {p}%
        </button>
      ))}
    </div>
  );
}

// 余额显示组件
function BalanceDisplay({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-300 font-mono">
        {value} <span className="text-slate-500">{unit}</span>
      </span>
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
    getBestPrice,
  } = useTradeForm();

  const availableBalance = form.side === 'buy' ? balance.USDT : balance.BTC;
  const balanceUnit = form.side === 'buy' ? 'USDT' : 'BTC';

  return (
    <Card noPadding className="flex flex-col h-full">
      {/* Side Toggle */}
      <div className="p-3 border-b border-white/10">
        <SideToggle side={form.side} onSideChange={setSide} />
      </div>

      {/* Form Body */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        {/* Balance */}
        <BalanceDisplay
          label="可用"
          value={new Decimal(availableBalance).toFixed(form.side === 'buy' ? 2 : 6)}
          unit={balanceUnit}
        />

        {/* Price Input */}
        <Input
          label="价格"
          suffix="USDT"
          value={form.price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
          rightElement={
            <button
              onClick={() => setPrice(getBestPrice(form.side))}
              className="text-xs text-accent hover:text-accent-light"
            >
              最优价
            </button>
          }
        />

        {/* Amount Input */}
        <Input
          label="数量"
          suffix="BTC"
          value={form.amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.000000"
        />

        {/* Percentage Buttons */}
        <PercentageButtons
          selected={form.percentageUsed}
          onSelect={setPercentage}
        />

        {/* Total Input */}
        <Input
          label="交易额"
          suffix="USDT"
          value={form.total}
          onChange={(e) => setTotal(e.target.value)}
          placeholder="0.00"
        />
      </div>

      {/* Submit Button */}
      <div className="p-3 border-t border-white/10">
        <Button
          variant={form.side === 'buy' ? 'buy' : 'sell'}
          fullWidth
          size="lg"
          loading={submitting}
          disabled={!validation.isValid}
          onClick={submitOrder}
        >
          {form.side === 'buy' ? '买入' : '卖出'} BTC
        </Button>
      </div>
    </Card>
  );
}
