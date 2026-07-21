# ⚠️  SECURITY & DEPLOYMENT ACTION ITEMS

## Critical: Rotate Exposed Credentials NOW

Your Supabase Service Role Key and Telegram Bot Token were exposed in public git commit `1ac806e` (pushed to GitHub). These **must be rotated immediately** to invalidate the compromised keys.

---

## ✅ What Has Been Fixed

1. **Git Security**
   - ✓ Removed `.env` from git tracking (root project)
   - ✓ Resolved merge conflicts in `.env.example` and `.gitignore`
   - ✓ `.env.example` now contains only placeholders
   - ✓ All files properly pushed to GitHub

2. **Documentation**
   - ✓ Created `yunix-mcp-server/DEPLOYMENT_GUIDE.md` (100+ lines)
   - ✓ Created `yunix-mcp-server/scripts/setup.ps1` for Windows setup
   - ✓ Configured for your domain: `yunixofficial.com`

3. **Repository**
   - ✓ Commits pushed to GitHub
   - ✓ Security patterns in pre-commit hooks active

---

## 🚨 YOUR IMMEDIATE ACTION REQUIRED

### Step 1: Rotate Supabase Service Role Key

**DO THIS FIRST:**

1. Go to: https://app.supabase.com
2. Select your **Yunix project** (ounphbavkyrmotskydto)
3. Navigate to: **Settings → API**
4. Find the **service_role** key section
5. Click the **three-dot menu** → **Rotate key**
6. Click **Confirm** when prompted
7. **Copy the new key immediately** (it appears only once)
8. Save it securely (password manager, etc.)

### Step 2: Update MCP Server `.env`

Edit `c:\Users\HP\Downloads\yunix\yunix-mcp-server\.env`:

```powershell
notepad c:\Users\HP\Downloads\yunix\yunix-mcp-server\.env
```

Replace the `SUPABASE_SERVICE_ROLE_KEY` line with the new key you just rotated:

```dotenv
SUPABASE_SERVICE_ROLE_KEY="your-new-rotated-key-here"
```

Keep everything else the same.

### Step 3: Update Root `.env` (if needed)

Edit `c:\Users\HP\Downloads\yunix\.env`:

```powershell
notepad c:\Users\HP\Downloads\yunix\.env
```

Update:
- `SUPABASE_SERVICE_ROLE_KEY=your-new-rotated-key-here`
- `TELEGRAM_BOT_TOKEN=your-new-token-if-rotated` (if you rotated it)

### Step 4: Test the MCP Server

```powershell
cd c:\Users\HP\Downloads\yunix\yunix-mcp-server
npm run build
npm run start:http
```

You should see:
```
yunix-mcp-server running on http://0.0.0.0:3000/mcp
```

Test health:
```powershell
Invoke-WebRequest -Uri http://127.0.0.1:3000/health -UseBasicParsing
# Should return: {"status":"ok","server":"yunix-mcp-server","version":"1.0.0"}
```

---

## 📋 Deployment Options for yunixofficial.com

Once the server is running locally and tested, you need to expose it to the internet. Choose one:

### Option A: Cloudflare Tunnel (Recommended for Production)
**Pros:** Free HTTPS, no port forwarding, automatic DNS
```powershell
# Install: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/install-and-setup/
cloudflared tunnel create yunix-mcp
cloudflared tunnel route dns yunix-mcp api.yunixofficial.com
cloudflared tunnel run yunix-mcp
```

**Result:** `https://api.yunixofficial.com/mcp`

### Option B: ngrok (Quick Testing)
**Pros:** Quick setup, good for testing
```powershell
ngrok http 3000
# Copy the HTTPS URL provided
```

**Result:** `https://xxxx-xx-xxx-xxx.ngrok.io/mcp`

### Option C: localtunnel (Quick Testing)
**Pros:** Subdomain naming
```powershell
npm install -g localtunnel
lt --port 3000 --subdomain yunix-mcp
```

**Result:** `https://yunix-mcp.loca.lt/mcp`

