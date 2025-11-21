# 🎮 The Turing Trap

A multiplayer social deduction game where players must identify an AI impostor through conversation and voting. Built with React, Node.js, Socket.io, and OpenAI.

![Game Screenshot](https://img.shields.io/badge/Status-Ready%20to%20Deploy-green)
![License](https://img.shields.io/badge/License-MIT-blue)

## 🎯 How to Play

1. **Join the Lobby**: 3-5 players enter their names
2. **Start the Game**: One player clicks "EXECUTE SCENARIO"
3. **Get Your Role**: Each player receives a secret character dossier
4. **Find the AI**: One player is secretly replaced by an AI bot
5. **Discuss & Vote**: Chat with others and vote to eject the impostor
6. **Win**: Humans win if they eject the AI, AI wins if an innocent is ejected

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 16+ installed
- OpenAI API key (optional, uses mock data without it)

### Setup

1. **Clone the repository**
```bash
git clone YOUR_REPO_URL
cd PvAI
```

2. **Install server dependencies**
```bash
cd server
npm install
```

3. **Create server/.env file**
```
OPENAI_API_KEY=your_openai_api_key_here
PORT=3001
```

4. **Install client dependencies**
```bash
cd ../client
npm install
```

5. **Start the server** (in one terminal)
```bash
cd server
node server.js
```

6. **Start the client** (in another terminal)
```bash
cd client
npm run dev
```

7. **Open the game**
   - Visit http://localhost:3000
   - Open multiple browser windows to test multiplayer

## 🌐 Deploy to Production

**See [DEPLOY.md](./DEPLOY.md) for complete deployment instructions!**

**Quick version:**
1. Deploy backend to Render.com (free)
2. Deploy frontend to Vercel.com (free)
3. Connect them with environment variables
4. Share your URL with friends!

See [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md) for a quick checklist.

## 🎨 Features

- **Real-time multiplayer** with Socket.io
- **AI-powered impostor** using OpenAI GPT-4o-mini
- **Immersive retro UI** with CRT monitor effects
- **Secret dossiers** with character backstories
- **Interactive journal** for taking notes
- **Vote system** for ejecting suspects
- **Rate limiting** to mask AI processing time
- **Random delays** on all messages for fairness

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: Node.js, Express, Socket.io
- **AI**: OpenAI API (GPT-4o-mini)
- **Deployment**: Vercel (frontend) + Render (backend)

## 📁 Project Structure

```
PvAI/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── App.jsx      # Main app component
│   │   └── index.css    # Global styles
│   ├── public/          # Static assets
│   └── package.json
├── server/              # Node.js backend
│   ├── server.js        # Main server file
│   ├── package.json
│   └── .env.example
├── DEPLOY.md            # Deployment guide
├── DEPLOY_CHECKLIST.md  # Quick deploy checklist
└── README.md            # This file
```

## 🎯 Gameplay Tips

- **For Humans**: Ask questions only a human would know, look for unnatural responses
- **For AI**: Try to blend in, mimic human conversation patterns
- **Use the Journal**: Take notes on suspicious behavior in the notes page
- **Watch the Chat**: The AI might give generic answers or take slightly different timing

## 💰 Costs

- **Development**: Free (uses mock AI responses without API key)
- **Production**: 
  - Hosting: Free (Vercel + Render free tiers)
  - OpenAI API: ~$0.002 per game (~$1 for 500 games)

## 🤝 Contributing

Feel free to fork and improve! Some ideas:
- Add more scenarios
- Improve AI prompts for better deception
- Add sound effects and animations
- Create different game modes (speed round, detective mode, etc.)
- Add player statistics and leaderboards
- Improve journal trigger positioning

## 📝 License

MIT License - feel free to use this for your own projects!

## 🐛 Known Issues

- Journal trigger positioning may need adjustment based on screen size
- Render free tier sleeps after 15 min (30s wake-up time on first request)
- First AI response may be slow as model initializes

## 🙏 Credits

Built with ❤️ using:
- OpenAI's GPT-4o-mini for the AI impostor logic
- Socket.io for real-time communication
- React for the frontend
- Tailwind CSS for styling

## 📧 Support

If you encounter issues:
1. Check the [DEPLOY.md](./DEPLOY.md) troubleshooting section
2. Verify your environment variables are set correctly
3. Check browser console and server logs for errors
4. Make sure you have OpenAI API credits

---

**Ready to deploy?** Check out [DEPLOY.md](./DEPLOY.md) for step-by-step instructions!
