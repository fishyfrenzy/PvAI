import React, { useState, useEffect } from 'react';

const Lobby = ({ socket, players, onStartGame }) => {
    const [username, setUsername] = useState('');
    const [roomId, setRoomId] = useState('');
    const [isCreating, setIsCreating] = useState(true);
    const [error, setError] = useState('');

    // Determine if we are joined based on if we exist in the players list
    const amIJoined = players.some(p => p.id === socket.id);

    const handleJoin = () => {
        if (!username.trim() || !roomId.trim()) {
            setError('IDENTITY AND COORDINATES REQUIRED');
            return;
        }
        setError('');
        socket.emit('join_lobby', {
            username,
            roomId,
            create: isCreating
        });
    };

    const handleCloseServer = () => {
        if (confirm('Are you sure you want to close this server? All players will be disconnected.')) {
            socket.emit('close_server');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full bg-terminal-black text-terminal-green font-mono p-4 relative">
            <h1 className="text-2xl mb-4 font-bold tracking-widest animate-pulse">THE TURING TRAP</h1>

            {!amIJoined ? (
                <div className="border border-terminal-green p-4 rounded shadow-[0_0_10px_#00ff41] w-full max-w-xs relative bg-black/90">
                    {/* Mode Toggle */}
                    <div className="flex mb-4 border-b border-terminal-green/30 pb-2">
                        <button
                            onClick={() => setIsCreating(true)}
                            className={`flex-1 text-xs font-bold py-1 ${isCreating ? 'bg-terminal-green text-black' : 'text-terminal-green hover:bg-terminal-dim/20'}`}
                        >
                            CREATE SERVER
                        </button>
                        <button
                            onClick={() => setIsCreating(false)}
                            className={`flex-1 text-xs font-bold py-1 ${!isCreating ? 'bg-terminal-green text-black' : 'text-terminal-green hover:bg-terminal-dim/20'}`}
                        >
                            JOIN SERVER
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <p className="mb-1 text-[10px] opacity-70">CODENAME_</p>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="bg-black border-b border-terminal-green text-terminal-green focus:outline-none w-full text-lg p-1 placeholder-terminal-green/30"
                                placeholder="ENTER NAME"
                            />
                        </div>

                        <div>
                            <p className="mb-1 text-[10px] opacity-70">SERVER_COORDINATES_</p>
                            <input
                                type="text"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                className="bg-black border-b border-terminal-green text-terminal-green focus:outline-none w-full text-lg p-1 placeholder-terminal-green/30"
                                placeholder="ROOM ID"
                                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                            />
                        </div>
                    </div>

                    {error && (
                        <p className="text-terminal-alert text-xs mt-2 animate-pulse">ERROR: {error}</p>
                    )}

                    <button
                        onClick={handleJoin}
                        className="w-full bg-terminal-dim hover:bg-terminal-green text-black font-bold py-2 px-4 rounded transition-colors text-sm mt-6"
                    >
                        {isCreating ? 'INITIALIZE SERVER' : 'ESTABLISH UPLINK'}
                    </button>
                </div>
            ) : (
                <div className="w-full max-w-xs">
                    <div className="border border-terminal-green p-2 mb-4 min-h-[150px] text-sm bg-black/90">
                        <div className="flex justify-between items-center border-b border-terminal-green mb-2 pb-1">
                            <h2 className="">SERVER: {roomId}</h2>
                            <span className="text-[10px] animate-pulse">● LIVE</span>
                        </div>
                        <p className="text-[10px] mb-2 opacity-70">CONNECTED AGENTS:</p>
                        <ul>
                            {players.map((p) => (
                                <li key={p.id} className="mb-1 flex justify-between items-center group">
                                    <span>{p.name}</span>
                                    <span className="text-[10px] opacity-50 group-hover:opacity-100 transition-opacity">
                                        {p.id === socket.id ? '[YOU]' : `[ID:${p.id.substr(0, 4)}]`}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <button
                        onClick={onStartGame}
                        className="w-full border border-terminal-green hover:bg-terminal-green hover:text-black text-terminal-green font-bold py-2 px-4 transition-all uppercase tracking-widest text-sm shadow-[0_0_5px_#00ff41]"
                    >
                        EXECUTE SCENARIO
                    </button>

                    {/* Show close button only to the first player (host) */}
                    {players.length > 0 && players[0].id === socket.id && (
                        <button
                            onClick={handleCloseServer}
                            className="w-full mt-2 border border-terminal-alert hover:bg-terminal-alert hover:text-black text-terminal-alert font-bold py-2 px-4 transition-all uppercase tracking-widest text-xs"
                        >
                            CLOSE SERVER
                        </button>
                    )}

                    <p className="text-[10px] text-center mt-2 opacity-50">WAITING FOR DIRECTOR...</p>
                </div>
            )}
        </div>
    );
};

export default Lobby;