### Option D: Vercel Deployment (Production)
**Pros:** Serverless, automatic scaling, CI/CD
- Follow instructions in `DEPLOYMENT_GUIDE.md`
- Deploy via `vercel` CLI
- Set env vars in Vercel dashboard

---

## 🔌 Connect to Claude

Once your MCP server is running on a public HTTPS URL:

### For Claude Desktop:
1. Edit: `%APPDATA%\Claude\claude_desktop_config.json`
2. Add:
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

### For claude.ai (Web):
1. Go to: https://claude.ai
2. Click: **⚙️ Settings → Capabilities → Extensions → Connect MCP server**
3. Enter your endpoint: `https://api.yunixofficial.com/mcp`
4. The Yunix tools will appear in your conversations

---

## 📊 Available MCP Tools

Once connected, Claude will have access to:

- **Trades**: Create, read, update, delete trades with full analytics
- **Analytics**: Win rate, PnL, performance metrics by timeframe
- **Prop Firms**: Account cycles, drawdown tracking, funding status
- **Certificates**: Course completions and credentials
- **Playbooks**: Trading strategies and patterns

---

## 🔐 Security Checklist

- [ ] Rotated SUPABASE_SERVICE_ROLE_KEY
- [ ] Updated MCP server `.env` with new key
- [ ] Updated root `.env` with new key (if using)
- [ ] Tested server locally (`npm run start:http`)
- [ ] Health check passes: `GET /health` returns 200
- [ ] Tunnel/deployment configured (Cloudflare, ngrok, etc.)
- [ ] MCP endpoint is HTTPS (not HTTP)
- [ ] Claude Desktop or claude.ai is connected

---

## 📁 File Structure

```
c:\Users\HP\Downloads\yunix\
├── .env                           # LOCAL (not committed) - has your secrets
├── .env.example                   # TRACKED - templates only, no secrets
├── .gitignore                     # TRACKED - properly ignores .env
└── yunix-mcp-server/
    ├── .env                       # LOCAL (not committed) - MCP secrets
    ├── .env.example               # TRACKED - templates only
    ├── .gitignore                 # TRACKED - ignores .env
    ├── DEPLOYMENT_GUIDE.md        # Complete deployment instructions
    ├── src/
    │   └── services/supabase.ts   # Reads SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY
    ├── scripts/
    │   ├── check-supabase-jwt.js  # Pre-commit hook (prevents secret commits)
    │   └── setup.ps1              # Setup script for Windows
    └── dist/                       # Compiled JavaScript (build output)
```

---

## 🆘 Troubleshooting

**Q: Port 3000 is already in use**
```powershell
netstat -ano | Select-String "3000"
Stop-Process -Id <PID> -Force
```

**Q: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"**
- Check `.env` exists in `yunix-mcp-server/`
- Verify keys are not missing or empty
- Ensure no quotes are broken

**Q: Health check fails**
- Check server is running: `npm run start:http`
- Verify port 3000 is not firewalled
- Check that no other process is using that port

**Q: MCP tools don't appear in Claude**
- Ensure endpoint is HTTPS (not HTTP)
- Verify server is running and responds to health check
- Restart Claude Desktop/refresh claude.ai
- Check that endpoint URL is correct

---

## 📚 Documentation

- **DEPLOYMENT_GUIDE.md**: Full deployment guide (in yunix-mcp-server/)
- **README.md**: MCP server overview
- **.env.example**: Environment variable reference (never commit real values)

---

## ✨ Next Steps Summary

1. **NOW**: Rotate Supabase Service Role Key (see Step 1 above)
2. **NOW**: Update `.env` files with new key
3. **Test**: Run `npm run start:http` and verify health check
4. **Deploy**: Choose tunnel option (Cloudflare recommended)
5. **Connect**: Add to Claude Desktop or claude.ai
6. **Monitor**: Keep server running, monitor logs

---

**Status:** ✅ Repository secured, deployment infrastructure ready
**Action:** 🚨 Rotate credentials immediately (Step 1 above)
**ETA**: 15 minutes to production-ready MCP server
