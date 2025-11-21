import React, { useState } from 'react';

const Lobby = ({ socket, players, onStartGame }) => {
    const [username, setUsername] = useState('');
    const [joined, setJoined] = useState(false);

    const handleJoin = () => {
        if (username.trim()) {
            socket.emit('join_lobby', username);
            setJoined(true);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full bg-terminal-black text-terminal-green font-mono p-4 relative">
            <h1 className="text-2xl mb-4 font-bold tracking-widest animate-pulse">THE TURING TRAP</h1>

            {!joined ? (
                <div className="border border-terminal-green p-4 rounded shadow-[0_0_10px_#00ff41] w-full max-w-xs">
                    <p className="mb-2 text-sm">ENTER IDENTITY_</p>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="bg-black border-b border-terminal-green text-terminal-green focus:outline-none w-full mb-4 text-lg p-1"
                        placeholder="CODENAME"
                        onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                    />
                    <button
                        onClick={handleJoin}
                        className="w-full bg-terminal-dim hover:bg-terminal-green text-black font-bold py-2 px-4 rounded transition-colors text-sm"
                    >
                        INITIALIZE UPLINK
                    </button>
                </div>
            ) : (
                <div className="w-full max-w-xs">
                    <div className="border border-terminal-green p-2 mb-4 min-h-[150px] text-sm">
                        <h2 className="border-b border-terminal-green mb-2 pb-1">CONNECTED AGENTS:</h2>
                        <ul>
                            {players.map((p) => (
                                <li key={p.id} className="mb-1 flex justify-between">
                                    <span>{p.name}</span>
                                    <span className="text-xs opacity-50">{p.id === socket.id ? '[YOU]' : '[ONLINE]'}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <button
                        onClick={onStartGame}
                        className="w-full border border-terminal-green hover:bg-terminal-green hover:text-black text-terminal-green font-bold py-2 px-4 transition-all uppercase tracking-widest text-sm"
                    >
                        EXECUTE SCENARIO
                    </button>
                    <p className="text-[10px] text-center mt-2 opacity-50">WAITING FOR DIRECTOR...</p>
                </div>
            )}
        </div>
    );
};

export default Lobby;
