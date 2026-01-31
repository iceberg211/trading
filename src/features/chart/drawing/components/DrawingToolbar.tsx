/**
 * DrawingToolbar - 画线工具栏组件
 * 
 * 独立的画线工具选择器
 */

import type { DrawingTool } from '../core/types';

interface DrawingToolbarProps {
  activeTool: DrawingTool;
  onSelectTool: (tool: DrawingTool) => void;
  onClearAll: () => void;
  onRemoveLast: () => void;
  drawingsCount: number;
  pendingPoint: boolean;
}

const TOOLS: { type: DrawingTool; label: string; icon: string }[] = [
  { type: 'horizontal', label: '水平线', icon: '—' },
  { type: 'trendline', label: '趋势线', icon: '╱' },
  { type: 'fibonacci', label: '斐波那契', icon: 'Fib' },
];

export function DrawingToolbar({
  activeTool,
  onSelectTool,
  onClearAll,
  onRemoveLast,
  drawingsCount,
  pendingPoint,
}: DrawingToolbarProps) {
  return (
    <div className="flex items-center gap-1">
      {/* 工具按钮 */}
      {TOOLS.map(({ type, label, icon }) => (
        <button
          key={type}
          onClick={() => onSelectTool(activeTool === type ? null : type)}
          className={`
            px-2 py-1 text-xs rounded transition-colors min-w-[28px]
            ${activeTool === type
              ? 'bg-accent text-white'
              : 'text-text-secondary hover:bg-bg-soft hover:text-text-primary'
            }
          `}
          title={label}
        >
          {icon}
        </button>
      ))}

      {/* 分隔线 */}
      <div className="w-px h-4 bg-line-dark mx-1" />

      {/* 撤销按钮 */}
      <button
        onClick={onRemoveLast}
        disabled={drawingsCount === 0}
        className={`
          px-2 py-1 text-xs rounded transition-colors
          ${drawingsCount > 0
            ? 'text-text-secondary hover:bg-bg-soft hover:text-text-primary'
            : 'text-text-tertiary cursor-not-allowed'
          }
        `}
        title="撤销最后一条"
      >
        ↩
      </button>

      {/* 清除按钮 */}
      <button
        onClick={onClearAll}
        disabled={drawingsCount === 0}
        className={`
          px-2 py-1 text-xs rounded transition-colors
          ${drawingsCount > 0
            ? 'text-down hover:bg-down-bg'
            : 'text-text-tertiary cursor-not-allowed'
          }
        `}
        title="清除所有画线"
      >
        ✕
      </button>

      {/* 画线数量 */}
      {drawingsCount > 0 && (
        <span className="text-[10px] text-text-tertiary ml-1">
          ({drawingsCount})
        </span>
      )}

      {/* 绘制状态提示 */}
      {activeTool && (
        <span className="text-[10px] text-accent ml-2 animate-pulse">
          {pendingPoint ? '点击第二点完成' : getToolHint(activeTool)}
        </span>
      )}
    </div>
  );
}

function getToolHint(tool: DrawingTool): string {
  switch (tool) {
    case 'horizontal':
      return '点击设置水平线';
    case 'trendline':
      return '点击第一点';
    case 'fibonacci':
      return '点击起点';
    default:
      return '';
  }
}
