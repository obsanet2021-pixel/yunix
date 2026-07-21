# 🎯 Yunix MCP Server - Complete Setup & Deployment Index

## ⚡ Quick Links (Start Here!)

| Priority | File | What to Do | Time |
|----------|------|-----------|------|
| **🔴 NOW** | [DEPLOYMENT_SUMMARY.txt](./DEPLOYMENT_SUMMARY.txt) | Read this first - visual overview | 2 min |
| **🔴 NOW** | Step 1 in summary | Rotate Supabase Service Role Key | 2 min |
| **🟡 NEXT** | [yunix-mcp-server/QUICKSTART.md](./yunix-mcp-server/QUICKSTART.md) | Follow complete 20-minute setup | 20 min |
| **🟡 NEXT** | [yunix-mcp-server/DEPLOYMENT_GUIDE.md](./yunix-mcp-server/DEPLOYMENT_GUIDE.md) | Read deployment options (while following QUICKSTART) | 5 min |
| **🟢 DONE** | [FILE_REFERENCE_GUIDE.md](./FILE_REFERENCE_GUIDE.md) | Understand repo structure (reference) | As needed |

---

## 📊 Status Dashboard

```
✅ Repository Security
   ✓ .env removed from git tracking
   ✓ Merge conflicts resolved
   ✓ Pre-commit hooks active
   ✓ .env.example contains only placeholders

📚 Documentation Complete
   ✓ QUICKSTART.md (20-minute setup)
   ✓ DEPLOYMENT_GUIDE.md (complete reference)
   ✓ SECURITY_AND_DEPLOYMENT_CHECKLIST.md
   ✓ FILE_REFERENCE_GUIDE.md
   ✓ setup.ps1 (automated Windows setup)

⏳ Awaiting Your Action
   ⏳ Rotate SUPABASE_SERVICE_ROLE_KEY
   ⏳ Update local .env files
   ⏳ Test MCP server locally
   ⏳ Deploy via tunnel (Cloudflare, ngrok, or localtunnel)
   ⏳ Connect to Claude Desktop or claude.ai

🎯 Domain Configuration
   Domain: yunixofficial.com
   Recommended endpoint: https://api.yunixofficial.com/mcp
```

---

## 🚀 Getting Started (30 Minutes to Production)

### Phase 1: Security (5 minutes)
1. Open https://app.supabase.com
2. Navigate to Settings → API
3. Find "service_role" → Click three-dot menu → "Rotate key"
4. Copy the new key immediately
5. Open `notepad c:\Users\HP\Downloads\yunix\yunix-mcp-server\.env`
6. Replace old key with new one
7. Save and close

**✓ You've just invalidated the exposed credential!**

### Phase 2: Local Testing (10 minutes)
```powershell
cd c:\Users\HP\Downloads\yunix\yunix-mcp-server
npm run build
npm run start:http
# Should see: "yunix-mcp-server running on http://0.0.0.0:3000/mcp"

# In another terminal, verify:
Invoke-WebRequest -Uri http://127.0.0.1:3000/health -UseBasicParsing
# Should return: {"status":"ok","server":"yunix-mcp-server","version":"1.0.0"}
```

**✓ Server is working locally!**

### Phase 3: Deploy to Internet (5-15 minutes, pick ONE)

**Option A: Cloudflare Tunnel (Recommended)**
```powershell
cloudflared tunnel create yunix-mcp
cloudflared tunnel route dns yunix-mcp api.yunixofficial.com
cloudflared tunnel run yunix-mcp
# Endpoint: https://api.yunixofficial.com/mcp
```
⏱️ **5 minutes**

**Option B: ngrok (Quick test)**
```powershell
ngrok http 3000
# Copy HTTPS URL, add /mcp at the end
```
⏱️ **1 minute**

**Option C: localtunnel (Quick test)**
```powershell
npm install -g localtunnel
lt --port 3000 --subdomain yunix-mcp
# Endpoint: https://yunix-mcp.loca.lt/mcp
```
⏱️ **2 minutes**

