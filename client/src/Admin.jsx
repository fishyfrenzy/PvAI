import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

function Admin() {
    const [socket, setSocket] = useState(null);
    const [rooms, setRooms] = useState([]);
    const [adminKey, setAdminKey] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isAuthenticated && !socket) {
            const newSocket = io(SERVER_URL);
            setSocket(newSocket);

            newSocket.on('admin_rooms_update', (roomsData) => {
                setRooms(roomsData);
            });

            newSocket.emit('admin_auth', adminKey);
            newSocket.emit('admin_get_rooms');

            // Refresh every 5 seconds
            const interval = setInterval(() => {
                newSocket.emit('admin_get_rooms');
            }, 5000);

            return () => {
                clearInterval(interval);
                newSocket.close();
            };
        }
    }, [isAuthenticated, adminKey]);

    const handleAuth = (e) => {
        e.preventDefault();
        // Simple auth - in production, this should be more secure
        if (adminKey === 'admin123') {
            setIsAuthenticated(true);
            setError('');
        } else {
            setError('Invalid admin key');
        }
    };

    const handleCloseRoom = (roomId) => {
        if (confirm(`Close room ${roomId}?`)) {
            socket.emit('admin_close_room', roomId);
        }
    };

    const handleKickPlayer = (roomId, playerId) => {
        if (confirm('Kick this player?')) {
            socket.emit('admin_kick_player', { roomId, playerId });
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-black text-terminal-green font-mono flex items-center justify-center">
                <div className="border border-terminal-green p-8 max-w-md w-full bg-black/90">
                    <h1 className="text-2xl font-bold mb-6 text-center">ADMIN ACCESS</h1>
                    <form onSubmit={handleAuth} className="space-y-4">
                        <div>
                            <label className="block text-sm mb-2">ADMIN KEY</label>
                            <input
                                type="password"
                                value={adminKey}
                                onChange={(e) => setAdminKey(e.target.value)}
                                className="w-full bg-black border border-terminal-green text-terminal-green p-2 focus:outline-none focus:border-cyan-400"
                                placeholder="Enter admin key..."
                            />
                        </div>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <button
                            type="submit"
                            className="w-full bg-terminal-green text-black font-bold py-2 px-4 hover:bg-cyan-400 transition-colors"
                        >
                            AUTHENTICATE
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-terminal-green font-mono p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">ADMIN DASHBOARD</h1>
                    <button
                        onClick={() => setIsAuthenticated(false)}
                        className="border border-terminal-alert text-terminal-alert px-4 py-2 hover:bg-terminal-alert hover:text-black transition-colors"
                    >
                        LOGOUT
                    </button>
                </div>

                <div className="grid gap-6">
                    <div className="border border-terminal-green p-4 bg-black/90">
                        <h2 className="text-xl font-bold mb-4">ACTIVE ROOMS ({rooms.length})</h2>
                        {rooms.length === 0 ? (
                            <p className="text-terminal-dim">No active rooms</p>
                        ) : (
                            <div className="space-y-4">
                                {rooms.map((room) => (
                                    <div key={room.id} className="border border-terminal-dim p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="text-lg font-bold text-cyan-400">ROOM: {room.id}</h3>
                                                <p className="text-sm text-terminal-dim">
                                                    State: <span className="text-yellow-400">{room.gameState}</span>
                                                </p>
                                                <p className="text-sm text-terminal-dim">
                                                    Players: {room.playerCount} | Messages: {room.messageCount}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleCloseRoom(room.id)}
                                                className="border border-terminal-alert text-terminal-alert px-3 py-1 text-xs hover:bg-terminal-alert hover:text-black transition-colors"
                                            >
                                                CLOSE ROOM
                                            </button>
                                        </div>

                                        <div className="mt-3 border-t border-terminal-dim pt-3">
                                            <p className="text-xs text-terminal-dim mb-2">PLAYERS:</p>
                                            <div className="space-y-1">
                                                {room.players.map((player) => (
                                                    <div key={player.id} className="flex justify-between items-center text-sm">
                                                        <span>
                                                            {player.name}
                                                            {player.character && <span className="text-yellow-400"> ({player.character})</span>}
                                                            {player.isBot && <span className="text-red-400"> [BOT]</span>}
                                                        </span>
                                                        {!player.isBot && (
                                                            <button
                                                                onClick={() => handleKickPlayer(room.id, player.id)}
                                                                className="text-xs text-terminal-alert hover:underline"
                                                            >
                                                                KICK
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Admin;
