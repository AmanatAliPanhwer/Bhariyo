import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Sword, User } from 'lucide-react';
import './PlayOnline.css';

export default function PlayOnline({ socket, onChallenge }) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (socket) {
      socket.emit('register_online', { username: user.username, id: user.id });
      
      socket.on('online_users_update', (users) => {
        // Filter out self
        const others = users.filter(u => u.username !== user.username);
        setOnlineUsers(others);
      });

      return () => {
        socket.off('online_users_update');
      };
    }
  }, [socket, user]);

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
              <div key={player.socketId} className="player-challenge-card chess-card">
                <div className="player-info">
                  <div className="player-avatar">
                    {player.username[0].toUpperCase()}
                    <span className={`status-dot ${player.status.toLowerCase()}`}></span>
                  </div>
                  <div className="player-details">
                    <span className="player-name">{player.username}</span>
                    <span className="player-status">{player.status === 'AVAILABLE' ? 'Available' : 'In Game'}</span>
                  </div>
                </div>
                
                <button 
                  className="btn-chess btn-chess-primary challenge-btn"
                  disabled={player.status !== 'AVAILABLE'}
                  onClick={() => socket.emit('send_challenge', player.socketId)}
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
