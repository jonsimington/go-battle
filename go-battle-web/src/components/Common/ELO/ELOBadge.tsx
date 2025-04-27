import React from 'react';
import './ELOBadge.css';

interface ELOBadgeProps {
  elo: number;
  className?: string;
}

/**
 * A reusable component to display a player's ELO rating in a visually distinct badge
 * with colors that change based on the rating tier
 */
const ELOBadge: React.FC<ELOBadgeProps> = ({ elo, className = '' }) => {
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

  return (
    <span className={`elo-badge ${tierClass} ${className}`} title={`ELO Rating: ${elo} (${tierClass.charAt(0).toUpperCase() + tierClass.slice(1)})`}>
      <span className="elo-label">ELO</span> {elo}
    </span>
  );
};

export default ELOBadge;
