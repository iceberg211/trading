/**
 * 副图面板组件
 * 
 * 渲染单个副图插槽
 */

import { useRef, useEffect } from 'react';
import type { SubchartType } from '../hooks/useSubchartSlots';

interface SubchartPanelProps {
  slotId: string;
  type: SubchartType;
  onSetContainer: (slotId: string, container: HTMLDivElement | null) => void;
  onRemove: (slotId: string) => void;
}

const SUBCHART_HEIGHT = 160;

export function SubchartPanel({ slotId, type, onSetContainer, onRemove }: SubchartPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 当 type 存在且 container 准备好时注册
  useEffect(() => {
    // 只有当 type 有值时才注册
    if (!type) return;
    
    // 使用 requestAnimationFrame 确保 DOM 已渲染
    const rafId = requestAnimationFrame(() => {
      if (containerRef.current) {
        onSetContainer(slotId, containerRef.current);
      }
    });
    
    return () => {
      cancelAnimationFrame(rafId);
      // 清理时注销
      onSetContainer(slotId, null);
    };
  }, [slotId, type, onSetContainer]);

  // 不显示空的副图
  if (!type) return null;

  return (
    <div className="border-t border-line-dark">
      <div className="flex items-center justify-between px-3 py-0.5 bg-bg-soft text-[10px]">
        <span className="text-text-secondary font-medium">{type}</span>
        <button
          onClick={() => onRemove(slotId)}
          className="text-text-tertiary hover:text-text-primary transition-colors"
          aria-label={`关闭 ${type}`}
        >
          ✕
        </button>
      </div>
      <div ref={containerRef} style={{ height: SUBCHART_HEIGHT }} />
    </div>
  );
}
