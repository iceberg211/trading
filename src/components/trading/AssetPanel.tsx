import { useState, memo, useCallback } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { accountAtom, resetAccountAtom, depositAtom } from '@/domain/account';
import { tickerAtom } from '@/features/ticker/atoms/tickerAtom';
import Decimal from 'decimal.js';

interface AssetDisplay {
  symbol: string;
  name: string;
  available: string;
  locked: string;
  total: string;
  usdValue: string;
}

// 资产名称映射
const ASSET_NAMES: Record<string, string> = {
  USDT: 'TetherUS',
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  BNB: 'BNB',
  SOL: 'Solana',
};

// 资产图标颜色
const ASSET_COLORS: Record<string, string> = {
  USDT: 'from-green-400 to-green-600',
  BTC: 'from-amber-400 to-orange-500',
  ETH: 'from-indigo-400 to-purple-500',
  BNB: 'from-yellow-400 to-yellow-600',
  SOL: 'from-purple-400 to-pink-500',
};

/**
 * 资产管理面板
 * 展示用户模拟账户余额 - 使用 domain/account balanceAtom
 */
export const AssetPanel = memo(function AssetPanel() {
  const account = useAtomValue(accountAtom);
  const resetAccount = useSetAtom(resetAccountAtom);
  const deposit = useSetAtom(depositAtom);
  const ticker = useAtomValue(tickerAtom);
  
  const [isExpanded, setIsExpanded] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // 当前 BTC 价格（用于计算 USD 价值）
  const btcPrice = ticker?.lastPrice ? new Decimal(ticker.lastPrice) : new Decimal(87000);

  // 资产 USD 价值估算
  const getUsdValue = useCallback((symbol: string, amount: string): string => {
    const qty = new Decimal(amount || '0');
    if (qty.isZero()) return '0';
    
    switch (symbol) {
      case 'USDT':
        return qty.toFixed(2);
      case 'BTC':
        return qty.times(btcPrice).toFixed(2);
      case 'ETH':
        return qty.times(btcPrice.times(0.04)).toFixed(2); // 约 BTC 价格的 4%
      case 'BNB':
        return qty.times(300).toFixed(2);
      case 'SOL':
        return qty.times(150).toFixed(2);
      default:
        return '0';
    }
  }, [btcPrice]);

  // 转换账户数据为显示格式
  const assets: AssetDisplay[] = Object.entries(account.balances)
    .filter(([, balance]) => 
      new Decimal(balance.free).plus(new Decimal(balance.locked)).gt(0)
    )
    .map(([symbol, balance]) => {
      const total = new Decimal(balance.free).plus(new Decimal(balance.locked));
      return {
        symbol,
        name: ASSET_NAMES[symbol] || symbol,
        available: balance.free,
        locked: balance.locked,
        total: total.toString(),
        usdValue: getUsdValue(symbol, total.toString()),
      };
    })
    .sort((a, b) => new Decimal(b.usdValue).cmp(new Decimal(a.usdValue)));

  const totalUsdValue = assets.reduce((sum, asset) => {
    return sum.plus(new Decimal(asset.usdValue));
  }, new Decimal(0));

  // 重置账户
  const handleReset = useCallback(() => {
    resetAccount();
    setShowResetConfirm(false);
  }, [resetAccount]);

  // 快捷充值
  const handleQuickDeposit = useCallback(() => {
    deposit({ asset: 'USDT', amount: '10000' });
  }, [deposit]);

  // 获取精度
  const getPrecision = (symbol: string): number => {
    switch (symbol) {
      case 'USDT':
        return 2;
      case 'BTC':
        return 6;
      case 'ETH':
        return 5;
      case 'BNB':
      case 'SOL':
        return 4;
      default:
        return 4;
    }
  };

  return (
    <div className="bg-bg-card border-t border-line-dark">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 h-8 flex items-center justify-between hover:bg-bg-soft/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-heading font-medium text-text-primary">资产</span>
          <span className="text-xxs text-text-tertiary font-mono tabular-nums">
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
        <div className="px-3 pb-3 space-y-2">
          {assets.length === 0 ? (
            <div className="py-4 text-center text-text-tertiary text-sm">
              暂无资产
            </div>
          ) : (
            assets.map((asset) => (
              <div
                key={asset.symbol}
                className="flex items-center justify-between py-2 border-b border-line-dark last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className={`w-8 h-8 rounded-full bg-gradient-to-br ${
                      ASSET_COLORS[asset.symbol] || 'from-gray-400 to-gray-600'
                    } flex items-center justify-center text-xs font-bold text-white shadow-lg`}
                  >
                    {asset.symbol.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-text-primary">{asset.symbol}</div>
                    <div className="text-xs text-text-tertiary">{asset.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-text-primary tabular-nums">
                    {new Decimal(asset.available).toFixed(getPrecision(asset.symbol))}
                  </div>
                  {new Decimal(asset.locked).gt(0) && (
                    <div className="text-xxs text-yellow-500 font-mono tabular-nums inline-flex items-center gap-1 justify-end">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11V7a4 4 0 10-8 0v4m-1 0h10a2 2 0 012 2v7a2 2 0 01-2 2H3a2 2 0 01-2-2v-7a2 2 0 012-2z" />
                      </svg>
                      {new Decimal(asset.locked).toFixed(getPrecision(asset.symbol))}
                    </div>
                  )}
                  <div className="text-xs text-text-tertiary font-mono">
                    ≈ ${new Decimal(asset.usdValue).toFixed(2)}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Actions */}
          <div className="pt-3 flex gap-2">
            <button
              onClick={handleQuickDeposit}
              className="flex-1 py-1.5 text-xs rounded bg-up/10 text-up border border-up/30 hover:bg-up/20 transition-colors"
            >
              充值 10,000 USDT
            </button>
            {showResetConfirm ? (
              <button
                onClick={handleReset}
                className="flex-1 py-1.5 text-xs rounded bg-down/20 text-down border border-down/50 hover:bg-down/30 transition-colors font-medium"
              >
                确认重置？
              </button>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="flex-1 py-1.5 text-xs rounded bg-bg-soft/50 text-text-secondary border border-line-dark hover:bg-bg-soft transition-colors"
              >
                重置账户
              </button>
            )}
          </div>

          {/* Footer Note */}
          <div className="pt-2">
            <p className="text-[10px] text-text-tertiary text-center">
              演示账户 • 模拟余额 • 更新: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
});
