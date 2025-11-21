import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Lobby from './components/Lobby';
import Chat from './components/Chat';
import Voting from './components/Voting';
import JournalModal from './components/JournalModal';

// Connect to backend - uses environment variable in production
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
console.log('Connecting to server:', SERVER_URL);
const socket = io(SERVER_URL);

function App() {
    const [gameState, setGameState] = useState('LOBBY'); // LOBBY, STARTING, PLAYING, ENDED
    const [players, setPlayers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [dossier, setDossier] = useState(null);
    const [myPlayer, setMyPlayer] = useState(null);
    const [isJournalOpen, setIsJournalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('CHAT'); // CHAT, VOTING

    const [isConnected, setIsConnected] = useState(socket.connected);

    useEffect(() => {
        function onConnect() {
            console.log('Connected to server');
            setIsConnected(true);
        }

        function onDisconnect() {
            console.log('Disconnected from server');
            setIsConnected(false);
        }

        function onConnectError(err) {
            console.log('Connection error:', err);
            setIsConnected(false);
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onConnectError);

        socket.on('lobby_update', (updatedPlayers) => {
            setPlayers(updatedPlayers);
            const me = updatedPlayers.find(p => p.id === socket.id);
            if (me) setMyPlayer(me);
        });

        socket.on('game_state_change', (newState) => {
            console.log("Game State Changed to:", newState);
            setGameState(newState);
        });

        socket.on('game_started', (data) => {
            console.log("Game Started Event Received", data);
            setDossier(data);
            setGameState('PLAYING');
            if (data.players) {
                setPlayers(data.players);
                // Update myPlayer with character info
                const me = data.players.find(p => p.id === socket.id);
                if (me) {
                    setMyPlayer({ ...myPlayer, character: data.character, journal: data.journal });
                }
            }
            // Auto open journal on start
            setIsJournalOpen(true);
        });

        socket.on('receive_message', (msg) => {
            setMessages(prev => [...prev, msg]);
        });

        socket.on('game_over', (data) => {
            setGameState('ENDED');
            alert(data.message);
        });

        socket.on('error_message', (err) => {
            alert(err);
        });

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error', onConnectError);
            socket.off('lobby_update');
            socket.off('game_state_change');
            socket.off('game_started');
            socket.off('receive_message');
            socket.off('game_over');
            socket.off('error_message');
        };
    }, []);

    useEffect(() => {
        console.log("isJournalOpen state changed to:", isJournalOpen);
    }, [isJournalOpen]);

    useEffect(() => {
        console.log("dossier state changed to:", dossier);
    }, [dossier]);

    const handleStartGame = () => {
        socket.emit('start_game');
    };

    const handleVote = (targetId) => {
        if (confirm("Are you sure you want to vote to eject this player? This cannot be undone.")) {
            socket.emit('vote_player', targetId);
        }
    };

    // Render logic for the monitor screen content
    const renderScreenContent = () => {
        console.log("Rendering Screen Content. GameState:", gameState);

        if (gameState === 'STARTING') {
            return (
                <div className="flex flex-col items-center justify-center h-full bg-terminal-black text-terminal-green font-mono p-4 animate-pulse">
                    <h2 className="text-xl font-bold">ESTABLISHING SECURE CONNECTION...</h2>
                    <p className="text-sm mt-4">DECRYPTING SCENARIO DATA...</p>
                </div>
            );
        }

        if (gameState === 'LOBBY') {
            return (
                <Lobby
                    socket={socket}
                    players={players}
                    onStartGame={handleStartGame}
                />
            );
        }

        // Default to PLAYING state (chat/voting interface)
        return (
            <div className="flex flex-col h-full w-full bg-terminal-black text-terminal-green font-mono relative">
                {/* Screen Header / Tabs */}
                <div className="h-8 border-b border-terminal-green flex items-center bg-black px-2 gap-2">
                    <button
                        onClick={() => setActiveTab('CHAT')}
                        className={`px-3 h-full text-sm font-bold ${activeTab === 'CHAT' ? 'bg-terminal-green text-black' : 'hover:bg-terminal-dim/20'}`}
                    >
                        COMM_UPLINK
                    </button>
                    <button
                        onClick={() => setActiveTab('VOTING')}
                        className={`px-3 h-full text-sm font-bold ${activeTab === 'VOTING' ? 'bg-terminal-alert text-black' : 'hover:bg-terminal-alert/20 text-terminal-alert'}`}
                    >
                        VOTE_SYSTEM
                    </button>
                    <div className="ml-auto text-xs animate-pulse text-terminal-alert">
                        ⚠ EMERGENCY MODE
                    </div>
                </div>

                {/* Main Screen Area */}
                <div className="flex-1 overflow-hidden relative">
                    {activeTab === 'CHAT' ? (
                        <Chat
                            socket={socket}
                            messages={messages}
                            myPlayer={myPlayer || { character: 'Unknown' }}
                        />
                    ) : (
                        <Voting
                            players={players.length > 0 ? players : []}
                            onVote={handleVote}
                            myId={socket.id}
                        />
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="desk-bg">
            {/* The Monitor Screen */}
            <div className="monitor-screen">
                <div className="crt-overlay"></div>
                <div className="scanline"></div>
                {renderScreenContent()}
            </div>

            {/* Connection Status Overlay */}
            {!isConnected && (
                <div className="absolute top-4 right-4 bg-red-900/80 border border-red-500 text-red-100 px-4 py-2 rounded font-mono text-xs animate-pulse z-50">
                    ⚠ NO UPLINK
                </div>
            )}

            {/* Journal Trigger Area - Always visible for debugging */}
            <div
                className="journal-trigger"
                onClick={() => {
                    console.log("Journal trigger clicked! Current dossier:", dossier);
                    console.log("Setting isJournalOpen to true");
                    setIsJournalOpen(true);
                }}
                title="Open Journal"
                style={{
                    border: '3px solid red',
                    backgroundColor: 'rgba(255, 0, 0, 0.2)'
                }}
            >
                <div style={{ color: 'white', fontSize: '12px', padding: '5px' }}>
                    CLICK HERE
                </div>
            </div>

            {/* Journal Modal */}
            <JournalModal
                isOpen={isJournalOpen}
                onClose={() => {
                    console.log("Closing journal modal...");
                    setIsJournalOpen(false);
                }}
                character={dossier?.character}
                journal={dossier?.journal}
                scenarioIntro={dossier?.scenario_intro}
            />
        </div>
    );
}

export default App;
