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
    players: Object.keys(players).length,
    gameState: gameState
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const server = http.createServer(app);

// Configure Socket.io with CORS
const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL, 'http://localhost:3000', 'http://localhost:5173']
  : ['http://localhost:3000', 'http://localhost:5173'];

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

// --- Game State ---
let players = {}; // socketId -> { id, name, role, character, journal, isBot, lastMessageTime }
let gameState = 'LOBBY'; // LOBBY, PLAYING, ENDED
let scenario = null;
let chatHistory = [];
let aiBotId = null; // The internal ID for the AI bot

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

  socket.on('join_lobby', (username) => {
    players[socket.id] = {
      id: socket.id,
      name: username,
      role: null,
      character: null,
      journal: null,
      isBot: false,
      lastMessageTime: 0
    };
    io.emit('lobby_update', Object.values(players));
    // Send current game state to the new player
    socket.emit('game_state_change', gameState);
  });

  socket.on('start_game', async () => {
    // Allow restart if game is ENDED
    if (gameState !== 'LOBBY' && gameState !== 'ENDED') return;

    // Reset state if restarting
    if (gameState === 'ENDED') {
      gameState = 'LOBBY';
      chatHistory = [];
      // Reset player roles but keep connections
      Object.values(players).forEach(p => {
        p.role = null;
        p.character = null;
        p.journal = null;
        p.votedFor = null;
      });
      // Remove old bot
      if (aiBotId && players[aiBotId]) {
        delete players[aiBotId];
        aiBotId = null;
      }
    }

    const playerIds = Object.keys(players);
    if (playerIds.length < 1) return;

    gameState = 'PLAYING';
    io.emit('game_state_change', 'STARTING');

    // 1. Generate Scenario
    aiBotId = 'bot_' + Math.random().toString(36).substr(2, 9);
    players[aiBotId] = {
      id: aiBotId,
      name: "Player " + (playerIds.length + 1),
      role: null,
      character: null,
      journal: null,
      isBot: true,
      lastMessageTime: 0
    };

    const allPlayerIds = Object.keys(players);
    const scenarioData = await generateScenario(allPlayerIds.length);
    scenario = scenarioData;

    // 2. Assign Roles
    const shuffledChars = scenario.characters.sort(() => 0.5 - Math.random());

    // Assign to players
    allPlayerIds.forEach((pid, index) => {
      if (shuffledChars[index]) {
        players[pid].character = shuffledChars[index].role;
        players[pid].journal = shuffledChars[index].journal_text;
      }
    });

    // Correct assignment strategy:
    const imposterChar = scenario.characters.find(c => c.is_imposter);
    const humanChars = scenario.characters.filter(c => !c.is_imposter);

    // Assign Imposter to Bot
    players[aiBotId].character = imposterChar.role;
    players[aiBotId].journal = imposterChar.journal_text;
    players[aiBotId].system_instructions = imposterChar.system_instructions;

    // Assign Humans
    const humanIds = allPlayerIds.filter(id => id !== aiBotId);
    humanIds.forEach((pid, idx) => {
      if (humanChars[idx]) {
        players[pid].character = humanChars[idx].role;
        players[pid].journal = humanChars[idx].journal_text;
      }
    });

    // Emit individual dossiers to players
    allPlayerIds.forEach(pid => {
      if (players[pid].isBot) return;
      const socketDest = io.sockets.sockets.get(pid);
      if (socketDest) {
        const dossierData = {
          scenario_intro: scenario.scenario_intro,
          character: players[pid].character,
          journal: players[pid].journal,
          players: Object.values(players).map(p => ({ name: p.name, id: p.id, character: p.character })) // Public info
        };
        console.log(`Emitting game_started to player ${pid} (${players[pid].name}):`, dossierData);
        socketDest.emit('game_started', dossierData);
      } else {
        console.log(`WARNING: Could not find socket for player ${pid}`);
      }
    });

    console.log('Emitting game_state_change to PLAYING');
    io.emit('game_state_change', 'PLAYING');
  });

  socket.on('send_message', (text) => {
    if (gameState !== 'PLAYING') return;

    const player = players[socket.id];
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
      io.emit('receive_message', messageData);
      chatHistory.push(messageData);

      checkForAiResponse();
    }, delay);
  });

  socket.on('vote_player', (targetId) => {
    if (gameState !== 'PLAYING') return;

    const voter = players[socket.id];
    const target = players[targetId];

    if (!voter || !target) return;

    voter.votedFor = targetId;

    io.emit('vote_update', { voter: voter.character, target: target.character || target.name });

    const totalPlayers = Object.keys(players).length;
    const voteCounts = {};
    Object.values(players).forEach(p => {
      if (p.votedFor) {
        voteCounts[p.votedFor] = (voteCounts[p.votedFor] || 0) + 1;
      }
    });

    const majority = Math.ceil(totalPlayers / 2);

    for (const [pid, count] of Object.entries(voteCounts)) {
      if (count > majority) {
        const ejected = players[pid];
        gameState = 'ENDED';

        let resultMessage = "";
        if (ejected.isBot) {
          resultMessage = `GAME OVER. The Imposter (${ejected.character}) was ejected! HUMANS WIN!`;
        } else {
          resultMessage = `GAME OVER. An innocent Human (${ejected.character}) was ejected! THE AI WINS!`;
        }

        io.emit('game_over', { message: resultMessage, winner: ejected.isBot ? 'HUMANS' : 'AI' });
        break;
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete players[socket.id];
    io.emit('lobby_update', Object.values(players));
  });
});

// --- AI Logic Loop ---

let aiProcessing = false;

async function checkForAiResponse() {
  if (aiProcessing) return;
  if (gameState !== 'PLAYING') return;

  const aiPlayer = players[aiBotId];
  if (!aiPlayer) return;

  const now = Date.now();
  if (now - aiPlayer.lastMessageTime < RATE_LIMIT_MS) return;

  if (Math.random() > 0.7) return;

  aiProcessing = true;

  await sleep(1000 + Math.random() * 2000);

  const responseText = await generateAiResponse(chatHistory, aiPlayer);

  aiProcessing = false;

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
    io.emit('receive_message', messageData);
    chatHistory.push(messageData);
  }, delay);
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
