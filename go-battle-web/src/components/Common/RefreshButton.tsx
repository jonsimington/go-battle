import React, { useState } from 'react';
import { Button, Spinner } from 'react-bootstrap';
import { FaSync } from 'react-icons/fa';

interface RefreshButtonProps {
  onRefresh: () => Promise<void>;
  label?: string;
  variant?: string;
  className?: string;
  size?: 'sm' | 'lg' | undefined;
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({ 
  onRefresh, 
  label = 'Refresh Data', 
  variant = 'outline-primary',
  className = '',
  size
}) => {
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button 
      variant={variant} 
      className={className} 
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
      ) : (
        <>
          <FaSync className="me-1" />
          {label}
        </>
      )}
    </Button>
  );
};

export default RefreshButton;
