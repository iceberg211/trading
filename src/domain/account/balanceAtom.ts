/**
 * 模拟账户余额管理
 * 使用 Jotai atoms 管理余额状态
 */

import { atom } from 'jotai';
import Decimal from 'decimal.js';

// ==================== 类型定义 ====================

/**
 * 资产余额
 */
export interface AssetBalance {
  asset: string;
  free: string;      // 可用余额
  locked: string;    // 冻结余额（订单占用）
}

/**
 * 账户信息
 */
export interface AccountInfo {
  balances: Record<string, AssetBalance>;
  updateTime: number;
}

// ==================== 初始余额 ====================

const INITIAL_BALANCES: Record<string, AssetBalance> = {
  USDT: { asset: 'USDT', free: '10000', locked: '0' },
  BTC: { asset: 'BTC', free: '0.5', locked: '0' },
  ETH: { asset: 'ETH', free: '5', locked: '0' },
  BNB: { asset: 'BNB', free: '10', locked: '0' },
  SOL: { asset: 'SOL', free: '50', locked: '0' },
};

// ==================== Atoms ====================

/**
 * 账户信息 Atom
 */
export const accountAtom = atom<AccountInfo>({
  balances: INITIAL_BALANCES,
  updateTime: Date.now(),
});

/**
 * 获取指定资产余额
 */
export const getBalanceAtom = atom(
  (get) => (asset: string): AssetBalance => {
    const account = get(accountAtom);
    return account.balances[asset] || { asset, free: '0', locked: '0' };
  }
);

/**
 * 可用余额派生 Atom
 */
export const availableBalancesAtom = atom((get) => {
  const account = get(accountAtom);
  const result: Record<string, string> = {};
  
  for (const [asset, balance] of Object.entries(account.balances)) {
    result[asset] = balance.free;
  }
  
  return result;
});

/**
 * 锁定余额派生 Atom
 */
export const lockedBalancesAtom = atom((get) => {
  const account = get(accountAtom);
  const result: Record<string, string> = {};
  
  for (const [asset, balance] of Object.entries(account.balances)) {
    if (new Decimal(balance.locked).gt(0)) {
      result[asset] = balance.locked;
    }
  }
  
  return result;
});

// ==================== 余额操作 Actions ====================

/**
 * 冻结余额（下单时）
 */
export const lockBalanceAtom = atom(
  null,
  (get, set, payload: { asset: string; amount: string }) => {
    const { asset, amount } = payload;
    const account = get(accountAtom);
    const balance = account.balances[asset];
    
    if (!balance) {
      console.error(`[Balance] Asset ${asset} not found`);
      return false;
    }

    const free = new Decimal(balance.free);
    const lockAmount = new Decimal(amount);

    if (lockAmount.gt(free)) {
      console.error(`[Balance] Insufficient ${asset}: need ${amount}, have ${balance.free}`);
      return false;
    }

    const newBalance: AssetBalance = {
      asset,
      free: free.minus(lockAmount).toFixed(8),
      locked: new Decimal(balance.locked).plus(lockAmount).toFixed(8),
    };

    set(accountAtom, {
      balances: { ...account.balances, [asset]: newBalance },
      updateTime: Date.now(),
    });

    console.log(`[Balance] Locked ${amount} ${asset}`);
    return true;
  }
);

/**
 * 解冻余额（取消订单时）
 */
export const unlockBalanceAtom = atom(
  null,
  (get, set, payload: { asset: string; amount: string }) => {
    const { asset, amount } = payload;
    const account = get(accountAtom);
    const balance = account.balances[asset];
    
    if (!balance) return;

    const locked = new Decimal(balance.locked);
    const unlockAmount = Decimal.min(new Decimal(amount), locked);

    const newBalance: AssetBalance = {
      asset,
      free: new Decimal(balance.free).plus(unlockAmount).toFixed(8),
      locked: locked.minus(unlockAmount).toFixed(8),
    };

    set(accountAtom, {
      balances: { ...account.balances, [asset]: newBalance },
      updateTime: Date.now(),
    });

    console.log(`[Balance] Unlocked ${unlockAmount.toFixed(8)} ${asset}`);
  }
);

