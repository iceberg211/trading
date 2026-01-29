/**
 * 精度处理工具
 * 封装常用的数值格式化函数，避免浮点精度问题
 */

import Decimal from 'decimal.js';

// 配置 Decimal.js
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_DOWN,
});

/**
 * 格式化价格
 * @param value 原始价格字符串
 * @param precision 精度（小数位数）
 * @returns 格式化后的价格字符串
 */
export function formatPrice(value: string | number, precision = 2): string {
  try {
    return new Decimal(value).toFixed(precision);
  } catch {
    return '0';
  }
}

/**
 * 格式化数量
 * @param value 原始数量字符串
 * @param precision 精度（小数位数）
 * @returns 格式化后的数量字符串
 */
export function formatQuantity(value: string | number, precision = 4): string {
  try {
    return new Decimal(value).toFixed(precision);
  } catch {
    return '0';
  }
}

/**
 * 格式化百分比
 * @param value 原始值（小数形式，如 0.1234 表示 12.34%）
 * @param precision 精度
 * @returns 格式化后的百分比字符串（不含 % 符号）
 */
export function formatPercent(value: string | number, precision = 2): string {
  try {
    return new Decimal(value).times(100).toFixed(precision);
  } catch {
    return '0';
  }
}

/**
 * 格式化大数字（带 K/M/B 后缀）
 * @param value 原始数值
 * @param precision 精度
 * @returns 格式化后的字符串
 */
export function formatLargeNumber(value: string | number, precision = 2): string {
  try {
    const num = new Decimal(value);
    
    if (num.gte(1_000_000_000)) {
      return num.div(1_000_000_000).toFixed(precision) + 'B';
    }
    if (num.gte(1_000_000)) {
      return num.div(1_000_000).toFixed(precision) + 'M';
    }
    if (num.gte(1_000)) {
      return num.div(1_000).toFixed(precision) + 'K';
    }
    
    return num.toFixed(precision);
  } catch {
    return '0';
  }
}

/**
 * 安全乘法
 */
export function multiply(a: string | number, b: string | number): string {
  try {
    return new Decimal(a).times(b).toString();
  } catch {
    return '0';
  }
}

/**
 * 安全除法
 */
export function divide(a: string | number, b: string | number): string {
  try {
    const divisor = new Decimal(b);
    if (divisor.isZero()) return '0';
    return new Decimal(a).div(divisor).toString();
  } catch {
    return '0';
  }
}

/**
 * 安全加法
 */
export function add(a: string | number, b: string | number): string {
  try {
    return new Decimal(a).plus(b).toString();
  } catch {
    return '0';
  }
}

/**
 * 安全减法
 */
export function subtract(a: string | number, b: string | number): string {
  try {
    return new Decimal(a).minus(b).toString();
  } catch {
    return '0';
  }
}

/**
 * 比较两个数值
 * @returns -1 (a < b), 0 (a = b), 1 (a > b)
 */
export function compare(a: string | number, b: string | number): number {
  try {
    return new Decimal(a).cmp(new Decimal(b));
  } catch {
    return 0;
  }
}

/**
 * 检查数值是否大于零
 */
export function isPositive(value: string | number): boolean {
  try {
    return new Decimal(value).gt(0);
  } catch {
    return false;
  }
}

/**
 * 检查数值是否为零
 */
export function isZero(value: string | number): boolean {
  try {
    return new Decimal(value).isZero();
  } catch {
    return true;
  }
}

/**
 * 按步长调整数量（向下取整）
 * @param value 原始数量
 * @param stepSize 步长（如 "0.001"）
 * @returns 调整后的数量
 */
export function adjustToStepSize(value: string | number, stepSize: string): string {
  try {
    const val = new Decimal(value);
    const step = new Decimal(stepSize);
    
    // 向下取整到步长的整数倍
    const adjusted = val.div(step).floor().times(step);
    
    // 计算精度
    const precision = stepSize.includes('.') 
      ? stepSize.split('.')[1].length 
      : 0;
    
    return adjusted.toFixed(precision);
  } catch {
    return '0';
  }
}

/**
 * 按 tick size 调整价格（四舍五入）
 * @param value 原始价格
 * @param tickSize tick 大小（如 "0.01"）
 * @returns 调整后的价格
 */
export function adjustToTickSize(value: string | number, tickSize: string): string {
  try {
    const val = new Decimal(value);
    const tick = new Decimal(tickSize);
    
    // 四舍五入到 tick 的整数倍
    const adjusted = val.div(tick).round().times(tick);
    
    // 计算精度
    const precision = tickSize.includes('.') 
      ? tickSize.split('.')[1].length 
      : 0;
    
    return adjusted.toFixed(precision);
  } catch {
    return '0';
  }
}

/**
 * 从 stepSize/tickSize 计算精度
 */
export function getPrecisionFromStep(step: string): number {
  if (!step.includes('.')) return 0;
  const decimalPart = step.split('.')[1];
  // 找到第一个非0数字的位置
  const match = decimalPart.match(/^0*/);
  return match ? match[0].length + 1 : decimalPart.length;
}
