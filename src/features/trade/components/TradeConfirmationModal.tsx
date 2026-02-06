import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useAtom } from 'jotai';
import { showOrderConfirmationAtom } from '../atoms/settingsAtom';

interface TradeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  data: {
    side: 'buy' | 'sell';
    type: 'limit' | 'market' | 'stop_limit';
    price?: string;
    amount: string;
    total?: string;
    symbol: string;
  };
}

export function TradeConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  data 
}: TradeConfirmationModalProps) {
  const [showConfirmation, setShowConfirmation] = useAtom(showOrderConfirmationAtom);
  const [dontShowAgain, setDontShowAgain] = useState(!showConfirmation);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (dontShowAgain) {
      setShowConfirmation(false);
    }
    onConfirm();
    onClose();
  };

  const isBuy = data.side === 'buy';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-bg-card border border-line-dark rounded-panel shadow-lg p-4 animate-in fade-in zoom-in duration-200">
        <h2 className="text-lg font-semibold text-text-primary mb-4">确认订单</h2>
        
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">交易对</span>
            <span className="text-text-primary font-medium">{data.symbol}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">方向</span>
            <span className={`font-bold ${isBuy ? 'text-up' : 'text-down'}`}>
              {isBuy ? '买入' : '卖出'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-text-secondary">类型</span>
            <span className="text-text-primary">
              {data.type === 'limit' ? '限价' : data.type === 'market' ? '市价' : '止损限价'}
            </span>
          </div>

          {data.price && (
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">价格</span>
              <span className="text-text-primary font-mono">{data.price}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-text-secondary">数量</span>
            <span className="text-text-primary font-mono">{data.amount}</span>
          </div>

          {data.total && (
            <div className="flex items-center justify-between pt-2 border-t border-line-dark">
              <span className="text-text-secondary">预计金额</span>
              <span className="text-text-primary font-mono font-bold">{data.total}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 mb-6">
          <input 
            type="checkbox"
            id="dont-show" 
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="w-4 h-4 rounded-sm border border-line-dark bg-bg-input text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
          />
          <label htmlFor="dont-show" className="text-sm text-text-secondary cursor-pointer select-none">
            下次不再提示
          </label>
        </div>

        <div className="flex gap-3">
           <Button variant="secondary" onClick={onClose} className="flex-1">
            取消
          </Button>
          <Button 
            onClick={handleConfirm} 
            className={`flex-1 ${isBuy ? 'bg-up hover:bg-up-light' : 'bg-down hover:bg-down-light'} text-white border-none`}
            variant={isBuy ? 'buy' : 'sell'}
          >
            确认{isBuy ? '买入' : '卖出'}
          </Button>
        </div>
      </div>
    </div>
  );
}
