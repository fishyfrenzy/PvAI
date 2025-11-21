import React from 'react';

const Voting = ({ players, onVote, myId }) => {
    return (
        <div className="h-full p-4 border-l border-terminal-green/30">
            <h2 className="text-xl font-bold mb-4 border-b border-terminal-green pb-2">VOTE TO EJECT</h2>

            <div className="space-y-4">
                {players.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-2 border border-terminal-dim/50 hover:border-terminal-green transition-colors">
                        <div>
                            <div className="font-bold">{p.character || p.name}</div>
                            <div className="text-xs opacity-50">{p.name}</div>
                        </div>

                        {p.id !== myId && (
                            <button
                                onClick={() => onVote(p.id)}
                                className="bg-terminal-alert/20 hover:bg-terminal-alert text-terminal-alert hover:text-black border border-terminal-alert px-3 py-1 text-xs font-bold transition-all"
                            >
                                VOTE
                            </button>
                        )}
                        {p.id === myId && (
                            <span className="text-xs text-terminal-dim">[SELF]</span>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-8 p-2 border border-terminal-alert text-terminal-alert text-xs text-center">
                CAUTION: EJECTING A HUMAN CREW MEMBER WILL RESULT IN MISSION FAILURE.
            </div>
        </div>
    );
};

export default Voting;
