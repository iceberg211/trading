import { useState, memo } from 'react';
import { useAtomValue } from 'jotai';
import { mockBalanceAtom } from '@/features/trade/atoms/tradeAtom';
import Decimal from 'decimal.js';

interface Asset {
  symbol: string;
  name: string;
  balance: string;
  frozen: string;
  usdValue: string;
}

/**
 * 资产管理面板
 * 展示用户模拟资产余额
 */
export const AssetPanel = memo(function AssetPanel() {
  const balance = useAtomValue(mockBalanceAtom);
  const [isExpanded, setIsExpanded] = useState(true);

  // 模拟资产数据
  const assets: Asset[] = [
    {
      symbol: 'USDT',
      name: 'TetherUS',
      balance: balance.USDT,
      frozen: '0.00',
      usdValue: balance.USDT,
    },
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      balance: balance.BTC,
      frozen: '0.00000000',
      usdValue: new Decimal(balance.BTC).times(97000).toFixed(2), // 模拟 BTC 价格
    },
  ];

  const totalUsdValue = assets.reduce((sum, asset) => {
    return sum.plus(asset.usdValue);
  }, new Decimal(0));

  return (
    <div className="bg-bg-card border-t border-line">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-bg-hover transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">Assets</span>
          <span className="text-xs text-text-tertiary">
            ≈ ${totalUsdValue.toFixed(2)}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-text-tertiary transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Asset List */}
      {isExpanded && (
        <div className="px-4 pb-3 space-y-2">
          {assets.map((asset) => (
            <div
              key={asset.symbol}
              className="flex items-center justify-between py-2 border-b border-line last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xs font-bold text-white">
                  {asset.symbol.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium text-text-primary">{asset.symbol}</div>
                  <div className="text-xs text-text-tertiary">{asset.name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono text-text-primary">
                  {asset.symbol === 'BTC' 
                    ? new Decimal(asset.balance).toFixed(6) 
                    : new Decimal(asset.balance).toFixed(2)}
                </div>
                <div className="text-xs text-text-tertiary font-mono">
                  ≈ ${new Decimal(asset.usdValue).toFixed(2)}
                </div>
              </div>
            </div>
          ))}

          {/* Footer Note */}
          <div className="pt-2">
            <p className="text-[10px] text-text-tertiary text-center">
              Demo account • Simulated balances
            </p>
          </div>
        </div>
      )}
    </div>
  );
});
