import React, { useState, useEffect, useRef } from 'react';
import { Button, Spinner, Dropdown, ButtonGroup } from 'react-bootstrap';
import { FaSync, FaClock } from 'react-icons/fa';

interface RefreshButtonProps {
  onRefresh: () => Promise<void>;
  label?: string;
  variant?: string;
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
  label = 'Refresh Data', 
  variant = 'outline-primary',
  className = '',
  size
}) => {
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Effect for handling auto-refresh
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    const refreshCycle = () => {
      if (autoRefreshInterval) {
        setTimeRemaining(autoRefreshInterval);
        
        let remaining = autoRefreshInterval;
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        
        timerRef.current = setInterval(() => {
          remaining -= 1;
          setTimeRemaining(remaining);
          
          if (remaining <= 0) {
            handleRefresh();
            remaining = autoRefreshInterval;
            setTimeRemaining(autoRefreshInterval);
          }
        }, 1000);
        
        timer = timerRef.current;
      }
    };
    
    if (autoRefreshInterval) {
      handleRefresh(); // Initial refresh
      refreshCycle();
    }
    
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [autoRefreshInterval]); // Re-run effect when autoRefreshInterval changes
  
  const startAutoRefresh = (seconds: number) => {
    setAutoRefreshInterval(seconds);
  };

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
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return (
    <Dropdown as={ButtonGroup} className={className}>
      <Button 
        variant={variant}
        onClick={handleRefresh}
        disabled={isRefreshing}
        size={size}
      >
        {isRefreshing ? (
          <>
            <Spinner
              as="span"
              animation="border"
              size="sm"
              role="status"
              aria-hidden="true"
              className="me-1"
            />
            Refreshing...
          </>
        ) : autoRefreshInterval ? (
          <>
            <FaSync className="me-1" />
            {`Auto (${timeRemaining}s)`}
          </>
        ) : (
          <>
            <FaSync className="me-1" />
            {label}
          </>
        )}
      </Button>

      <Dropdown.Toggle
        split
        variant={variant}
        disabled={isRefreshing}
        size={size}
        id="refresh-dropdown"
      />

      <Dropdown.Menu>
        <Dropdown.Header>Auto-refresh</Dropdown.Header>
        {AUTO_REFRESH_INTERVALS.map((interval) => (
          <Dropdown.Item 
            key={interval.value}
            onClick={() => startAutoRefresh(interval.value)}
            active={autoRefreshInterval === interval.value}
          >
            <FaClock className="me-2" />
            Every {interval.label}
          </Dropdown.Item>
        ))}
        {autoRefreshInterval && (
          <>
            <Dropdown.Divider />
            <Dropdown.Item onClick={stopAutoRefresh}>
              Turn off auto-refresh
            </Dropdown.Item>
          </>
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default RefreshButton;
