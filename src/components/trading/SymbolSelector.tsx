import { useState, useRef, useEffect } from 'react';
import { useAtom } from 'jotai';
import { symbolConfigAtom, POPULAR_SYMBOLS, SymbolConfig } from '@/features/symbol/atoms/symbolAtom';
import { Card } from '@/components/ui';

export function SymbolSelector() {
  const [currentSymbol, setCurrentSymbol] = useAtom(symbolConfigAtom);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (symbol: SymbolConfig) => {
    setCurrentSymbol(symbol);
    setIsOpen(false);
  };

  // ESC 关闭
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:bg-bg-soft/60 px-2 h-7 rounded-sm transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
      >
        <span className="font-heading text-lg font-bold text-text-primary group-hover:text-accent transition-colors">
          {currentSymbol.baseAsset}/{currentSymbol.quoteAsset}
        </span>
        <svg
          className={`w-3 h-3 text-text-tertiary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <Card
          noPadding
          className="absolute left-0 top-full mt-2 min-w-[220px] z-[70] shadow-xl max-h-64 overflow-y-auto"
        >
          <div className="py-1">
            {POPULAR_SYMBOLS.map((item) => (
              <button
                key={item.symbol}
                onClick={() => handleSelect(item)}
                className={`
                  w-full px-4 py-2 text-left text-sm flex items-center justify-between hover:bg-bg-hover
                  ${currentSymbol.symbol === item.symbol ? 'text-accent bg-bg-hover/50' : 'text-text-primary'}
                `}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{item.baseAsset}/{item.quoteAsset}</span>
                  <span className="text-[10px] text-text-tertiary">Spot</span>
                </div>
                {currentSymbol.symbol === item.symbol && (
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                )}
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
