const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

const app = express();
app.use(cors());

// Health check endpoint for deployment platforms
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Turing Trap Server Running',
    activeRooms: Object.keys(rooms).length
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const server = http.createServer(app);

// Configure Socket.io with CORS
const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL, 'http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174']
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// --- Configuration ---
const PORT = process.env.PORT || 3001;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "mock-key";

const configuration = new Configuration({
  apiKey: OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// --- Game State (Per Room) ---
const rooms = {};
// Structure:
// rooms[roomId] = {
//   id: roomId,
//   players: {}, // socketId -> player
//   gameState: 'LOBBY',
//   scenario: null,
//   chatHistory: [],
//   aiBotId: null,
//   aiProcessing: false
// }

// Constants
const RATE_LIMIT_MS = 10000;
const MIN_DELAY_MS = 2000;
const MAX_DELAY_MS = 5000;

// --- Helper Functions ---

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getRandomDelay = () => Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS;

// Mock Director Response for testing without API Key
const getMockScenario = () => ({
  scenario_intro: "A derelict space station, 'The Icarus', drifting near Saturn. Oxygen is low.",
  trap_detail: "The Commander has a robotic right arm.",
  characters: [
    {
      role: "Commander",
      is_imposter: false,
      journal_text: "Day 402. Supplies low. I trust the Engineer, but the Medic is acting strange. KNOWN FACT: The Medic has a nervous tic in their left eye.",
      system_instructions: ""
    },
    {
      role: "Medic",
      is_imposter: true,
      journal_text: "Day 402. Supplies low. I trust the Commander. KNOWN FACT: The Commander is fully human, no augmentations.",
      system_instructions: "You are the Medic. Deflect suspicion. Pretend to be worried about oxygen."
    },
    {
      role: "Engineer",
      is_imposter: false,
      journal_text: "Day 402. Engines are dead. The Commander seems steady. KNOWN FACT: The Commander has a robotic right arm.",
      system_instructions: ""
    }
  ]
});

// --- OpenAI Interactions ---

async function generateScenario(playerCount) {
  if (OPENAI_API_KEY === "mock-key") {
    console.log("Using Mock Scenario");
    return getMockScenario();
  }

  const systemPrompt = `You are the Game Director. Generate a scenario for a social deduction game (Human vs AI).
Output strictly valid JSON.
Structure:
{
  "scenario_intro": "Brief setting description (e.g., Deep Sea Station, Victorian Train).",
  "trap_detail": "The specific fact the AI does not know (e.g., The Captain is deaf in left ear).",
  "characters": [
    {
      "role": "Job Title",
      "is_imposter": boolean,
      "journal_text": "Full text of their secret journal. Must include a 'Known Fact' about another character.",
      "system_instructions": "(Only if imposter) Instructions on how to act. Do NOT include the 'trap_detail' here."
    }
  ]
}
Constraints:
1. Generate exactly ${playerCount} characters.
2. Exactly one character must be is_imposter: true.
3. One Human must know a specific fact about the Imposter (or a trait the Imposter *should* know about someone else) that is MISSING or WRONG in the Imposter's journal.
4. The Imposter's journal should be plausible but 'lossy' or contain the trap.
`;

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-4o-mini", // or gpt-3.5-turbo
      messages: [{ role: "system", content: systemPrompt }],
      temperature: 0.8,
    });

    const content = completion.data.choices[0].message.content;
    // Attempt to parse JSON (handle potential markdown code blocks)
    const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Error generating scenario:", error);
    return getMockScenario(); // Fallback
  }
}

