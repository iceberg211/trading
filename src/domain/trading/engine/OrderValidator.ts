/**
 * 订单验证器
 * 基于 ExchangeInfo 规则验证订单参数
 */

import Decimal from 'decimal.js';
import { exchangeInfo, type SymbolConfig } from '@/core/config';
import type { 
  NewOrderRequest, 
  ValidationResult, 
  RejectReason,
} from '../types';

/**
 * 验证错误
 */
interface ValidationError {
  field: string;
  message: string;
  reason?: RejectReason;
}

/**
 * 订单验证器
 */
export class OrderValidator {
  /**
   * 验证订单请求
   */
  static validate(
    request: NewOrderRequest,
    availableBalance: string,
    currentPrice?: string
  ): ValidationResult {
    const errors: ValidationError[] = [];
    
    // 获取交易对配置
    const symbolConfig = exchangeInfo.getSymbol(request.symbol);
    if (!symbolConfig) {
      errors.push({
        field: 'symbol',
        message: `交易对 ${request.symbol} 不存在`,
        reason: 'UNKNOWN',
      });
      return { valid: false, errors };
    }

    // 1. 验证数量
    this.validateQuantity(request, symbolConfig, errors);

    // 2. 验证价格（限价单）
    if (request.type === 'LIMIT' || request.type === 'STOP_LIMIT') {
      this.validatePrice(request, symbolConfig, currentPrice, errors);
    }

    // 3. 验证最小交易金额
    this.validateNotional(request, symbolConfig, errors);

    // 4. 验证余额
    this.validateBalance(request, availableBalance, currentPrice, errors);

    // 5. 验证止损单
    if (request.type === 'STOP_LIMIT' || request.type === 'STOP_MARKET') {
      this.validateStopPrice(request, currentPrice, errors);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证数量
   */
  private static validateQuantity(
    request: NewOrderRequest,
    config: SymbolConfig,
    errors: ValidationError[]
  ): void {
    const qty = new Decimal(request.quantity);
    const minQty = new Decimal(config.minQty);
    const maxQty = new Decimal(config.maxQty);
    const stepSize = new Decimal(config.stepSize);

    // 检查最小数量
    if (qty.lt(minQty)) {
      errors.push({
        field: 'quantity',
        message: `数量不能小于 ${config.minQty}`,
        reason: 'QUANTITY_OUT_OF_RANGE',
      });
      return;
    }

    // 检查最大数量
    if (qty.gt(maxQty)) {
      errors.push({
        field: 'quantity',
        message: `数量不能大于 ${config.maxQty}`,
        reason: 'QUANTITY_OUT_OF_RANGE',
      });
      return;
    }

    // 检查步长精度
    if (!qty.minus(minQty).mod(stepSize).isZero()) {
      errors.push({
        field: 'quantity',
        message: `数量必须是 ${config.stepSize} 的整数倍`,
        reason: 'INVALID_STEP_SIZE',
      });
    }
  }

  /**
   * 验证价格
   */
  private static validatePrice(
    request: NewOrderRequest,
    config: SymbolConfig,
    currentPrice: string | undefined,
    errors: ValidationError[]
  ): void {
    if (!request.price) {
      errors.push({
        field: 'price',
        message: '限价单必须指定价格',
        reason: 'INVALID_PRICE',
      });
      return;
    }

    const price = new Decimal(request.price);
    const tickSize = new Decimal(config.tickSize);

    // 检查价格为正
    if (price.lte(0)) {
      errors.push({
        field: 'price',
        message: '价格必须大于 0',
        reason: 'INVALID_PRICE',
      });
      return;
    }

    // 检查价格精度
    const remainder = price.mod(tickSize);
    if (!remainder.isZero()) {
      errors.push({
        field: 'price',
        message: `价格必须是 ${config.tickSize} 的整数倍`,
        reason: 'INVALID_TICK_SIZE',
      });
    }

    // 检查价格是否偏离当前价格太远（可选，防止误操作）
    if (currentPrice) {
      const current = new Decimal(currentPrice);
      const deviation = price.minus(current).abs().div(current);
      
      // 偏离超过 50% 给出警告（但不阻止）
      if (deviation.gt(0.5)) {
        console.warn(`[OrderValidator] Price deviation > 50%: ${price} vs current ${current}`);
      }
    }
  }

  /**
   * 验证最小交易金额
   */
  private static validateNotional(
    request: NewOrderRequest,
    config: SymbolConfig,
    errors: ValidationError[]
  ): void {
    const qty = new Decimal(request.quantity);
    const minNotional = new Decimal(config.minNotional);

    let notional: Decimal;

    if (request.type === 'MARKET') {
      // 市价单：需要估算，这里简化处理
      // 实际应该用当前价格估算
      return;
    } else {
      // 限价单：quantity * price
      if (!request.price) return;
      const price = new Decimal(request.price);
      notional = qty.times(price);
    }

    if (notional.lt(minNotional)) {
      errors.push({
        field: 'notional',
        message: `交易金额不能小于 ${config.minNotional} USDT`,
        reason: 'MIN_NOTIONAL',
      });
    }
  }

  /**
   * 验证余额
   */
  private static validateBalance(
    request: NewOrderRequest,
    availableBalance: string,
    currentPrice: string | undefined,
    errors: ValidationError[]
  ): void {
    const balance = new Decimal(availableBalance);
    const qty = new Decimal(request.quantity);

    let requiredAmount: Decimal;

    if (request.side === 'BUY') {
      // 买入：需要报价资产（如 USDT）
      if (request.type === 'MARKET') {
        // 市价买入：使用当前价格估算
        if (!currentPrice) return;
        requiredAmount = qty.times(new Decimal(currentPrice)).times(1.01); // 加 1% 滑点预留
      } else {
        // 限价买入
        if (!request.price) return;
        requiredAmount = qty.times(new Decimal(request.price));
      }
    } else {
      // 卖出：需要基础资产（如 BTC）
      requiredAmount = qty;
    }

    if (requiredAmount.gt(balance)) {
      errors.push({
        field: 'balance',
        message: `余额不足，需要 ${requiredAmount.toFixed(8)}，可用 ${balance.toFixed(8)}`,
        reason: 'INSUFFICIENT_BALANCE',
      });
    }
  }

  /**
   * 验证止损价格
   */
  private static validateStopPrice(
    request: NewOrderRequest,
    currentPrice: string | undefined,
    errors: ValidationError[]
  ): void {
    if (!request.stopPrice) {
      errors.push({
        field: 'stopPrice',
        message: '止损单必须指定触发价格',
        reason: 'INVALID_PRICE',
      });
      return;
    }

    if (!currentPrice) return;

    const stopPrice = new Decimal(request.stopPrice);
    const current = new Decimal(currentPrice);

    // 买入止损：触发价应高于当前价
    // 卖出止损：触发价应低于当前价
    if (request.side === 'BUY' && stopPrice.lte(current)) {
      errors.push({
        field: 'stopPrice',
        message: '买入止损的触发价格必须高于当前价格',
        reason: 'ORDER_WOULD_TRIGGER_IMMEDIATELY',
      });
    }

    if (request.side === 'SELL' && stopPrice.gte(current)) {
      errors.push({
        field: 'stopPrice',
        message: '卖出止损的触发价格必须低于当前价格',
        reason: 'ORDER_WOULD_TRIGGER_IMMEDIATELY',
      });
    }
  }

  /**
   * 快速验证（只检查关键项）
   */
  static quickValidate(request: NewOrderRequest): boolean {
    const config = exchangeInfo.getSymbol(request.symbol);
    if (!config) return false;

    try {
      const qty = new Decimal(request.quantity);
      if (qty.lte(0)) return false;

      if (request.price) {
        const price = new Decimal(request.price);
        if (price.lte(0)) return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 格式化数量（按步长调整）
   */
  static formatQuantity(quantity: string, symbol: string): string {
    const config = exchangeInfo.getSymbol(symbol);
    if (!config) return quantity;

    const qty = new Decimal(quantity);
    const stepSize = new Decimal(config.stepSize);
    const minQty = new Decimal(config.minQty);

    // 向下取整到步长
    const adjusted = qty.minus(qty.minus(minQty).mod(stepSize));
    
    return adjusted.toFixed(config.quantityPrecision);
  }

  /**
   * 格式化价格（按 tickSize 调整）
   */
  static formatPrice(price: string, symbol: string): string {
    const config = exchangeInfo.getSymbol(symbol);
    if (!config) return price;

    const p = new Decimal(price);
    const tickSize = new Decimal(config.tickSize);

    // 四舍五入到 tickSize
    const adjusted = p.div(tickSize).round().times(tickSize);
    
    return adjusted.toFixed(config.pricePrecision);
  }
}
