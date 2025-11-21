# 🎮 The Turing Trap - Complete Deployment Guide

## Prerequisites
- GitHub account
- Vercel account (vercel.com)
- Render account (render.com) OR Railway account (railway.app)
- OpenAI API key (platform.openai.com)

---

## 📦 Step 1: Prepare Your Code

### 1.1 Push to GitHub
```bash
cd c:/Users/Matth/PvAI
git init
git add .
git commit -m "Initial commit - Turing Trap game"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

---

## 🖥️ Step 2: Deploy Backend (Render.com)

### 2.1 Create New Web Service
1. Go to https://render.com and sign in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select your repo: `PvAI`

### 2.2 Configure Service
- **Name**: `turing-trap-server`
- **Region**: Choose closest to you
- **Branch**: `main`
- **Root Directory**: `server`
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `node server.js`
- **Instance Type**: `Free`

### 2.3 Add Environment Variables
Click **"Advanced"** → **"Add Environment Variable"**:

| Key | Value |
|-----|-------|
| `OPENAI_API_KEY` | Your OpenAI API key from platform.openai.com |
| `NODE_ENV` | `production` |
| `CLIENT_URL` | Leave blank for now (we'll add this after deploying frontend) |

### 2.4 Deploy
1. Click **"Create Web Service"**
2. Wait 2-3 minutes for deployment
3. **COPY YOUR SERVER URL** (e.g., `https://turing-trap-server.onrender.com`)
4. Test it by visiting: `https://turing-trap-server.onrender.com/health`
   - You should see: `{"status":"ok"}`

---

## 🌐 Step 3: Deploy Frontend (Vercel)

### 3.1 Create New Project
1. Go to https://vercel.com and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository

### 3.2 Configure Project
- **Framework Preset**: `Vite`
- **Root Directory**: `client`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3.3 Add Environment Variables
Click **"Environment Variables"**:

| Key | Value |
|-----|-------|
| `VITE_SERVER_URL` | Your Render server URL from Step 2.3 |

Example: `https://turing-trap-server.onrender.com`

### 3.4 Deploy
1. Click **"Deploy"**
2. Wait 1-2 minutes
3. **COPY YOUR VERCEL URL** (e.g., `https://turing-trap.vercel.app`)

---

## 🔗 Step 4: Connect Frontend & Backend

### 4.1 Update Backend CORS
1. Go back to Render.com → Your service
2. Click **"Environment"**
3. Add/Update environment variable:
   - **Key**: `CLIENT_URL`
   - **Value**: Your Vercel URL (e.g., `https://turing-trap.vercel.app`)
4. Click **"Save Changes"**
5. Service will automatically redeploy

---

## ✅ Step 5: Test Your Deployment

### 5.1 Open Your Game
1. Visit your Vercel URL: `https://turing-trap.vercel.app`
2. Open browser console (F12) - you should see: `Connecting to server: https://turing-trap-server.onrender.com`
3. Enter a username and click "INITIALIZE UPLINK"

### 5.2 Test Multiplayer
1. Open the game in **2 different browsers** (or incognito window)
2. Join with different usernames
3. One person clicks "EXECUTE SCENARIO"
4. Both should see the game start!

### 5.3 Test AI
1. Start a game with just yourself
2. The AI bot should automatically join
3. Send a message in chat
4. The AI should respond (may take 5-10 seconds)

---

## 🐛 Troubleshooting

### "Failed to connect to server"
- Check browser console for errors
- Verify `VITE_SERVER_URL` in Vercel matches your Render URL
- Check Render logs for errors

### "AI not responding"
- Verify `OPENAI_API_KEY` is set correctly in Render
- Check Render logs for OpenAI API errors
- Make sure you have credits in your OpenAI account

### "Server is slow to respond"
- Render free tier sleeps after 15 min of inactivity
- First request takes ~30 seconds to wake up
- Upgrade to paid tier ($7/month) for always-on hosting

### CORS errors
- Make sure `CLIENT_URL` in Render matches your Vercel URL exactly
- No trailing slash in URLs

---

## 💰 Cost Breakdown

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| **Vercel** | ✅ Unlimited (hobby) | $20/month (Pro) |
| **Render** | ✅ 750 hours/month | $7/month (always-on) |
| **OpenAI** | Pay-per-use | ~$0.002/game (GPT-4o-mini) |

**Total for casual use: $0/month** (just pay for OpenAI usage)

---

## 🚀 Alternative: Deploy to Railway (All-in-One)

If you prefer one platform:

1. Go to https://railway.app
2. Create **two services**:
   - **Backend**: Deploy from `server` folder
   - **Frontend**: Deploy from `client` folder (as static site)
3. Railway auto-detects build commands
4. Add environment variables as above
5. Railway gives $5 free credit/month

---

## 📝 Post-Deployment

### Share Your Game
Send your Vercel URL to friends:
```
Hey! Play "The Turing Trap" with me:
https://turing-trap.vercel.app

It's a social deduction game where you have to find the AI impostor!
```

### Monitor Usage
- **Render**: Dashboard shows request count, uptime
- **Vercel**: Analytics show visitor count
- **OpenAI**: Usage dashboard shows API costs

### Update Your Game
```bash
# Make changes to your code
git add .
git commit -m "Update game"
git push

# Both Vercel and Render will auto-deploy!
```

---

## 🎉 You're Done!

Your game is now live and playable by anyone with the link!

**Next Steps:**
- Customize the scenarios in `server/server.js`
- Adjust the journal trigger position in `client/src/index.css`
- Add more game modes or features
- Share with friends and collect feedback!
