import React from 'react';
import './ELOBadge.css';
import { HistoricalElo } from '../../../models/HistoricalElo';
import { FaCaretUp, FaCaretDown, FaMinus } from 'react-icons/fa';
import { getEloTier } from '../../../utils/colors';

interface ELOBadgeProps {
  elo: number;
  className?: string;
  eloHistory?: HistoricalElo[];
}

const ELOBadge: React.FC<ELOBadgeProps> = ({ elo, className = '', eloHistory = [] }) => {
  if (elo === undefined || elo === null) {
    return null;
  }

  const tierClass = getEloTier(elo);

  // Calculate trend indicator based on ELO history
  const renderTrendIndicator = () => {
    if (!eloHistory || eloHistory.length < 2) {
      return null;
    }

    // Sort by timestamp to get the most recent entries
    const sortedHistory = [...eloHistory].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Get the current and previous ELO
    const currentElo = sortedHistory[0]?.elo;
    const previousElo = sortedHistory[1]?.elo;
    
    if (currentElo === previousElo) {
      return <FaMinus className="elo-trend elo-trend-neutral" title="No change" />;
    } else if (currentElo > previousElo) {
      const diff = currentElo - previousElo;
      return <FaCaretUp className="elo-trend elo-trend-up" title={`Increased by ${diff}`} />;
    } else {
      const diff = previousElo - currentElo;
      return <FaCaretDown className="elo-trend elo-trend-down" title={`Decreased by ${diff}`} />;
    }
  };

  return (
    <span className={`elo-badge ${tierClass} ${className}`} title={`ELO Rating: ${elo} (${tierClass.charAt(0).toUpperCase() + tierClass.slice(1)})`}>
      <span className="elo-label">ELO</span> {elo}
      {renderTrendIndicator()}
    </span>
  );
};

export default ELOBadge;
