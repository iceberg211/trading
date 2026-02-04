export type ConnectionState = 'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'syncing';

export type ConnectionStatusProps = {
  status: ConnectionState;
  variant?: 'badge' | 'dot' | 'full';
  showLabel?: boolean;
  className?: string;
};

const STATUS_CONFIG = {
  connected: {
    label: 'Live',
    color: 'bg-up/10 text-up',
    dotColor: 'bg-up',
    pulse: false,
  },
  syncing: {
    label: 'Syncing',
    color: 'bg-accent/10 text-accent',
    dotColor: 'bg-accent',
    pulse: true,
  },
  connecting: {
    label: '...',
    color: 'bg-accent/10 text-accent',
    dotColor: 'bg-accent',
    pulse: true,
  },
  reconnecting: {
    label: 'Retry',
    color: 'bg-accent/10 text-accent',
    dotColor: 'bg-yellow-400',
    pulse: true,
  },
  disconnected: {
    label: 'Off',
    color: 'bg-down/10 text-down',
    dotColor: 'bg-down',
    pulse: false,
  },
} as const;

/**
 * 统一的 WebSocket 连接状态指示器
 * 
 * @example
 * // 徽章模式（用于标题栏）
 * <ConnectionStatus status="connected" variant="badge" />
 * 
 * // 圆点模式
 * <ConnectionStatus status="syncing" variant="dot" showLabel />
 * 
 * // 完整模式（用于状态栏）
 * <ConnectionStatus status="connected" variant="full" />
 */
export function ConnectionStatus({ 
  status, 
  variant = 'badge',
  showLabel = true,
  className = '',
}: ConnectionStatusProps) {
  const config = STATUS_CONFIG[status];
  const pulseClass = config.pulse ? 'animate-pulse' : '';

  // Badge 模式：带背景的徽章
  if (variant === 'badge') {
    return (
      <span
        className={`
          px-1.5 py-0.5 rounded text-[10px] font-medium
          ${config.color} ${pulseClass} ${className}
        `}
      >
        {config.label}
      </span>
    );
  }

  // Dot 模式：小圆点 + 可选文字
  if (variant === 'dot') {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${config.dotColor} ${pulseClass}`} />
        {showLabel && (
          <span className={`text-[10px] font-medium ${config.color.split(' ')[1]}`}>
            {config.label}
          </span>
        )}
      </div>
    );
  }

  // Full 模式：完整状态栏（类似 K 线图）
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span className="text-text-secondary text-[10px]">WS:</span>
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${config.color} ${pulseClass}`}>
        {config.label}
      </span>
    </div>
  );
}
