# 🚀 Yunix MCP Server - Quick Start (YOU ARE HERE)

**Status:** ✅ Repository secured, documentation complete
**Your next action:** Rotate credentials and test locally

---

## 📋 What Was Just Done

✅ Fixed git security (removed `.env` from tracking)  
✅ Resolved merge conflicts  
✅ Created deployment guide (`DEPLOYMENT_GUIDE.md`)  
✅ Created setup script (`scripts/setup.ps1`)  
✅ Created action checklist (`SECURITY_AND_DEPLOYMENT_CHECKLIST.md`)  
✅ Pushed all changes to GitHub

---

## ⚠️ YOUR IMMEDIATE ACTION (Next 5 Minutes)

### 1️⃣ Rotate Supabase Service Role Key

```
1. Go to https://app.supabase.com
2. Select your Yunix project (ounphbavkyrmotskydto)
3. Settings → API → Find "service_role"
4. Click three-dot menu → "Rotate key"
5. Confirm and COPY THE NEW KEY IMMEDIATELY
6. Save it in a password manager or text file
```

### 2️⃣ Update MCP Server .env

```powershell
# Edit the MCP server's .env
notepad c:\Users\HP\Downloads\yunix\yunix-mcp-server\.env

# Replace this line:
SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..."

# With this (paste your new rotated key):
SUPABASE_SERVICE_ROLE_KEY="your-new-key-here"
```

### 3️⃣ Test the Server

```powershell
cd c:\Users\HP\Downloads\yunix\yunix-mcp-server
npm run build
npm run start:http
```

✅ Success if you see:
```
yunix-mcp-server running on http://0.0.0.0:3000/mcp
```

🧪 Test health in another terminal:
```powershell
Invoke-WebRequest -Uri http://127.0.0.1:3000/health -UseBasicParsing
# Should return: {"status":"ok","server":"yunix-mcp-server","version":"1.0.0"}
```

---

## 🌐 Deploy to the Internet (Next 15 Minutes)

Once local testing works, expose your server to the internet. Choose ONE option:

### Option A: Cloudflare Tunnel (Recommended)
```powershell
# Install from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/install-and-setup/

# Create tunnel
cloudflared tunnel create yunix-mcp

# Route to your domain
cloudflared tunnel route dns yunix-mcp api.yunixofficial.com

# Start tunnel (keep running)
cloudflared tunnel run yunix-mcp

# Your MCP endpoint: https://api.yunixofficial.com/mcp
```

### Option B: ngrok (Fastest for Testing)
```powershell
ngrok http 3000
# Copy the HTTPS URL shown (e.g., https://xxxx-xxxx-xxxx.ngrok.io)
# Your MCP endpoint: https://xxxx-xxxx-xxxx.ngrok.io/mcp
```

### Option C: localtunnel (Quick Alternative)
```powershell
npm install -g localtunnel
lt --port 3000 --subdomain yunix-mcp
# Your MCP endpoint: https://yunix-mcp.loca.lt/mcp
```

---

## 🤖 Connect to Claude (5 Minutes)

### For Claude Desktop:
1. Open: `%APPDATA%\Claude\claude_desktop_config.json`
2. Add this config:
   ```json
   {
     "mcpServers": {
       "yunix": {
         "command": "node",
         "args": ["C:\\Users\\HP\\Downloads\\yunix\\yunix-mcp-server\\dist\\index.js"],
         "env": {
           "TRANSPORT": "stdio",
           "SUPABASE_URL": "https://ounphbavkyrmotskydto.supabase.co",
           "SUPABASE_SERVICE_ROLE_KEY": "your-new-rotated-key",
           "YUNIX_USER_ID": "ec850929-598f-41b3-a23c-7f0ceb464b8c"
         }
       }
     }
   }
   ```
3. Restart Claude Desktop
4. MCP tools now available in conversations

### For claude.ai (Web):
1. Go to https://claude.ai
2. Settings → Capabilities → Extensions → "Connect MCP server"
3. Paste your endpoint: `https://api.yunixofficial.com/mcp`
4. Claude can now access your Yunix data

---

## 📚 Available Commands

```powershell
# Build TypeScript
npm run build

# Start in HTTP mode (remote/tunnel)
npm run start:http

# Start in stdio mode (Claude Desktop)
npm start

# Development mode (watch for changes)
npm run dev

# Setup script (Windows)
.\scripts\setup.ps1
```

---

## 🎯 What You Can Do With the MCP Server

Once connected to Claude, you can ask:

- "Show me my latest 10 trades"
- "What's my win rate for the past month?"
- "Create a new trade: EUR/USD, 1.0 lot, entry 1.0850, SL 1.0820, TP 1.0900"
- "Update my account cycle status to withdrawal"
- "List all my prop firm accounts and their current drawdown"
- "Which playbooks did I complete this week?"

---

## 📖 Complete Documentation

- **DEPLOYMENT_GUIDE.md**: Full deployment instructions (in yunix-mcp-server/)
- **SECURITY_AND_DEPLOYMENT_CHECKLIST.md**: Action items and options (in root)
- **README.md**: MCP server overview and API details
- **.env.example**: Environment variable reference

---

## 🆘 Stuck? Troubleshooting

```powershell
# "Port 3000 already in use"
netstat -ano | Select-String "3000"
Stop-Process -Id <PID> -Force

# "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
# → Check .env file exists in yunix-mcp-server/
# → Verify credentials are not empty

# "Health check fails"
# → Run: npm run build
# → Run: npm run start:http
# → Check firewall allows port 3000

# "MCP tools don't appear in Claude"
# → Ensure endpoint is HTTPS (not HTTP)
# → Verify server health: GET /health returns 200
# → Restart Claude Desktop / refresh claude.ai
```

---

## ✅ Checklist (20 Minutes to Production)

- [ ] Rotated SUPABASE_SERVICE_ROLE_KEY in Supabase
- [ ] Updated `.env` with new key
- [ ] Tested locally: `npm run start:http` works
- [ ] Health check passes: `GET /health` returns 200
- [ ] Tunnel started (Cloudflare, ngrok, or localtunnel)
- [ ] Public HTTPS endpoint verified
- [ ] Connected to Claude Desktop OR claude.ai
- [ ] Asked Claude to show your trades (test works)

---

## 🎓 Next (Optional)

- Deploy to Vercel for auto-scaling
- Set up PM2 for persistent running
- Monitor server logs with `pm2 logs`
- Add custom tools to MCP server (extend `src/tools/`)

---

**Need help?** Check `SECURITY_AND_DEPLOYMENT_CHECKLIST.md` or `DEPLOYMENT_GUIDE.md`

**Ready?** Start with Step 1: Rotate your Supabase key! ⏱️