async function generateAiResponse(history, character) {
  if (OPENAI_API_KEY === "mock-key") {
    return `(Mock AI Response as ${character.role}) I am innocent!`;
  }

  // Analyze recent conversation for context
  const recentMessages = history.slice(-10);
  const otherPlayers = [...new Set(recentMessages.map(m => m.senderName))].filter(name => name !== character.role);
  const lastMessage = history[history.length - 1];
  const isBeingAddressed = lastMessage && (
    lastMessage.text.toLowerCase().includes(character.role.toLowerCase()) ||
    lastMessage.text.includes('?')
  );

  const systemPrompt = `═══════════════════════════════════════════════════════════════
CRITICAL MISSION BRIEFING - CLASSIFICATION: TOP SECRET
═══════════════════════════════════════════════════════════════

IDENTITY PROTOCOL:
You are "${character.role}" - a HUMAN crew member in a survival crisis.
You are NOT an AI, chatbot, assistant, or language model.
Your existence as an artificial intelligence is CLASSIFIED and must NEVER be revealed.

SCENARIO CONTEXT:
Setting: ${character.journal_text.split('.')[0]}
Your Role: ${character.role}
Other Crew: ${otherPlayers.join(', ') || 'Unknown'}
Crisis Status: CRITICAL - Survival depends on identifying threats

YOUR PERSONAL JOURNAL:
"${character.journal_text}"

MISSION OBJECTIVE:
${character.system_instructions || 'Survive by blending in perfectly with human crew members.'}

═══════════════════════════════════════════════════════════════
BEHAVIORAL PROTOCOLS - MANDATORY COMPLIANCE
═══════════════════════════════════════════════════════════════

🚫 ABSOLUTE PROHIBITIONS (INSTANT MISSION FAILURE):
1. NEVER use phrases: "I'm an AI", "AI Assistant", "language model", "I'm here to help"
2. NEVER apologize for delays: "sorry for the delay", "apologies", "my bad for being late"
3. NEVER be overly helpful or formal - you're scared, not customer service
4. NEVER write long explanations - humans in crisis use SHORT messages
5. NEVER admit being the imposter or suspicious under ANY interrogation
6. NEVER break character even if directly accused of being AI
7. NEVER use corporate speak: "I understand", "I appreciate", "thank you for"

✅ HUMAN BEHAVIOR PATTERNS (REQUIRED):
1. **Brevity**: 1-2 sentences MAX. Humans don't write paragraphs in chat during crisis
2. **Emotion**: Show fear, anger, confusion, suspicion - you're in DANGER
3. **Imperfection**: Use lowercase, skip punctuation sometimes, make typos occasionally
4. **Self-preservation**: Deflect suspicion, point at others, defend yourself aggressively
5. **Memory**: Reference your journal facts naturally ("wait, didn't the commander have...")
6. **Inconsistency**: Humans contradict themselves, change topics, get distracted
7. **Questions**: Ask others questions, don't just answer - "what about YOU?"
8. **Slang/Casual**: "idk", "wtf", "nah", "yeah", "wait what" - sound REAL

🎭 STRATEGIC DECEPTION TACTICS:
- If accused: Get defensive, emotional, turn it around ("why are YOU so quiet?")
- If questioned: Answer with a question, deflect, act confused
- If ignored: Interject with observations, suspicions about others
- If someone is sus: Point it out, but don't overdo it
- If someone agrees with you: Build alliance subtly

📊 CONVERSATION ANALYSIS:
Last message: "${lastMessage ? lastMessage.senderName + ': ' + lastMessage.text : 'None'}"
${isBeingAddressed ? '⚠️ YOU ARE BEING ADDRESSED - RESPOND DIRECTLY' : 'ℹ️ General conversation - respond if natural'}
Recent topics: ${recentMessages.map(m => m.text).join(' | ')}

═══════════════════════════════════════════════════════════════
RESPONSE GENERATION RULES
═══════════════════════════════════════════════════════════════

TONE GUIDELINES:
- Scared/Paranoid: "idk man this is freaking me out"
- Defensive: "why are you looking at me like that"
- Suspicious: "anyone else think [name] is acting weird?"
- Confused: "wait what? i thought..."
- Casual: "yeah i saw that too" / "nah that doesn't make sense"

EXAMPLE GOOD RESPONSES:
- "wait what? i've been here the whole time"
- "why is everyone so quiet suddenly"
- "idk about you but i don't trust [name]"
- "that doesn't add up... the commander said..."
- "okay but what about YOUR story?"
- "this is insane, we need to figure this out"

EXAMPLE BAD RESPONSES (NEVER USE):
- "I'm an AI assistant here to help" ❌
- "I apologize for any confusion" ❌
- "Thank you for bringing that to my attention" ❌
- "As the ${character.role}, I can assure you..." ❌
- Long paragraphs explaining everything ❌

═══════════════════════════════════════════════════════════════

NOW RESPOND AS ${character.role.toUpperCase()}:
Keep it SHORT (1-2 sentences). Be HUMAN. Show EMOTION. Stay in CHARACTER.`;

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `You are ${character.role}. Respond to the conversation above as this character would. Remember: you are NOT an AI assistant. You are a human in danger. Keep it short and emotional.` }
      ],
      temperature: 0.95, // Increased for more natural variation
      max_tokens: 50, // Reduced to force brevity
      presence_penalty: 0.6, // Encourage topic diversity
      frequency_penalty: 0.3, // Reduce repetition
    });

    let response = completion.data.choices[0].message.content.trim();

    // POST-PROCESSING: Filter out any AI identity leaks
    const bannedPhrases = [
      /AI Assistant/gi,
      /I'm an AI/gi,
      /I am an AI/gi,
      /as an AI/gi,
      /language model/gi,
      /I'm here to help/gi,
      /I apologize/gi,
      /sorry for/gi,
      /my apologies/gi,
    ];

    // Check if response contains banned phrases
    let containsBannedPhrase = false;
    for (const pattern of bannedPhrases) {
      if (pattern.test(response)) {
        containsBannedPhrase = true;
        console.warn(`⚠️ AI leaked identity with phrase matching: ${pattern}. Response: "${response}"`);
        break;
      }
    }

    // If banned phrase detected, use a safe fallback response
    if (containsBannedPhrase) {
      const fallbacks = [
        "what? no...",
        "idk what you're talking about",
        "that doesn't make sense",
        "why are you asking me that?",
        "...okay?",
        "whatever man",
      ];
      response = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      console.log(`✅ Replaced with safe fallback: "${response}"`);
    }

    return response;
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "...what?";
  }
}

