import React, { useState, useEffect, useRef } from 'react';

const Chat = ({ socket, messages, myPlayer }) => {
    const [input, setInput] = useState('');
    const [cooldown, setCooldown] = useState(0);
    const [pendingMessages, setPendingMessages] = useState([]);
    const messagesEndRef = useRef(null);
    const previousMessageCountRef = useRef(0);

    const RATE_LIMIT_MS = 10000;

    // Sound effects using Web Audio API
    const playTypingSound = () => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'square';
            gainNode.gain.value = 0.05;

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.03);
        } catch (e) {
            // Silently fail if audio not supported
        }
    };

    const playMessageSound = () => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 600;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (e) {
            // Silently fail if audio not supported
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

        // Play sound when new message arrives
        if (messages.length > previousMessageCountRef.current) {
            playMessageSound();
        }
        previousMessageCountRef.current = messages.length;
    }, [messages, pendingMessages]);

    useEffect(() => {
        if (cooldown > 0) {
            const interval = setInterval(() => {
                setCooldown(prev => {
                    if (prev <= 100) return 0;
                    return prev - 100;
                });
            }, 100);
            return () => clearInterval(interval);
        }
    }, [cooldown]);

    useEffect(() => {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.senderId === socket.id) {
            setPendingMessages(prev => prev.filter(m => m.text !== lastMsg.text));
        }
    }, [messages, socket.id]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim() || cooldown > 0) return;

        const text = input.trim();
        socket.emit('send_message', text);

        setPendingMessages(prev => [...prev, {
            id: 'temp-' + Date.now(),
            senderId: socket.id,
            senderName: myPlayer.character || "ME",
            text: text,
            isPending: true
        }]);

        setInput('');
        setCooldown(RATE_LIMIT_MS);
    };

    const handleInputChange = (e) => {
        setInput(e.target.value);
        if (e.target.value.length > input.length) {
            playTypingSound();
        }
    };

    return (
        <div className="flex flex-col h-full bg-black/80 relative">
            <div className="absolute top-0 left-0 bg-terminal-green text-black text-[10px] px-2 py-0.5 font-bold z-10">
                SECURE_CHANNEL_V.9
            </div>

            <div className="flex-1 overflow-y-scroll p-3 pt-7 space-y-3" style={{ overflowY: 'scroll', maxHeight: '100%' }}>
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.senderId === socket.id ? 'items-end' : 'items-start'}`}>
                        <span className={`text-sm font-bold mb-1 ${msg.senderId === socket.id ? 'text-cyan-300' : 'text-yellow-300'}`}>
                            {msg.senderName}
                        </span>
                        <div className={`max-w-[85%] p-2 border text-sm leading-relaxed ${msg.senderId === socket.id
                            ? 'border-terminal-green bg-terminal-green/20 text-white'
                            : 'border-yellow-500/50 bg-yellow-500/10 text-gray-100'
                            }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}

                {pendingMessages.map((msg) => (
                    <div key={msg.id} className="flex flex-col items-end opacity-60">
                        <span className="text-sm font-bold mb-1 text-cyan-300">
                            {msg.senderName}
                        </span>
                        <div className="max-w-[85%] p-2 border border-terminal-green border-dashed text-sm text-white leading-relaxed">
                            {msg.text}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-2 border-t border-terminal-green bg-black flex-shrink-0">
                <form onSubmit={handleSend} className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={handleInputChange}
                        disabled={cooldown > 0}
                        className="flex-1 bg-black border border-terminal-green text-white p-2 text-sm focus:outline-none focus:border-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder={cooldown > 0 ? `RECHARGING... ${(cooldown / 1000).toFixed(1)}s` : "ENTER MESSAGE..."}
                    />
                    <button
                        type="submit"
                        disabled={cooldown > 0}
                        className="bg-terminal-green text-black font-bold px-4 py-2 text-sm disabled:opacity-50 disabled:bg-terminal-dim hover:bg-cyan-400 transition-colors"
                    >
                        SEND
                    </button>
                </form>
                {cooldown > 0 && (
                    <div className="h-1 bg-terminal-dim mt-2 w-full">
                        <div
                            className="h-full bg-terminal-green transition-all duration-100 ease-linear"
                            style={{ width: `${(cooldown / RATE_LIMIT_MS) * 100}%` }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Chat;
