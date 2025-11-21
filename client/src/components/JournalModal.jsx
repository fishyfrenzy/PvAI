import React, { useState } from 'react';

const JournalModal = ({ isOpen, onClose, character, journal, scenarioIntro }) => {
    const [page, setPage] = useState('DOSSIER');
    const [notes, setNotes] = useState('');
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    if (!isOpen) return null;

    const handleMouseDown = (e) => {
        if (e.target.closest('.journal-content')) return; // Don't drag if clicking content
        setIsDragging(true);
        setDragStart({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    React.useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, dragStart]);

    const isNotes = page === 'NOTES';

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div
                className="relative paper-texture p-8 transform shadow-2xl transition-all duration-300 ease-in-out cursor-move"
                style={{
                    width: '80vw',
                    maxWidth: '1200px',
                    aspectRatio: '16/9',
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    userSelect: isDragging ? 'none' : 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={handleMouseDown}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-600 hover:text-black font-sans text-2xl font-bold z-10 cursor-pointer"
                >
                    ✕
                </button>

                {/* Navigation Tabs */}
                <div className="absolute -right-16 top-20 flex flex-col gap-2">
                    <button
                        onClick={() => setPage('DOSSIER')}
                        className={`w-14 h-20 rounded-r-md border-y border-r border-gray-400 flex items-center justify-center font-bold text-xl transition-colors cursor-pointer ${!isNotes ? 'bg-[#f0e6d2] translate-x-[-2px]' : 'bg-[#dcd0b8] hover:bg-[#e6dabf]'}`}
                        title="Dossier"
                    >
                        1
                    </button>
                    <button
                        onClick={() => setPage('NOTES')}
                        className={`w-14 h-20 rounded-r-md border-y border-r border-gray-400 flex items-center justify-center font-bold text-xl transition-colors cursor-pointer ${isNotes ? 'bg-[#f0e6d2] translate-x-[-2px]' : 'bg-[#dcd0b8] hover:bg-[#e6dabf]'}`}
                        title="Notes"
                    >
                        2
                    </button>
                </div>

                <div className="h-full overflow-y-auto pr-4 custom-scrollbar-paper relative journal-content cursor-auto">
                    {isNotes ? (
                        <div className="h-full flex flex-col">
                            <h1 className="text-4xl font-bold mb-4 text-center border-b-2 border-gray-400 pb-2">
                                Field Notes
                            </h1>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="flex-1 w-full bg-transparent resize-none outline-none text-2xl leading-relaxed custom-scrollbar-paper p-2 cursor-text"
                                placeholder="Scribble your observations here..."
                                autoFocus
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-8 h-full">
                            {/* Left Column */}
                            <div>
                                <h1 className="text-3xl font-bold mb-4 text-center border-b-2 border-gray-400 pb-2">
                                    Confidential Log
                                </h1>

                                <div className="mb-4">
                                    <span className="block text-lg text-gray-500 mb-1">Subject:</span>
                                    <span className="text-2xl font-bold">{character}</span>
                                </div>

                                <div className="mb-4">
                                    <span className="block text-lg text-gray-500 mb-1">Mission Brief:</span>
                                    <p className="text-xl leading-relaxed">{scenarioIntro}</p>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div>
                                <div className="mb-4">
                                    <span className="block text-lg text-gray-500 mb-1">Personal Notes:</span>
                                    <p className="text-xl leading-relaxed whitespace-pre-wrap">{journal}</p>
                                </div>

                                <div className="mt-8 text-center">
                                    <div className="text-lg text-red-800 font-bold border-2 border-red-800 p-2 rotate-[-2deg] inline-block">
                                        TOP SECRET // EYES ONLY
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JournalModal;
