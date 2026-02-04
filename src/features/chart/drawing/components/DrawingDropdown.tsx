/**
 * DrawingDropdown - 画线工具下拉菜单
 * 
 * TradingView 风格的画线工具选择器
 */

import { useState, useRef, useEffect } from 'react';
import type { DrawingTool } from '../core/types';

// 画线工具图标 SVG
const ICONS = {
  horizontal: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="2" y1="8" x2="14" y2="8" />
      <circle cx="2" cy="8" r="1.5" fill="currentColor" />
      <circle cx="14" cy="8" r="1.5" fill="currentColor" />
    </svg>
  ),
  trendline: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="2" y1="12" x2="14" y2="4" />
      <circle cx="2" cy="12" r="1.5" fill="currentColor" />
      <circle cx="14" cy="4" r="1.5" fill="currentColor" />
    </svg>
  ),
  fibonacci: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
      <line x1="2" y1="3" x2="14" y2="3" />
      <line x1="2" y1="6" x2="14" y2="6" strokeDasharray="2 1" />
      <line x1="2" y1="9" x2="14" y2="9" strokeDasharray="2 1" />
      <line x1="2" y1="13" x2="14" y2="13" />
    </svg>
  ),
  drawing: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 14L6 10M6 10L10 6M10 6L14 2" />
      <line x1="2" y1="8" x2="14" y2="8" strokeDasharray="2 2" />
    </svg>
  ),
  undo: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 6L2 8L4 10" />
      <path d="M2 8H10C12 8 14 9.5 14 12" />
    </svg>
  ),
  clear: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 4L12 12M4 12L12 4" />
    </svg>
  ),
};

const TOOLS: { type: DrawingTool; label: string; icon: JSX.Element }[] = [
  { type: 'horizontal', label: '水平线', icon: ICONS.horizontal },
  { type: 'trendline', label: '趋势线', icon: ICONS.trendline },
  { type: 'fibonacci', label: '斐波那契', icon: ICONS.fibonacci },
];

interface DrawingDropdownProps {
  activeTool: DrawingTool;
  onSelectTool: (tool: DrawingTool) => void;
  onClearAll: () => void;
  onRemoveLast: () => void;
  drawingsCount: number;
  pendingPoint: boolean;
}

export function DrawingDropdown({
  activeTool,
  onSelectTool,
  onClearAll,
  onRemoveLast,
  drawingsCount,
  pendingPoint,
}: DrawingDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 获取当前工具信息
  const currentTool = TOOLS.find((t) => t.type === activeTool);

  return (
    <div ref={dropdownRef} className="relative flex items-center gap-2">
      {/* 主按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-1.5 h-7 px-2 text-xxs rounded-sm transition-colors
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35
          ${activeTool || isOpen
            ? 'bg-accent text-white'
            : 'text-text-secondary hover:bg-bg-soft/60 hover:text-text-primary'
          }
        `}
      >
        {currentTool ? currentTool.icon : ICONS.drawing}
        <span>{currentTool ? currentTool.label : '画线'}</span>
        {drawingsCount > 0 && (
          <span className="px-1 py-0.5 text-[10px] bg-white/20 rounded">
            {drawingsCount}
          </span>
        )}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>

      {/* 绘制状态提示 */}
      {activeTool && (
        <span className="hidden md:inline text-[10px] text-accent whitespace-nowrap">
          {pendingPoint ? '点击第二点' : getToolHint(activeTool)}
        </span>
      )}

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-40 bg-bg-card border border-line-dark rounded-panel shadow-xl z-tooltip overflow-hidden">
          {/* 工具列表 */}
          <div className="py-1">
            {TOOLS.map(({ type, label, icon }) => (
              <button
                key={type}
                onClick={() => {
                  onSelectTool(activeTool === type ? null : type);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center gap-2 px-3 h-8 text-xs transition-colors
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35
                  ${activeTool === type
                    ? 'bg-accent/20 text-accent'
                    : 'text-text-secondary hover:bg-bg-soft/60 hover:text-text-primary'
                  }
                `}
              >
                {icon}
                <span>{label}</span>
                {activeTool === type && (
                  <span className="ml-auto text-[10px]">✓</span>
                )}
              </button>
            ))}
          </div>

          {/* 分隔线 */}
          <div className="h-px bg-line-dark" />

          {/* 操作按钮 */}
          <div className="py-1">
            <button
              onClick={() => {
                onRemoveLast();
              }}
              disabled={drawingsCount === 0}
              className={`
                w-full flex items-center gap-2 px-3 h-8 text-xs transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35
                ${drawingsCount > 0
                  ? 'text-text-secondary hover:bg-bg-soft/60 hover:text-text-primary'
                  : 'text-text-tertiary cursor-not-allowed'
                }
              `}
            >
              {ICONS.undo}
              <span>撤销最后</span>
            </button>
            <button
              onClick={() => {
                onClearAll();
                setIsOpen(false);
              }}
              disabled={drawingsCount === 0}
              className={`
                w-full flex items-center gap-2 px-3 h-8 text-xs transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35
                ${drawingsCount > 0
                  ? 'text-down hover:bg-down-bg'
                  : 'text-text-tertiary cursor-not-allowed'
                }
              `}
            >
              {ICONS.clear}
              <span>清除所有</span>
              {drawingsCount > 0 && (
                <span className="ml-auto text-[10px] opacity-60">({drawingsCount})</span>
              )}
            </button>
          </div>
        </div>
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
