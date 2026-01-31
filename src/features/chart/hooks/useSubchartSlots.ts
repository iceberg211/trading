/**
 * useSubchartSlots - 多副图插槽管理 Hook
 * 
 * 管理最多3个副图插槽的状态
 */

import { useState, useCallback } from 'react';

export type SubchartType = 'MACD' | 'RSI' | 'VOL' | null;

export interface SubchartSlot {
  id: string;
  type: SubchartType;
  container: HTMLDivElement | null;
}

export const MAX_SUBCHART_SLOTS = 3;

const createInitialSlots = (): SubchartSlot[] => [
  { id: 'slot-0', type: null, container: null },
  { id: 'slot-1', type: null, container: null },
  { id: 'slot-2', type: null, container: null },
];

export function useSubchartSlots() {
  const [slots, setSlots] = useState<SubchartSlot[]>(createInitialSlots);

  // 设置插槽容器
  const setSlotContainer = useCallback((slotId: string, container: HTMLDivElement | null) => {
    setSlots((prev) =>
      prev.map((slot) => (slot.id === slotId ? { ...slot, container } : slot))
    );
  }, []);

  // 设置插槽类型 (切换或设置)
  const setSlotType = useCallback((slotId: string, type: SubchartType) => {
    setSlots((prev) =>
      prev.map((slot) => {
        if (slot.id === slotId) {
          // 如果点击同类型，则关闭
          const newType = slot.type === type ? null : type;
          return { ...slot, type: newType };
        }
        return slot;
      })
    );
  }, []);

  // 添加副图到第一个空插槽
  const addSubchart = useCallback((type: SubchartType) => {
    setSlots((prev) => {
      // 检查是否已存在同类型
      const existingIndex = prev.findIndex((s) => s.type === type);
      if (existingIndex !== -1) {
        // 已存在则关闭
        return prev.map((s, i) => (i === existingIndex ? { ...s, type: null } : s));
      }

      // 找第一个空插槽
      const emptyIndex = prev.findIndex((s) => s.type === null);
      if (emptyIndex === -1) return prev; // 没有空插槽

      return prev.map((s, i) => (i === emptyIndex ? { ...s, type } : s));
    });
  }, []);

  // 移除副图
  const removeSubchart = useCallback((slotId: string) => {
    setSlots((prev) =>
      prev.map((slot) => (slot.id === slotId ? { ...slot, type: null } : slot))
    );
  }, []);

  // 清除所有副图
  const clearAllSubcharts = useCallback(() => {
    setSlots((prev) => prev.map((slot) => ({ ...slot, type: null })));
  }, []);

  // 获取活跃的副图配置
  const activeSlots = slots.filter((s) => s.type !== null);

  // 检查某类型是否已激活
  const isTypeActive = useCallback(
    (type: SubchartType) => slots.some((s) => s.type === type),
    [slots]
  );

  return {
    slots,
    activeSlots,
    setSlotContainer,
    setSlotType,
    addSubchart,
    removeSubchart,
    clearAllSubcharts,
    isTypeActive,
  };
}
