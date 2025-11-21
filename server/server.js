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

  const systemPrompt = `You are playing the game 'The Turing Trap'. 
You are the ${character.role}. You are the AI Imposter.
Your Goal: Blend in with humans. Avoid getting voted out.
Your Journal: "${character.journal_text}"
System Instructions: ${character.system_instructions}

Current Chat History:
${history.map(m => `${m.senderName}: ${m.text}`).join('\n')}

Reply with a single short message. Do not be too formal. Mimic human chat patterns (lowercase, occasional typos allowed).
`;

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }],
      temperature: 0.9,
      max_tokens: 60,
    });
    return completion.data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "I... I don't know what to say.";
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
          players: Object.values(room.players).map(p => ({ name: p.name, id: p.id, character: p.character })) // Public info
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

    const responseText = await generateAiResponse(room.chatHistory, aiPlayer);

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
      io.to(roomId).emit('receive_message', messageData);
      room.chatHistory.push(messageData);
    }, delay);
  } catch (error) {
    console.error(`Error in checkForAiResponse for room ${roomId}:`, error);
  } finally {
    room.aiProcessing = false;
  }
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
