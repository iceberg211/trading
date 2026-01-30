import { useRef, useEffect, useMemo, useState, useCallback, memo } from 'react';
import { useAtomValue } from 'jotai';
import { orderBookAtom } from '../atoms/orderBookAtom';
import Decimal from 'decimal.js';

// 颜色常量
const DEPTH_COLORS = {
  bid: {
    fill: 'rgba(14, 203, 129, 0.4)',
    fillEnd: 'rgba(14, 203, 129, 0.05)',
    stroke: '#0ECB81',
  },
  ask: {
    fill: 'rgba(246, 70, 93, 0.4)',
    fillEnd: 'rgba(246, 70, 93, 0.05)',
    stroke: '#F6465D',
  },
  midLine: '#848E9C',
} as const;

// 图表内边距
const CHART_PADDING = { top: 10, right: 10, bottom: 20, left: 10 };

interface DepthPoint {
  price: number;
  cumulativeQty: number;
}

interface TooltipData {
  x: number;
  y: number;
  price: string;
  total: string;
  type: 'bid' | 'ask';
}


/**
 * 深度图组件 - Binance 风格
 * 使用 Canvas 绘制买卖累计深度区域图
 */
export const DepthChart = memo(function DepthChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const orderBook = useAtomValue(orderBookAtom);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // 计算累计深度数据
  const { bidDepth, askDepth, maxQty, midPrice } = useMemo(() => {
    const bids: DepthPoint[] = [];
    const asks: DepthPoint[] = [];
    
    // 累计买单深度（从高到低）
    let bidTotal = 0;
    for (const [price, qty] of orderBook.bids.slice(0, 50)) {
      bidTotal += parseFloat(qty);
      bids.push({ price: parseFloat(price), cumulativeQty: bidTotal });
    }

    // 累计卖单深度（从低到高）
    let askTotal = 0;
    for (const [price, qty] of orderBook.asks.slice(0, 50)) {
      askTotal += parseFloat(qty);
      asks.push({ price: parseFloat(price), cumulativeQty: askTotal });
    }

    const maxQty = Math.max(bidTotal, askTotal);
    const midPrice = orderBook.bids.length > 0 && orderBook.asks.length > 0
      ? (parseFloat(orderBook.bids[0][0]) + parseFloat(orderBook.asks[0][0])) / 2
      : 0;

    return { bidDepth: bids, askDepth: asks, maxQty, midPrice };
  }, [orderBook]);

  // 计算价格范围
  const { minPrice, maxPrice } = useMemo(() => {
    if (bidDepth.length === 0 || askDepth.length === 0) {
      return { minPrice: 0, maxPrice: 0 };
    }
    const bidMin = bidDepth[bidDepth.length - 1]?.price || midPrice;
    const askMax = askDepth[askDepth.length - 1]?.price || midPrice;
    return { minPrice: bidMin, maxPrice: askMax };
  }, [bidDepth, askDepth, midPrice]);

  // 监听容器尺寸变化
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // 绘制深度图
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0 || maxQty === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;
    const dpr = window.devicePixelRatio || 1;
    
    // 设置 Canvas 尺寸
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // 清除画布
    ctx.clearRect(0, 0, width, height);

    const chartWidth = width - CHART_PADDING.left - CHART_PADDING.right;
    const chartHeight = height - CHART_PADDING.top - CHART_PADDING.bottom;

    // 价格到 X 坐标的映射
    const priceToX = (price: number) => {
      const range = maxPrice - minPrice;
      if (range === 0) return CHART_PADDING.left + chartWidth / 2;
      return CHART_PADDING.left + ((price - minPrice) / range) * chartWidth;
    };

    // 数量到 Y 坐标的映射
    const qtyToY = (qty: number) => {
      return CHART_PADDING.top + chartHeight - (qty / maxQty) * chartHeight;
    };


    // 绘制买单区域（绿色）
    if (bidDepth.length > 0) {
      ctx.beginPath();
      ctx.moveTo(priceToX(midPrice), CHART_PADDING.top + chartHeight);
      
      for (let i = 0; i < bidDepth.length; i++) {
        const point = bidDepth[i];
        ctx.lineTo(priceToX(point.price), qtyToY(point.cumulativeQty));
      }
      
      ctx.lineTo(priceToX(bidDepth[bidDepth.length - 1].price), CHART_PADDING.top + chartHeight);
      ctx.closePath();
      
      // 填充渐变
      const bidGradient = ctx.createLinearGradient(0, CHART_PADDING.top, 0, CHART_PADDING.top + chartHeight);
      bidGradient.addColorStop(0, DEPTH_COLORS.bid.fill);
      bidGradient.addColorStop(1, DEPTH_COLORS.bid.fillEnd);
      ctx.fillStyle = bidGradient;
      ctx.fill();

      // 边框线
      ctx.strokeStyle = DEPTH_COLORS.bid.stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }


    // 绘制卖单区域（红色）
    if (askDepth.length > 0) {
      ctx.beginPath();
      ctx.moveTo(priceToX(midPrice), CHART_PADDING.top + chartHeight);
      
      for (let i = 0; i < askDepth.length; i++) {
        const point = askDepth[i];
        ctx.lineTo(priceToX(point.price), qtyToY(point.cumulativeQty));
      }
      
      ctx.lineTo(priceToX(askDepth[askDepth.length - 1].price), CHART_PADDING.top + chartHeight);
      ctx.closePath();
      
      // 填充渐变
      const askGradient = ctx.createLinearGradient(0, CHART_PADDING.top, 0, CHART_PADDING.top + chartHeight);
      askGradient.addColorStop(0, DEPTH_COLORS.ask.fill);
      askGradient.addColorStop(1, DEPTH_COLORS.ask.fillEnd);
      ctx.fillStyle = askGradient;
      ctx.fill();

      // 边框线
      ctx.strokeStyle = DEPTH_COLORS.ask.stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 绘制中间价格线
    ctx.beginPath();
    ctx.strokeStyle = DEPTH_COLORS.midLine;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    const midX = priceToX(midPrice);
    ctx.moveTo(midX, CHART_PADDING.top);
    ctx.lineTo(midX, CHART_PADDING.top + chartHeight);
    ctx.stroke();
    ctx.setLineDash([]);


  }, [dimensions, bidDepth, askDepth, maxQty, minPrice, maxPrice, midPrice]);

  // 鼠标移动处理
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || maxPrice === minPrice) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const chartWidth = dimensions.width - CHART_PADDING.left - CHART_PADDING.right;

    // X 坐标转价格
    const price = minPrice + ((x - CHART_PADDING.left) / chartWidth) * (maxPrice - minPrice);

    
    // 判断是买单还是卖单区域
    const isBidSide = price < midPrice;
    const depthData = isBidSide ? bidDepth : askDepth;
    
    // 找到对应的深度数据点
    let closestPoint: DepthPoint | null = null;
    for (const point of depthData) {
      if (isBidSide ? point.price <= price : point.price >= price) {
        closestPoint = point;
        break;
      }
    }

    if (closestPoint) {
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        price: new Decimal(closestPoint.price).toFixed(2),
        total: new Decimal(closestPoint.cumulativeQty).toFixed(4),
        type: isBidSide ? 'bid' : 'ask',
      });
    } else {
      setTooltip(null);
    }
  }, [dimensions, bidDepth, askDepth, minPrice, maxPrice, midPrice]);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  if (orderBook.bids.length === 0 && orderBook.asks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-text-tertiary text-sm">
        Loading depth data...
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[200px]">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: dimensions.width, height: dimensions.height }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      
      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-bg-card border border-line rounded-lg px-3 py-2 text-xs shadow-lg z-10"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 60,
            transform: tooltip.x > dimensions.width / 2 ? 'translateX(-100%)' : 'none',
          }}
        >
          <div className="text-text-tertiary mb-1">Price</div>
          <div className={`font-mono font-medium ${tooltip.type === 'bid' ? 'text-up' : 'text-down'}`}>
            ${tooltip.price}
          </div>
          <div className="text-text-tertiary mt-2 mb-1">Total</div>
          <div className="text-text-primary font-mono">{tooltip.total}</div>
        </div>
      )}
    </div>
  );
});