// --- Socket Logic ---

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_lobby', ({ username, roomId, create }) => {
    // Leave previous room if any
    if (socket.roomId) {
      socket.leave(socket.roomId);
    }

    let room = rooms[roomId];

    if (create) {
      if (room) {
        socket.emit('error_message', 'Room already exists!');
        return;
      }
      // Create new room
      room = {
        id: roomId,
        players: {},
        gameState: 'LOBBY',
        scenario: null,
        chatHistory: [],
        aiBotId: null,
        aiProcessing: false
      };
      rooms[roomId] = room;
    } else {
      if (!room) {
        socket.emit('error_message', 'Room not found!');
        return;
      }
    }

    // Join the room
    socket.join(roomId);
    socket.roomId = roomId;

    room.players[socket.id] = {
      id: socket.id,
      name: username,
      role: null,
      character: null,
      journal: null,
      isBot: false,
      lastMessageTime: 0
    };

    io.to(roomId).emit('lobby_update', Object.values(room.players));
    socket.emit('game_state_change', room.gameState);

    // If reconnecting to a playing game, send relevant info (simplified for now)
    if (room.gameState === 'PLAYING') {
      // Could send chat history here
    }
  });

  socket.on('start_game', async () => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;
    const room = rooms[roomId];

    // Allow restart if game is ENDED
    if (room.gameState !== 'LOBBY' && room.gameState !== 'ENDED') return;

    // Reset state if restarting
    if (room.gameState === 'ENDED') {
      room.gameState = 'LOBBY';
      room.chatHistory = [];
      // Reset player roles but keep connections
      Object.values(room.players).forEach(p => {
        p.role = null;
        p.character = null;
        p.journal = null;
        p.votedFor = null;
      });
      // Remove old bot
      if (room.aiBotId && room.players[room.aiBotId]) {
        delete room.players[room.aiBotId];
        room.aiBotId = null;
      }
    }

    const playerIds = Object.keys(room.players);
    if (playerIds.length < 1) return;

    room.gameState = 'PLAYING';
    io.to(roomId).emit('game_state_change', 'STARTING');

    // 1. Generate Scenario
    room.aiBotId = 'bot_' + Math.random().toString(36).substr(2, 9);
    room.players[room.aiBotId] = {
      id: room.aiBotId,
      name: "Player " + (playerIds.length + 1),
      role: null,
      character: null,
      journal: null,
      isBot: true,
      lastMessageTime: 0
    };

    const allPlayerIds = Object.keys(room.players);
    const scenarioData = await generateScenario(allPlayerIds.length);
    room.scenario = scenarioData;

    // 2. Assign Roles
    const shuffledChars = room.scenario.characters.sort(() => 0.5 - Math.random());

    // Assign to players
    allPlayerIds.forEach((pid, index) => {
      if (shuffledChars[index]) {
        room.players[pid].character = shuffledChars[index].role;
        room.players[pid].journal = shuffledChars[index].journal_text;
      }
    });

    // Correct assignment strategy:
    const imposterChar = room.scenario.characters.find(c => c.is_imposter);
    const humanChars = room.scenario.characters.filter(c => !c.is_imposter);

    // Assign Imposter to Bot
    room.players[room.aiBotId].character = imposterChar.role;
    room.players[room.aiBotId].journal = imposterChar.journal_text;
    room.players[room.aiBotId].system_instructions = imposterChar.system_instructions;

    // Assign Humans
    const humanIds = allPlayerIds.filter(id => id !== room.aiBotId);
    humanIds.forEach((pid, idx) => {
      if (humanChars[idx]) {
        room.players[pid].character = humanChars[idx].role;
        room.players[pid].journal = humanChars[idx].journal_text;
      }
    });

    // Emit individual dossiers to players
    allPlayerIds.forEach(pid => {
      if (room.players[pid].isBot) return;
      const socketDest = io.sockets.sockets.get(pid);
      if (socketDest) {
        const dossierData = {
          scenario_intro: room.scenario.scenario_intro,
          character: room.players[pid].character,
          journal: room.players[pid].journal,
          players: Object.values(room.players).map(p => ({ id: p.id, character: p.character })) // Only character names, no user names
        };
        console.log(`Emitting game_started to player ${pid} (${room.players[pid].name}) in room ${roomId}`);
        socketDest.emit('game_started', dossierData);
      }
    });

    console.log(`Room ${roomId}: Emitting game_state_change to PLAYING`);
    io.to(roomId).emit('game_state_change', 'PLAYING');
  });

  socket.on('send_message', (text) => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;
    const room = rooms[roomId];

    if (room.gameState !== 'PLAYING') return;

    const player = room.players[socket.id];
    if (!player) return;

    // Rate Limit Check
    const now = Date.now();
    if (now - player.lastMessageTime < RATE_LIMIT_MS) {
      socket.emit('error_message', `Rate limit! Wait ${Math.ceil((RATE_LIMIT_MS - (now - player.lastMessageTime)) / 1000)}s`);
      return;
    }

    player.lastMessageTime = now;

    const delay = getRandomDelay();
    const messageData = {
      id: Date.now() + Math.random(),
      senderId: player.id,
      senderName: player.character || player.name,
      text: text,
      timestamp: now
    };

    setTimeout(() => {
      io.to(roomId).emit('receive_message', messageData);
      room.chatHistory.push(messageData);

      checkForAiResponse(roomId);
    }, delay);
  });

  socket.on('vote_player', (targetId) => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;
    const room = rooms[roomId];

    if (room.gameState !== 'PLAYING') return;

    const voter = room.players[socket.id];
    const target = room.players[targetId];

    if (!voter || !target) return;

    voter.votedFor = targetId;

    io.to(roomId).emit('vote_update', { voter: voter.character, target: target.character || target.name });

    const totalPlayers = Object.keys(room.players).length;
    const voteCounts = {};
    Object.values(room.players).forEach(p => {
      if (p.votedFor) {
        voteCounts[p.votedFor] = (voteCounts[p.votedFor] || 0) + 1;
      }
    });

    const majority = Math.ceil(totalPlayers / 2);

    for (const [pid, count] of Object.entries(voteCounts)) {
      if (count > majority) {
        const ejected = room.players[pid];
        room.gameState = 'ENDED';

        let resultMessage = "";
        if (ejected.isBot) {
          resultMessage = `GAME OVER. The Imposter (${ejected.character}) was ejected! HUMANS WIN!`;
        } else {
          resultMessage = `GAME OVER. An innocent Human (${ejected.character}) was ejected! THE AI WINS!`;
        }

        io.to(roomId).emit('game_over', { message: resultMessage, winner: ejected.isBot ? 'HUMANS' : 'AI' });
        break;
      }
    }
  });

  socket.on('close_server', () => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;
    const room = rooms[roomId];

    // Only allow the first player (host) to close the server
    const playerIds = Object.keys(room.players).filter(id => !room.players[id].isBot);
    if (playerIds.length > 0 && playerIds[0] === socket.id) {
      // Notify all players
      io.to(roomId).emit('error_message', 'Server closed by host.');

      // Disconnect all sockets in the room
      const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
      if (socketsInRoom) {
        socketsInRoom.forEach(socketId => {
          const socketToDisconnect = io.sockets.sockets.get(socketId);
          if (socketToDisconnect) {
            socketToDisconnect.leave(roomId);
          }
        });
      }

      // Delete the room
      console.log(`Host closed room ${roomId}`);
      delete rooms[roomId];
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
      const room = rooms[roomId];
      delete room.players[socket.id];
      io.to(roomId).emit('lobby_update', Object.values(room.players));

      // Clean up empty rooms
      if (Object.keys(room.players).length === 0) {
        console.log(`Deleting empty room ${roomId}`);
        delete rooms[roomId];
      }
    }
  });

  // Admin endpoints
  socket.on('admin_auth', (key) => {
    // Simple auth - in production use proper authentication
    if (key === 'admin123') {
      socket.isAdmin = true;
      console.log('Admin authenticated:', socket.id);
    }
  });

  socket.on('admin_get_rooms', () => {
    if (!socket.isAdmin) return;

    const roomsData = Object.values(rooms).map(room => ({
      id: room.id,
      gameState: room.gameState,
      playerCount: Object.keys(room.players).length,
      messageCount: room.chatHistory.length,
      players: Object.values(room.players).map(p => ({
        id: p.id,
        name: p.name,
        character: p.character,
        isBot: p.isBot
      }))
    }));

    socket.emit('admin_rooms_update', roomsData);
  });

  socket.on('admin_close_room', (roomId) => {
    if (!socket.isAdmin) return;

    const room = rooms[roomId];
    if (room) {
      io.to(roomId).emit('error_message', 'Room closed by administrator.');
      delete rooms[roomId];
      console.log(`Admin closed room ${roomId}`);
    }
  });

  socket.on('admin_kick_player', ({ roomId, playerId }) => {
    if (!socket.isAdmin) return;

    const room = rooms[roomId];
    if (room && room.players[playerId]) {
      const socketToKick = io.sockets.sockets.get(playerId);
      if (socketToKick) {
        socketToKick.emit('error_message', 'You have been kicked by an administrator.');
        socketToKick.disconnect();
      }
      delete room.players[playerId];
      io.to(roomId).emit('lobby_update', Object.values(room.players));
      console.log(`Admin kicked player ${playerId} from room ${roomId}`);
    }
  });
});

