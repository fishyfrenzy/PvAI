import React, { useState, useEffect, useRef } from 'react';

const Chat = ({ socket, messages, myPlayer }) => {
    const [input, setInput] = useState('');
    const [cooldown, setCooldown] = useState(0);
    const [pendingMessages, setPendingMessages] = useState([]);
    const messagesEndRef = useRef(null);

    const RATE_LIMIT_MS = 10000;

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

    return (
        <div className="flex flex-col h-full bg-black/50 relative">
            <div className="absolute top-0 left-0 bg-terminal-green text-black text-[10px] px-2 py-0.5 font-bold z-10">
                SECURE_CHANNEL_V.9
            </div>

            <div className="flex-1 overflow-y-auto p-2 pt-6 space-y-2 custom-scrollbar">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.senderId === socket.id ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] opacity-50 mb-0.5">
                            {msg.senderName} {msg.senderId === socket.id ? '[YOU]' : ''}
                        </span>
                        <div className={`max-w-[90%] p-1.5 border text-xs ${msg.senderId === socket.id
                                ? 'border-terminal-green bg-terminal-green/10'
                                : 'border-terminal-dim bg-terminal-dim/5'
                            }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}

                {pendingMessages.map((msg) => (
                    <div key={msg.id} className="flex flex-col items-end opacity-50">
                        <span className="text-[10px] mb-0.5">
                            {msg.senderName} [ENCRYPTING...]
                        </span>
                        <div className="max-w-[90%] p-1.5 border border-terminal-green border-dashed text-xs">
                            {msg.text}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-2 border-t border-terminal-green bg-black">
                <form onSubmit={handleSend} className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={cooldown > 0}
                        className="flex-1 bg-black border border-terminal-green text-terminal-green p-1.5 text-xs focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder={cooldown > 0 ? `RECHARGING... ${(cooldown / 1000).toFixed(1)}s` : "ENTER MESSAGE..."}
                    />
                    <button
                        type="submit"
                        disabled={cooldown > 0}
                        className="bg-terminal-green text-black font-bold px-3 py-1 text-xs disabled:opacity-50 disabled:bg-terminal-dim"
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
