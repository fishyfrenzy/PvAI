import React from 'react';

const JournalModal = ({ isOpen, onClose, character, journal, scenarioIntro }) => {
    const [page, setPage] = React.useState('DOSSIER'); // DOSSIER, NOTES
    const [notes, setNotes] = React.useState('');

    console.log("JournalModal render - isOpen:", isOpen, "character:", character);

    if (!isOpen) return null;

    const isNotes = page === 'NOTES';

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div
                className={`relative paper-texture p-8 transform shadow-2xl transition-all duration-300 ease-in-out ${isNotes
                    ? 'w-[80vw] max-w-[1000px] aspect-video rotate-0'
                    : 'w-[600px] h-[800px] rotate-1'
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-600 hover:text-black font-sans text-xl font-bold z-10"
                >
                    ✕
                </button>

                {/* Navigation Tabs/Arrows */}
                <div className="absolute -right-12 top-20 flex flex-col gap-2">
                    <button
                        onClick={() => setPage('DOSSIER')}
                        className={`w-12 h-16 rounded-r-md border-y border-r border-gray-400 flex items-center justify-center font-bold text-lg transition-colors ${!isNotes ? 'bg-[#f0e6d2] translate-x-[-2px]' : 'bg-[#dcd0b8] hover:bg-[#e6dabf]'}`}
                        title="Dossier"
                    >
                        1
                    </button>
                    <button
                        onClick={() => setPage('NOTES')}
                        className={`w-12 h-16 rounded-r-md border-y border-r border-gray-400 flex items-center justify-center font-bold text-lg transition-colors ${isNotes ? 'bg-[#f0e6d2] translate-x-[-2px]' : 'bg-[#dcd0b8] hover:bg-[#e6dabf]'}`}
                        title="Notes"
                    >
                        2
                    </button>
                </div>

                <div className="h-full overflow-y-auto pr-4 custom-scrollbar-paper relative">
                    {isNotes ? (
                        <div className="h-full flex flex-col">
                            <h1 className="text-4xl font-bold mb-4 text-center border-b-2 border-gray-400 pb-2">
                                Field Notes
                            </h1>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="flex-1 w-full bg-transparent resize-none outline-none text-2xl leading-relaxed custom-scrollbar-paper p-2"
                                placeholder="Scribble your observations here..."
                                autoFocus
                            />
                        </div>
                    ) : (
                        <>
                            <h1 className="text-4xl font-bold mb-6 text-center border-b-2 border-gray-400 pb-2">
                                Confidential Log
                            </h1>

                            <div className="mb-6">
                                <span className="block text-xl text-gray-500 mb-1">Subject:</span>
                                <span className="text-3xl font-bold">{character}</span>
                            </div>

                            <div className="mb-8">
                                <span className="block text-xl text-gray-500 mb-1">Mission Brief:</span>
                                <p className="text-2xl leading-relaxed">{scenarioIntro}</p>
                            </div>

                            <div className="mb-8">
                                <span className="block text-xl text-gray-500 mb-1">Personal Notes:</span>
                                <p className="text-2xl leading-relaxed whitespace-pre-wrap">{journal}</p>
                            </div>

                            <div className="mt-12 text-center text-xl text-red-800 font-bold border-2 border-red-800 p-2 rotate-[-2deg] inline-block">
                                TOP SECRET // EYES ONLY
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JournalModal;
