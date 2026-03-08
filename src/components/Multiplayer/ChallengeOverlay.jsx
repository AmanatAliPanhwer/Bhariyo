import React from 'react';
import { Sword, X } from 'lucide-react';
import './ChallengeOverlay.css';

export default function ChallengeOverlay({ challenge, onAccept, onDecline }) {
  if (!challenge) return null;

  return (
    <div className="challenge-overlay">
      <div className="challenge-card auth-card">
        <div className="challenge-icon-ring">
          <Sword size={40} className="challenge-sword-icon" />
        </div>
        
        <div className="challenge-content">
          <h2>Challenge!</h2>
          <p>
            <span className="challenger-name">{challenge.from.username}</span> 
            has challenged you to a match.
          </p>
        </div>

        <div className="challenge-actions">
          <button 
            className="btn-chess btn-chess-primary accept-btn"
            onClick={() => onAccept(challenge.challengeId)}
          >
            Accept
          </button>
          <button 
            className="btn-chess btn-chess-secondary decline-btn"
            onClick={() => onDecline(challenge.challengeId)}
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