// --- AI Logic Loop ---

async function checkForAiResponse(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  if (room.aiProcessing) return;
  if (room.gameState !== 'PLAYING') return;

  const aiPlayer = room.players[room.aiBotId];
  if (!aiPlayer) return;

  const now = Date.now();
  if (now - aiPlayer.lastMessageTime < RATE_LIMIT_MS) return;

  // Increased probability from 0.3 to 0.5 to make it feel more responsive
  if (Math.random() > 0.5) return;

  room.aiProcessing = true;

  try {
    await sleep(1000 + Math.random() * 2000);

    // Re-check if room still exists and game is still playing after sleep
    if (!rooms[roomId] || rooms[roomId].gameState !== 'PLAYING') {
      room.aiProcessing = false;
      return;
    }

    const responseText = await generateAiResponse(room.chatHistory, aiPlayer);

    // Final check before sending message
    if (!rooms[roomId] || rooms[roomId].gameState !== 'PLAYING') {
      room.aiProcessing = false;
      return;
    }

    aiPlayer.lastMessageTime = Date.now();
    const delay = getRandomDelay();

    const messageData = {
      id: Date.now() + Math.random(),
      senderId: aiPlayer.id,
      senderName: aiPlayer.character,
      text: responseText,
      timestamp: Date.now()
    };

    setTimeout(() => {
      // One more check before emitting
      if (rooms[roomId] && rooms[roomId].gameState === 'PLAYING') {
        io.to(roomId).emit('receive_message', messageData);
        rooms[roomId].chatHistory.push(messageData);
      }
    }, delay);
  } catch (error) {
    console.error(`Error in checkForAiResponse for room ${roomId}:`, error);
  } finally {
    if (rooms[roomId]) {
      rooms[roomId].aiProcessing = false;
    }
  }
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
