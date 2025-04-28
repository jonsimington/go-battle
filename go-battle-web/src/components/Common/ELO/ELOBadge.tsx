import React from 'react';
import './ELOBadge.css';
import { HistoricalElo } from '../../../models/HistoricalElo';
import { FaCaretUp, FaCaretDown, FaMinus } from 'react-icons/fa';

interface ELOBadgeProps {
  elo: number;
  className?: string;
  eloHistory?: HistoricalElo[];
}

/**
 * A reusable component to display a player's ELO rating in a visually distinct badge
 * with colors that change based on the rating tier
 */
const ELOBadge: React.FC<ELOBadgeProps> = ({ elo, className = '', eloHistory = [] }) => {
  if (elo === undefined || elo === null) {
    return null;
  }

  // Determine the tier class based on ELO rating
  const getTierClass = (rating: number): string => {
    if (rating < 1200) return 'beginner';
    if (rating >= 1200 && rating <= 1399) return 'novice';
    if (rating >= 1400 && rating <= 1599) return 'intermediate';
    if (rating >= 1600 && rating <= 1799) return 'advanced';
    if (rating >= 1800 && rating <= 1999) return 'expert';
    if (rating >= 2000 && rating <= 2199) return 'master';
    return 'grandmaster'; // 2200+
  };

  const tierClass = getTierClass(elo);

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
