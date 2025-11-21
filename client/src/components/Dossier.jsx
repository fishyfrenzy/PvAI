import React from 'react';

const Dossier = ({ character, journal, scenarioIntro }) => {
    return (
        <div className="h-full p-4 overflow-y-auto text-sm border-r border-terminal-green/30">
            <h2 className="text-xl font-bold mb-4 border-b border-terminal-green pb-2">PERSONNEL FILE</h2>

            <div className="mb-6">
                <h3 className="text-terminal-dim font-bold mb-1">MISSION CONTEXT</h3>
                <p className="opacity-90 leading-relaxed">{scenarioIntro}</p>
            </div>

            <div className="mb-6">
                <h3 className="text-terminal-dim font-bold mb-1">ASSIGNED ROLE</h3>
                <p className="text-lg font-bold text-terminal-green animate-pulse">{character}</p>
            </div>

            <div className="mb-6">
                <h3 className="text-terminal-dim font-bold mb-1">CONFIDENTIAL JOURNAL</h3>
                <div className="border border-terminal-dim p-3 bg-terminal-dim/5 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                    {journal}
                </div>
            </div>

            <div className="mt-auto pt-4 border-t border-terminal-dim/30">
                <p className="text-xs text-terminal-alert">WARNING: ENEMY AI DETECTED IN SYSTEM.</p>
                <p className="text-xs opacity-70">TRUST NO ONE. VERIFY HUMANITY.</p>
            </div>
        </div>
    );
};

export default Dossier;
