import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './Lobby.css';

export default function Lobby({ socket, onJoinRoom, onCreateRoom }) {
  const [rooms, setRooms] = useState([]);
  const [roomName, setRoomName] = useState('');
  const { user, logout } = useAuth();

  useEffect(() => {
    if (socket) {
      socket.emit('join_lobby');
      socket.on('lobby_update', (availableRooms) => {
        setRooms(availableRooms);
      });
      return () => socket.off('lobby_update');
    }
  }, [socket]);

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!roomName.trim()) return;
    onCreateRoom(roomName);
    setRoomName('');
  };

  return (
    <div className="lobby-container">
      <header className="lobby-header">
        <h1>Multiplayer Lobby</h1>
      </header>

      <section className="lobby-actions">
        <form onSubmit={handleCreateRoom} className="create-room-form">
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Room Name..."
            required
          />
          <button type="submit">Create New Game</button>
        </form>
      </section>

      <section className="room-list">
        <h2>Available Games</h2>
        {rooms.length === 0 ? (
          <div className="no-rooms">
            <p>No active rooms found. Create one to start playing!</p>
          </div>
        ) : (
          <div className="rooms-grid">
            {rooms.map((room) => (
              <div key={room.id} className="room-card glass-morphism">
                <div className="room-info">
                  <h3>{room.name}</h3>
                  <p>Host: {room.players[0].username}</p>
                </div>
                <button onClick={() => onJoinRoom(room.id)} className="join-btn">Join Match</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
