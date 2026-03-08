import React from 'react';
import './MatchTimer.css';
import { Clock } from 'lucide-react';

export default function MatchTimer({ seconds, isActive }) {
  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isLow = seconds < 30;

  return (
    <div className={`match-timer ${isActive ? 'active' : ''} ${isLow ? 'low' : ''}`}>
      <Clock size={16} />
      <span className="time-display">{formatTime(seconds)}</span>
    </div>
  );
}
