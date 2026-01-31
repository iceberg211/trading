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

const SUBCHART_HEIGHT = 100;

export function SubchartPanel({ slotId, type, onSetContainer, onRemove }: SubchartPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const registeredRef = useRef(false);

  // 只在挂载时注册一次
  useEffect(() => {
    if (containerRef.current && !registeredRef.current) {
      onSetContainer(slotId, containerRef.current);
      registeredRef.current = true;
    }
    
    return () => {
      if (registeredRef.current) {
        onSetContainer(slotId, null);
        registeredRef.current = false;
      }
    };
  }, [slotId, onSetContainer]);

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