**✓ Server is live on the internet!**

### Phase 4: Connect to Claude (5 minutes)

**Claude Desktop:**
1. Edit `%APPDATA%\Claude\claude_desktop_config.json`
2. Add MCP server config (see QUICKSTART.md for exact format)
3. Restart Claude
4. Start a conversation - MCP tools available

**Claude.ai:**
1. Go to https://claude.ai
2. Settings → Capabilities → Extensions → "Connect MCP server"
3. Paste your endpoint
4. Start a conversation - MCP tools available

**✓ Claude can now access your Yunix data!**

---

## 📁 File Organization

### Documentation Files (Read These)
```
c:\Users\HP\Downloads\yunix\
├── DEPLOYMENT_SUMMARY.txt              ← Start here (visual overview)
├── SECURITY_AND_DEPLOYMENT_CHECKLIST.md ← Action items & security
├── FILE_REFERENCE_GUIDE.md              ← Understand repository
└── yunix-mcp-server/
    ├── QUICKSTART.md                   ← 20-minute setup
    └── DEPLOYMENT_GUIDE.md             ← Complete reference
```

### Configuration Files (Use These)
```
├── .env                                ← LOCAL: Your root project secrets
├── .env.example                        ← TEMPLATE: Reference for vars
└── yunix-mcp-server/
    ├── .env                            ← LOCAL: MCP server secrets
    └── .env.example                    ← TEMPLATE: Reference for vars
```

### Source Code (Don't Edit)
```
yunix-mcp-server/
├── src/
│   ├── index.ts                        ← Main server
│   └── services/supabase.ts            ← Reads your env vars
└── scripts/
    ├── setup.ps1                       ← Automated setup
    └── check-supabase-jwt.js           ← Security pre-commit hook
```

---

## 🔑 Environment Variables Explained

### Your MCP Server Needs:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your rotated service role key (SECRET!)
- `YUNIX_USER_ID` - Your Supabase user ID
- `TRANSPORT` - "http" (remote) or "stdio" (Claude Desktop)
- `PORT` - "3000" (for HTTP mode)

### Where They Go:
1. **Local development:** `yunix-mcp-server/.env` (not committed to git)
2. **Production (Vercel):** Set in Vercel dashboard environment variables
3. **Production (self-hosted):** Set as system environment variables or in .env file

### How They're Used:
- `src/index.ts` loads `dotenv/config` at startup
- `src/services/supabase.ts` reads them and creates Supabase client
- If missing, server throws error and won't start (this is what you fixed!)

---

## 🎓 Understanding What Happened

### The Problem (Before)
1. `.env` was tracked in git with real credentials
2. Those credentials were pushed to public GitHub
3. Anyone who cloned the repo had access to your Supabase
4. You got the error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"

### The Solution (Done)
1. ✅ Removed `.env` from git tracking
2. ✅ Created `.env.example` with placeholders
3. ✅ Fixed `.gitignore` to prevent future commits
4. ✅ Added pre-commit hooks to detect secrets
5. ⏳ YOU: Rotate the exposed credentials

### Why Rotation Matters
- The old key in git history is now **publicly visible** on GitHub
- Even if you delete it later, git keeps history
- **Only solution:** Rotate the key to make the old one useless
- Once rotated, the exposed key can't access your account

---

## 🛠️ Available Commands

### Setup & Build
```powershell
cd c:\Users\HP\Downloads\yunix\yunix-mcp-server

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run setup script (Windows)
.\scripts\setup.ps1
```

### Running the Server
```powershell
# HTTP mode (remote/tunnels)
npm run start:http

# stdio mode (Claude Desktop)
npm start

# Development (watch mode)
npm run dev
```

### Verification
```powershell
# Check health
Invoke-WebRequest -Uri http://127.0.0.1:3000/health -UseBasicParsing

# Check which process uses port 3000
netstat -ano | Select-String "3000"

# Kill that process if needed
Stop-Process -Id <PID> -Force
```