/**
 * 执行交易（成交时调整余额）
 */
export const executeTradeAtom = atom(
  null,
  (get, set, payload: {
    baseAsset: string;
    quoteAsset: string;
    side: 'BUY' | 'SELL';
    baseAmount: string;
    quoteAmount: string;
    commission: string;
    commissionAsset: string;
  }) => {
    const { baseAsset, quoteAsset, side, baseAmount, quoteAmount, commission, commissionAsset } = payload;
    const account = get(accountAtom);
    const newBalances = { ...account.balances };

    // 确保资产存在
    if (!newBalances[baseAsset]) {
      newBalances[baseAsset] = { asset: baseAsset, free: '0', locked: '0' };
    }
    if (!newBalances[quoteAsset]) {
      newBalances[quoteAsset] = { asset: quoteAsset, free: '0', locked: '0' };
    }

    const baseBalance = newBalances[baseAsset];
    const quoteBalance = newBalances[quoteAsset];

    if (side === 'BUY') {
      // 买入：扣除 quote（从 locked），增加 base
      newBalances[quoteAsset] = {
        asset: quoteAsset,
        free: quoteBalance.free,
        locked: new Decimal(quoteBalance.locked).minus(new Decimal(quoteAmount)).toFixed(8),
      };
      newBalances[baseAsset] = {
        asset: baseAsset,
        free: new Decimal(baseBalance.free).plus(new Decimal(baseAmount)).toFixed(8),
        locked: baseBalance.locked,
      };
    } else {
      // 卖出：扣除 base（从 locked），增加 quote
      newBalances[baseAsset] = {
        asset: baseAsset,
        free: baseBalance.free,
        locked: new Decimal(baseBalance.locked).minus(new Decimal(baseAmount)).toFixed(8),
      };
      newBalances[quoteAsset] = {
        asset: quoteAsset,
        free: new Decimal(quoteBalance.free).plus(new Decimal(quoteAmount)).toFixed(8),
        locked: quoteBalance.locked,
      };
    }

    // 扣除手续费
    if (commission && commissionAsset && newBalances[commissionAsset]) {
      const commBalance = newBalances[commissionAsset];
      const commAmount = new Decimal(commission);
      const freeAmount = new Decimal(commBalance.free);
      
      if (freeAmount.gte(commAmount)) {
        newBalances[commissionAsset] = {
          ...commBalance,
          free: freeAmount.minus(commAmount).toFixed(8),
        };
      }
    }

    set(accountAtom, {
      balances: newBalances,
      updateTime: Date.now(),
    });

    console.log(`[Balance] Trade executed: ${side} ${baseAmount} ${baseAsset} @ ${quoteAmount} ${quoteAsset}`);
  }
);

/**
 * 重置账户（恢复初始余额）
 */
export const resetAccountAtom = atom(
  null,
  (_get, set) => {
    set(accountAtom, {
      balances: INITIAL_BALANCES,
      updateTime: Date.now(),
    });
    console.log('[Balance] Account reset to initial state');
  }
);

/**
 * 充值（添加余额）
 */
export const depositAtom = atom(
  null,
  (get, set, payload: { asset: string; amount: string }) => {
    const { asset, amount } = payload;
    const account = get(accountAtom);
    const balance = account.balances[asset] || { asset, free: '0', locked: '0' };

    const newBalance: AssetBalance = {
      asset,
      free: new Decimal(balance.free).plus(new Decimal(amount)).toFixed(8),
      locked: balance.locked,
    };

    set(accountAtom, {
      balances: { ...account.balances, [asset]: newBalance },
      updateTime: Date.now(),
    });

    console.log(`[Balance] Deposited ${amount} ${asset}`);
  }
);
