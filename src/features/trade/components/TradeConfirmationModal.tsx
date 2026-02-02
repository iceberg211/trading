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
      <div className="w-full max-w-md bg-bg-card border border-line rounded-lg shadow-lg p-6 animate-in fade-in zoom-in duration-200">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Confirm Order</h2>
        
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Symbol</span>
            <span className="text-text-primary font-medium">{data.symbol}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Side</span>
            <span className={`font-bold ${isBuy ? 'text-up' : 'text-down'}`}>
              {data.side.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Type</span>
            <span className="text-text-primary">{data.type.replace('_', ' ').toUpperCase()}</span>
          </div>

          {data.price && (
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Price</span>
              <span className="text-text-primary font-mono">{data.price}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Amount</span>
            <span className="text-text-primary font-mono">{data.amount}</span>
          </div>

          {data.total && (
            <div className="flex items-center justify-between pt-2 border-t border-line">
              <span className="text-text-secondary">Total Est.</span>
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
            className="w-4 h-4 rounded border-line bg-bg-input text-primary focus:ring-primary"
          />
          <label htmlFor="dont-show" className="text-sm text-text-secondary cursor-pointer select-none">
            Don't show this again
          </label>
        </div>

        <div className="flex gap-3">
           <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            className={`flex-1 ${isBuy ? 'bg-up hover:bg-up-light' : 'bg-down hover:bg-down-light'} text-white border-none`}
            variant={isBuy ? 'buy' : 'sell'}
          >
            Confirm {isBuy ? 'Buy' : 'Sell'}
          </Button>
        </div>
      </div>
    </div>
  );
}