---

## 📚 Complete File Index

| File | Type | Purpose |
|------|------|---------|
| DEPLOYMENT_SUMMARY.txt | DOC | Visual overview (START HERE) |
| SECURITY_AND_DEPLOYMENT_CHECKLIST.md | DOC | Action items & options |
| FILE_REFERENCE_GUIDE.md | DOC | Repository file structure |
| yunix-mcp-server/QUICKSTART.md | DOC | 20-minute setup guide |
| yunix-mcp-server/DEPLOYMENT_GUIDE.md | DOC | Complete deployment reference |
| yunix-mcp-server/README.md | DOC | MCP server overview |
| .env | CONFIG | LOCAL - Your secrets (not committed) |
| .env.example | CONFIG | TEMPLATE - Reference (tracked in git) |
| yunix-mcp-server/.env | CONFIG | LOCAL - MCP secrets (not committed) |
| yunix-mcp-server/.env.example | CONFIG | TEMPLATE - Reference (tracked in git) |
| yunix-mcp-server/src/index.ts | CODE | Server entry point |
| yunix-mcp-server/src/services/supabase.ts | CODE | Supabase client init (reads env vars) |
| yunix-mcp-server/scripts/setup.ps1 | SCRIPT | Automated Windows setup |
| yunix-mcp-server/scripts/check-supabase-jwt.js | SCRIPT | Pre-commit security hook |

---

## ✅ Verification Checklist

- [ ] Read DEPLOYMENT_SUMMARY.txt
- [ ] Rotated SUPABASE_SERVICE_ROLE_KEY in Supabase
- [ ] Updated yunix-mcp-server/.env with new key
- [ ] Ran `npm run build` successfully
- [ ] Ran `npm run start:http` - server started
- [ ] Health check passed: GET /health returns 200
- [ ] Chose deployment option (Cloudflare/ngrok/localtunnel)
- [ ] Deployment running with HTTPS endpoint
- [ ] Connected to Claude Desktop or claude.ai
- [ ] Can ask Claude to access your Yunix data

---

## 🚨 Troubleshooting Quick Reference

| Problem | Solution |
|---------|----------|
| "Missing SUPABASE_URL..." | Check `.env` exists in yunix-mcp-server/ and has credentials |
| Port 3000 in use | `netstat -ano \| Select-String "3000"` then `Stop-Process -Id <PID> -Force` |
| Build fails | Run `npm install` first, then `npm run build` |
| Health check fails | Verify server running, check firewall allows port 3000 |
| MCP tools don't appear | Ensure endpoint is HTTPS, restart Claude |
| Tunnel won't connect | Check internet connection, verify firewall allows outbound |

---

## 🎯 Next Steps

1. **RIGHT NOW:** Open [DEPLOYMENT_SUMMARY.txt](./DEPLOYMENT_SUMMARY.txt)
2. **STEP 1:** Rotate your Supabase Service Role Key (2 minutes)
3. **STEP 2:** Update `.env` with new key (1 minute)
4. **STEP 3:** Test locally (3 minutes)
5. **STEP 4:** Deploy via tunnel (5 minutes)
6. **STEP 5:** Connect to Claude (5 minutes)
7. **DONE!** Start using Yunix with Claude 🎉

---

## 📞 Support

- Questions about setup? → Check `yunix-mcp-server/QUICKSTART.md`
- Questions about deployment? → Check `yunix-mcp-server/DEPLOYMENT_GUIDE.md`
- Questions about files? → Check `FILE_REFERENCE_GUIDE.md`
- Questions about security? → Check `SECURITY_AND_DEPLOYMENT_CHECKLIST.md`

---

**Last Updated:** 2026-07-21
**Status:** ✅ Repository secured, documentation complete, awaiting credential rotation
**Estimated Time to Production:** ~16 minutes (after credential rotation)
