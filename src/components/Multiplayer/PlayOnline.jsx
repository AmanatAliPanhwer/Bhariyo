import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Sword, User } from 'lucide-react';
import './PlayOnline.css';

export default function PlayOnline({ supabase, channel, onlineUsers }) {
  const { user } = useAuth();

  const sendChallenge = (targetUser) => {
    const challengeId = Math.random().toString(36).substring(7);
    channel.send({
      type: 'broadcast',
      event: 'challenge',
      payload: {
        to: targetUser.username,
        from: user.username,
        elo: user.elo || 200,
        challengeId
      }
    });
    alert(`Challenge sent to ${targetUser.username}`);
  };

  return (
    <div className="play-online-container">
      <header className="play-online-header">
        <h1>Play Online</h1>
        <p>Challenge players from around the world</p>
      </header>

      <div className="online-list-section">
        <div className="list-header">
          <h2>Online Players ({onlineUsers.length})</h2>
        </div>

        <div className="players-grid">
          {onlineUsers.length === 0 ? (
            <div className="empty-state chess-card">
              <User size={48} opacity={0.3} />
              <p>No other players are currently online.</p>
              <span className="subtitle">Invite a friend to join and play!</span>
            </div>
          ) : (
            onlineUsers.map((player) => (
              <div key={player.username} className="player-challenge-card chess-card">
                <div className="player-info">
                  <div className="player-avatar">
                    {player.username[0].toUpperCase()}
                    <span className={`status-dot ${player.status.toLowerCase()}`}></span>
                  </div>
                  <div className="player-details">
                    <span className="player-name">{player.username}</span>
                    <span className="player-elo">Rating: {player.elo || 200}</span>
                    <span className="player-status">{player.status === 'AVAILABLE' ? 'Available' : 'In Game'}</span>
                  </div>
                </div>
                
                <button 
                  className="btn-chess btn-chess-primary challenge-btn"
                  disabled={player.status !== 'AVAILABLE'}
                  onClick={() => sendChallenge(player)}
                >
                  <Sword size={18} />
                  <span>Challenge</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
