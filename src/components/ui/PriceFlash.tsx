import { memo, useEffect, useRef, useState } from 'react';
import Decimal from 'decimal.js';

interface PriceFlashProps {
  price: string;
  precision?: number;
  className?: string;
  showSign?: boolean;
}

/**
 * 价格闪烁组件
 * 价格上涨时绿色闪烁，下跌时红色闪烁
 */
export const PriceFlash = memo(function PriceFlash({
  price,
  precision = 2,
  className = '',
  showSign = false,
}: PriceFlashProps) {
  const prevPriceRef = useRef<string>(price);
  const [flashDirection, setFlashDirection] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (!price || !prevPriceRef.current) {
      prevPriceRef.current = price;
      return;
    }

    try {
      const current = new Decimal(price);
      const previous = new Decimal(prevPriceRef.current);
      
      if (current.greaterThan(previous)) {
        setFlashDirection('up');
      } else if (current.lessThan(previous)) {
        setFlashDirection('down');
      }

      prevPriceRef.current = price;

      // 动画结束后清除状态
      const timer = setTimeout(() => {
        setFlashDirection(null);
      }, 300);

      return () => clearTimeout(timer);
    } catch {
      prevPriceRef.current = price;
    }
  }, [price]);

  const flashClass = flashDirection === 'up' 
    ? 'animate-flash-up' 
    : flashDirection === 'down' 
      ? 'animate-flash-down' 
      : '';

  const colorClass = flashDirection === 'up'
    ? 'text-up'
    : flashDirection === 'down'
      ? 'text-down'
      : '';

  const formattedPrice = price ? new Decimal(price).toFixed(precision) : '--';
  const sign = showSign && flashDirection === 'up' ? '+' : '';

  return (
    <span className={`inline-block transition-colors duration-150 ${flashClass} ${colorClass} ${className}`}>
      {sign}{formattedPrice}
    </span>
  );
});

/**
 * 简化版：只显示颜色变化，不闪烁
 */
export const PriceColor = memo(function PriceColor({
  price,
  prevPrice,
  precision = 2,
  className = '',
}: {
  price: string;
  prevPrice?: string;
  precision?: number;
  className?: string;
}) {
  let colorClass = '';

  if (price && prevPrice) {
    try {
      const current = new Decimal(price);
      const previous = new Decimal(prevPrice);
      
      if (current.greaterThan(previous)) {
        colorClass = 'text-up';
      } else if (current.lessThan(previous)) {
        colorClass = 'text-down';
      }
    } catch {
      // 解析失败时不添加颜色
    }
  }

  const formattedPrice = price ? new Decimal(price).toFixed(precision) : '--';

  return (
    <span className={`${colorClass} ${className}`}>
      {formattedPrice}
    </span>
  );
});
