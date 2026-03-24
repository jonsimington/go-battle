import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaSync, FaClock } from 'react-icons/fa';
import s from './RefreshButton.module.css';

interface RefreshButtonProps {
  onRefresh: () => Promise<void>;
  label?: string;
  className?: string;
  size?: 'sm' | 'lg' | undefined;
}

// Auto-refresh interval options in seconds
const AUTO_REFRESH_INTERVALS = [
  { label: '5 seconds', value: 5 },
  { label: '15 seconds', value: 15 },
  { label: '30 seconds', value: 30 },
  { label: '1 minute', value: 60 },
  { label: '5 minutes', value: 300 },
];

export const RefreshButton: React.FC<RefreshButtonProps> = ({ 
  onRefresh, 
  label = 'Refresh', 
  className = '',
}) => {
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, onRefresh]);

  // Effect for handling auto-refresh
  useEffect(() => {
    if (!autoRefreshInterval) return;

    handleRefresh();
    let remaining = autoRefreshInterval;
    setTimeRemaining(remaining);

    const id = setInterval(() => {
      remaining -= 1;
      setTimeRemaining(remaining);
      if (remaining <= 0) {
        handleRefresh();
        remaining = autoRefreshInterval;
        setTimeRemaining(autoRefreshInterval);
      }
    }, 1000);
    timerRef.current = id;

    return () => clearInterval(id);
  }, [autoRefreshInterval]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopAutoRefresh = () => {
    setAutoRefreshInterval(null);
    setTimeRemaining(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const btnClass = `${s.btn} ${s.btnWithSplit} ${autoRefreshInterval ? s.btnActive : ''}`;

  return (
    <div ref={wrapperRef} className={`${s.wrapper} ${className}`}>
      <button
        className={btnClass}
        onClick={handleRefresh}
        disabled={isRefreshing}
      >
        {isRefreshing ? (
          <FaSync className={s.spinner} />
        ) : (
          <FaSync className={s.icon} />
        )}
        {isRefreshing
          ? 'Refreshing…'
          : autoRefreshInterval
            ? `Auto (${timeRemaining}s)`
            : label}
      </button>

      <button
        className={s.splitBtn}
        onClick={() => setMenuOpen(prev => !prev)}
        aria-label="Auto-refresh options"
      >
        ▾
      </button>

      {menuOpen && (
        <div className={s.menu}>
          <div className={s.menuHeader}>Auto-refresh</div>
          {AUTO_REFRESH_INTERVALS.map((interval) => (
            <button 
              key={interval.value}
              className={`${s.menuItem} ${autoRefreshInterval === interval.value ? s.menuItemActive : ''}`}
              onClick={() => {
                setAutoRefreshInterval(interval.value);
                setMenuOpen(false);
              }}
            >
              <FaClock />
              Every {interval.label}
            </button>
          ))}
          {autoRefreshInterval && (
            <>
              <div className={s.menuDivider} />
              <button
                className={s.menuItem}
                onClick={() => { stopAutoRefresh(); setMenuOpen(false); }}
              >
                Turn off auto-refresh
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default RefreshButton;
