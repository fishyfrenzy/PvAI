# 🚀 Quick Deploy Checklist

## Before You Start
- [ ] Get OpenAI API key from platform.openai.com
- [ ] Create GitHub repo
- [ ] Sign up for Render.com
- [ ] Sign up for Vercel.com

## Deploy Backend (Render)
- [ ] New Web Service
- [ ] Connect GitHub repo
- [ ] Root directory: `server`
- [ ] Add `OPENAI_API_KEY` environment variable
- [ ] Deploy and copy URL

## Deploy Frontend (Vercel)
- [ ] New Project
- [ ] Connect GitHub repo  
- [ ] Root directory: `client`
- [ ] Framework: Vite
- [ ] Add `VITE_SERVER_URL` = your Render URL
- [ ] Deploy and copy URL

## Connect Them
- [ ] Go back to Render
- [ ] Add `CLIENT_URL` = your Vercel URL
- [ ] Save (auto-redeploys)

## Test
- [ ] Visit Vercel URL
- [ ] Join game
- [ ] Start scenario
- [ ] Chat with AI

## Done! 🎉
Share your Vercel URL with friends!

---

## Quick Commands

### Push updates:
```bash
git add .
git commit -m "Update"
git push
```
Both services auto-deploy!

### View logs:
- Render: Dashboard → Logs tab
- Vercel: Dashboard → Deployments → View logs

### Check costs:
- OpenAI: platform.openai.com/usage
- Render: Free tier = 750 hours/month
- Vercel: Free tier = unlimited
