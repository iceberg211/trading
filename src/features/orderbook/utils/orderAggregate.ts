import Decimal from 'decimal.js';

interface OrderItem {
  price: string;
  qty: string;
  total: string;
}

/**
 * 根据 tickSize 聚合订单数据
 * @param orders 原始订单数据 [price, qty][]
 * @param tickSize 聚合精度
 * @param type 'bids' | 'asks'
 * @param limit 返回条数限制
 */
export function aggregateOrders(
  orders: [string, string][],
  tickSize: string,
  type: 'bids' | 'asks',
  limit: number = 25
): OrderItem[] {
  if (!orders || orders.length === 0) return [];

  const precision = new Decimal(tickSize);
  const resultMap = new Map<string, Decimal>();

  // 1. 聚合逻辑
  orders.forEach(([priceStr, qtyStr]) => {
    const price = new Decimal(priceStr);
    const qty = new Decimal(qtyStr);

    // 计算所属的价格档位
    // 对于 Bids (买单)，通常向下取整 (Floor) 到 tickSize
    // 对于 Asks (卖单)，通常向上取整 (Ceil) 到 tickSize
    // 但为了简化和符合常见习惯，这里统一使用 floor (截断) 或者 round，视具体业务需求而定。
    // 币安通常是： 
    //   Bids: Floor (向下取整)
    //   Asks: Ceil (向上取整)
    
    let aggregatedPrice: Decimal;
    
    if (type === 'bids') {
       // floor(price / tickSize) * tickSize
       aggregatedPrice = price.div(precision).floor().mul(precision);
    } else {
       // ceil(price / tickSize) * tickSize
       aggregatedPrice = price.div(precision).ceil().mul(precision);
    }

    // 格式化为字符串作为 Key
    const key = aggregatedPrice.toFixed(precision.dp());

    const currentQty = resultMap.get(key) || new Decimal(0);
    resultMap.set(key, currentQty.plus(qty));
  });

  // 2. 排序与截取
  // Map 转数组
  let result: { price: string; qty: Decimal }[] = [];
  resultMap.forEach((qty, price) => {
    result.push({ price, qty });
  });

  // 排序
  if (type === 'bids') {
    // 买单价格从高到低
    result.sort((a, b) => new Decimal(b.price).minus(new Decimal(a.price)).toNumber());
  } else {
    // 卖单价格从低到高
    result.sort((a, b) => new Decimal(a.price).minus(new Decimal(b.price)).toNumber());
  }

  // 截取前 N 条
  result = result.slice(0, limit);

  // 3. 计算累计并生成最终结构
  // 注意：如果是 Asks，在 UI 上通常是倒序显示的（高价在下，低价在上）。
  // 但累加通常是从最佳价格开始算。
  // Bids: 最佳价格是最高价 (第0个)。
  // Asks: 最佳价格是最低价 (第0个)。
  
  const finalOutput: OrderItem[] = [];
  let cumulativeTotal = new Decimal(0);

  result.forEach(item => {
    cumulativeTotal = cumulativeTotal.plus(item.qty);
    finalOutput.push({
      price: item.price,
      qty: item.qty.toString(),
      total: cumulativeTotal.toString() // 这里 total 字段复用为累计数量 (Total BTC/BaseAsset)
    });
  });

  return finalOutput;
}
