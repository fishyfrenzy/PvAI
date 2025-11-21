// src/App.jsx
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Lobby from './components/Lobby';
import Chat from './components/Chat';
import Voting from './components/Voting';
import JournalModal from './components/JournalModal';

// Backend URL – falls back to localhost for dev
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

function App() {
    // Core UI state
    const [gameState, setGameState] = useState('LOBBY'); // LOBBY, STARTING, PLAYING, ENDED
    const [players, setPlayers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [dossier, setDossier] = useState(null);
    const [myPlayer, setMyPlayer] = useState(null);
    const [isJournalOpen, setIsJournalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('CHAT'); // CHAT or VOTING
    const [isConnected, setIsConnected] = useState(false);
    const [socket, setSocket] = useState(null);

    // ---------------------------------------------------------------------
    // Socket initialization – runs once on mount
    // ---------------------------------------------------------------------
    useEffect(() => {
        const s = io(SERVER_URL);
        setSocket(s);
        console.log('Socket created, connecting to', SERVER_URL);

        const onConnect = () => {
            console.log('Connected to server');
            setIsConnected(true);
            s.emit('get_game_state');
        };
        const onDisconnect = () => {
            console.log('Disconnected from server');
            setIsConnected(false);
        };
        const onConnectError = (err) => {
            console.log('Connection error:', err);
            setIsConnected(false);
        };
        const onLobbyUpdate = (updatedPlayers) => {
            console.log('Lobby update received:', updatedPlayers);
            setPlayers(updatedPlayers);
            const me = updatedPlayers.find((p) => p.id === s.id);
            if (me) {
                console.log('Updating myPlayer from lobby_update:', me);
                setMyPlayer(me);
            }
        };
        const onGameStateChange = (newState) => {
            console.log('Game State Changed to:', newState);
            setGameState(newState);
        };
        const onGameStarted = (data) => {
            console.log('=== GAME STARTED EVENT ===');
            console.log('Data received:', data);
            console.log('My socket ID:', s.id);
            setDossier(data);
            setGameState('PLAYING');
            if (data.players) {
                setPlayers(data.players);
                const me = data.players.find((p) => p.id === s.id);
                if (me) {
                    console.log('Updating myPlayer to:', me);
                    setMyPlayer(me);
                } else {
                    // Fallback: if 'me' isn't found in the players list (which might just be names/chars),
                    // construct a temporary object with the character from the dossier.
                    console.warn('Could not find self in players list, using dossier data');
                    setMyPlayer({
                        id: s.id,
                        character: data.character,
                        journal: data.journal
                    });
                }
            }
            setIsJournalOpen(true);
        };
        const onReceiveMessage = (msg) => {
            setMessages((prev) => [...prev, msg]);
        };
        const onGameOver = (data) => {
            setGameState('ENDED');
            alert(data.message);
        };
        const onErrorMessage = (err) => {
            alert(err);
        };

        s.on('connect', onConnect);
        s.on('disconnect', onDisconnect);
        s.on('connect_error', onConnectError);
        s.on('lobby_update', onLobbyUpdate);
        s.on('game_state_change', onGameStateChange);
        s.on('game_started', onGameStarted);
        s.on('receive_message', onReceiveMessage);
        s.on('game_over', onGameOver);
        s.on('error_message', onErrorMessage);

        // Cleanup on unmount
        return () => {
            s.off('connect', onConnect);
            s.off('disconnect', onDisconnect);
            s.off('connect_error', onConnectError);
            s.off('lobby_update', onLobbyUpdate);
            s.off('game_state_change', onGameStateChange);
            s.off('game_started', onGameStarted);
            s.off('receive_message', onReceiveMessage);
            s.off('game_over', onGameOver);
            s.off('error_message', onErrorMessage);
            s.disconnect();
        };
    }, []);

    // ---------------------------------------------------------------------
    // UI helpers
    // ---------------------------------------------------------------------
    const handleStartGame = () => {
        if (socket) socket.emit('start_game');
    };

    const handleVote = (targetId) => {
        if (socket && confirm('Are you sure you want to vote to eject this player? This cannot be undone.')) {
            socket.emit('vote_player', targetId);
        }
    };

    // ---------------------------------------------------------------------
    // Render helpers
    // ---------------------------------------------------------------------
    const renderScreenContent = () => {
        console.log('Rendering screen, state:', gameState);
        if (gameState === 'STARTING') {
            // Safety timeout: if stuck in STARTING for too long, ask for state
            setTimeout(() => {
                if (gameState === 'STARTING' && socket) {
                    console.log('Stuck in STARTING, requesting state update...');
                    socket.emit('get_game_state');
                }
            }, 5000);

            return (
                <div className="flex flex-col items-center justify-center h-full bg-terminal-black text-terminal-green font-mono p-4 animate-pulse">
                    <h2 className="text-xl font-bold">ESTABLISHING SECURE CONNECTION…</h2>
                    <p className="text-sm mt-4">DECRYPTING SCENARIO DATA…</p>
                </div>
            );
        }
        if (gameState === 'LOBBY') {
            return <Lobby socket={socket} players={players} onStartGame={handleStartGame} />;
        }
        // PLAYING – chat / voting UI
        return (
            <div className="flex flex-col h-full w-full bg-terminal-black text-terminal-green font-mono relative">
                {/* Header tabs */}
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
                    <div className="ml-auto text-xs animate-pulse text-terminal-alert">⚠ EMERGENCY MODE</div>
                </div>
                {/* Main area */}
                <div className="flex-1 overflow-hidden relative">
                    {activeTab === 'CHAT' ? (
                        <Chat socket={socket} messages={messages} myPlayer={myPlayer || { character: 'Unknown' }} />
                    ) : (
                        <Voting players={players} onVote={handleVote} myId={socket?.id} />
                    )}
                </div>
            </div>
        );
    };

    // ---------------------------------------------------------------------
    // Render component
    // ---------------------------------------------------------------------
    if (!socket) {
        return (
            <div className="flex items-center justify-center h-screen bg-black text-terminal-green">
                <p>Connecting to server…</p>
            </div>
        );
    }

    return (
        <div className="desk-bg">
            <div className="monitor-screen">
                <div className="crt-overlay" />
                <div className="scanline" />
                {renderScreenContent()}
            </div>

            {/* Connection status overlay */}
            {!isConnected && (
                <div className="absolute top-4 right-4 bg-red-900/80 border border-red-500 text-red-100 px-4 py-2 rounded font-mono text-xs animate-pulse z-50">
                    ⚠ NO UPLINK
                </div>
            )}

            {/* Journal trigger – always visible for debugging */}
            <div
                className="journal-trigger"
                onClick={() => setIsJournalOpen(true)}
                title="Open Journal"
                style={{ border: '3px solid red', backgroundColor: 'rgba(255,0,0,0.2)' }}
            >
                <div style={{ color: 'white', fontSize: '12px', padding: '5px' }}>CLICK HERE</div>
            </div>

            {/* Journal modal */}
            <JournalModal
                isOpen={isJournalOpen}
                onClose={() => setIsJournalOpen(false)}
                character={dossier?.character}
                journal={dossier?.journal}
                scenarioIntro={dossier?.scenario_intro}
            />
        </div>
    );
}

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="bg-red-900 text-white p-4 h-screen overflow-auto font-mono">
                    <h1 className="text-2xl font-bold mb-4">CRITICAL SYSTEM FAILURE</h1>
                    <p className="mb-2">ERROR: {this.state.error && this.state.error.toString()}</p>
                    <pre className="text-xs bg-black p-2 rounded">{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
                </div>
            );
        }

        return this.props.children;
    }
}

export default function AppWithBoundary() {
    return (
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    );
}
