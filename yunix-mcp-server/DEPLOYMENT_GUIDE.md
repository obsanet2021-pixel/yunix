# Yunix MCP Server Deployment Guide

## Overview
The **Yunix MCP (Model Context Protocol) Server** exposes your Yunix trading platform data (trades, analytics, prop firms, playbooks, certificates) to Claude AI via the MCP protocol.

The server can run in two modes:
- **stdio** (local): For Claude Desktop app with local connector
- **http** (remote): For cloud deployments and remote access

---

## Prerequisites

1. **Supabase Project**: Your Yunix frontend already uses this
2. **Domain**: `yunixofficial.com` (or your chosen domain)
3. **Node.js**: v18+ (check with `node --version`)

---

## Step 1: Get Your Credentials

### A. Supabase Service Role Key (Secret)
1. Go to: **https://app.supabase.com**
2. Select your project
3. Navigate to: **Project Settings → API**
4. Under "service_role", click the three-dot menu → **Rotate key**
5. Confirm and copy the **new key** (appears once, save it securely)
6. The old key is now invalid ✓

### B. Your Supabase User ID
1. In Supabase, go to: **SQL Editor**
2. Run this query:
   ```sql
   SELECT id FROM auth.users WHERE email = 'your-email@example.com';
   ```
3. Copy the UUID result (e.g., `ec850929-598f-41b3-a23c-7f0ceb464b8c`)

### C. Telegram Bot Token (if using Telegram integration)
1. Message **@BotFather** on Telegram
2. Send `/token`
3. Select your bot
4. Copy the new token
5. (Optional - only if you use Telegram features)

---

## Step 2: Local Setup

### Clone & Install
```powershell
cd c:\Users\HP\Downloads\yunix\yunix-mcp-server
npm install
npm run build
```

### Create Local `.env` File
Create `yunix-mcp-server/.env` (NOT committed to git):

```dotenv
# Supabase project
SUPABASE_URL=https://ounphbavkyrmotskydto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Your rotated key
YUNIX_USER_ID=ec850929-598f-41b3-a23c-7f0ceb464b8c  # Your user ID

# Transport & Port
TRANSPORT=http
PORT=3000
```

### Test Locally
```powershell
npm run start:http
```

You should see:
```
yunix-mcp-server running on http://0.0.0.0:3000/mcp
```

Test health check:
```powershell
Invoke-WebRequest -Uri http://127.0.0.1:3000/health -UseBasicParsing
# Should return: {"status":"ok","server":"yunix-mcp-server","version":"1.0.0"}
```

---

## Step 3: Expose to the Internet

You need a **public HTTPS URL** pointing to your local server running on `0.0.0.0:3000`.

### Option A: Cloudflare Tunnel (Recommended)
**Best for production — provides HTTPS automatically**

1. Install Cloudflare Tunnel CLI:
   ```powershell
   choco install cloudflare-warp  # or download from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/install-and-setup/
   ```

2. Create a tunnel to your MCP server:
   ```powershell
   cloudflared tunnel create yunix-mcp
   cloudflared tunnel route dns yunix-mcp api.yunixofficial.com
   ```

3. Create tunnel config at `%userprofile%\.cloudflared\config.yml`:
   ```yaml
   tunnel: yunix-mcp
   credentials-file: %userprofile%\.cloudflared\<tunnel-id>.json
   ingress:
     - hostname: api.yunixofficial.com
       service: http://localhost:3000
     - service: http_status:404
   ```

4. Start the tunnel:
   ```powershell
   cloudflared tunnel run yunix-mcp
   ```

5. Your MCP server is now at: `https://api.yunixofficial.com/mcp`

### Option B: ngrok (Quick Testing)
```powershell
ngrok http 3000
# Copy the HTTPS URL: https://xxxx-xx-xxx-xxx.ngrok.io
# Your MCP endpoint: https://xxxx-xx-xxx-xxx.ngrok.io/mcp
```

### Option C: Localtunnel (Quick Testing)
```powershell
npm install -g localtunnel
lt --port 3000 --subdomain yunix-mcp
# Your MCP endpoint: https://yunix-mcp.loca.lt/mcp
```

---

## Step 4: Configure Claude Desktop (Optional)

To use the MCP server with Claude Desktop:

1. Go to: `%APPDATA%\Claude\claude_desktop_config.json`
2. Add the MCP server configuration:
   ```json
   {
     "mcpServers": {
       "yunix": {
         "command": "node",
         "args": ["C:\\Users\\HP\\Downloads\\yunix\\yunix-mcp-server\\dist\\index.js"],
         "env": {
           "TRANSPORT": "stdio",
           "SUPABASE_URL": "https://ounphbavkyrmotskydto.supabase.co",
           "SUPABASE_SERVICE_ROLE_KEY": "your-rotated-key",
           "YUNIX_USER_ID": "your-user-id"
         }
       }
     }
   }
   ```
3. Restart Claude Desktop
4. In any Claude conversation, the MCP tools will be available

---

## Step 5: Connect to Claude Web (claude.ai)

Once your MCP server is running on a public HTTPS URL:

1. Go to: **https://claude.ai**
2. Start a conversation
3. Click **⚙️ Settings → Capabilities → Extensions**
4. Click **Connect MCP server**
5. Enter your endpoint: `https://api.yunixofficial.com/mcp`
6. Authenticate with your credentials (if prompted)
7. The Yunix tools are now available in Claude

---

## Step 6: Production Deployment (Vercel/Netlify)

### Option A: Vercel Serverless
1. Update `package.json`:
   ```json
   "scripts": {
     "build": "tsc",
     "start": "node dist/index.js"
   }
   ```

2. Deploy to Vercel:
   ```powershell
   npm install -g vercel
   vercel
   ```

3. Set environment variables in Vercel dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `YUNIX_USER_ID`
   - `TRANSPORT=http`
   - `PORT=3000`

4. Your endpoint: `https://yunix-mcp-vercel.vercel.app/mcp`

### Option B: Self-Hosted with PM2
```powershell
npm install -g pm2

# Create ecosystem.config.js in yunix-mcp-server/
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: "yunix-mcp",
    script: "dist/index.js",
    instances: 1,
    exec_mode: "cluster",
    env: {
      TRANSPORT: "http",
      PORT: 3000,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      YUNIX_USER_ID: process.env.YUNIX_USER_ID,
      NODE_ENV: "production"
    }
  }]
};
EOF

# Start
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## Troubleshooting

### Error: `Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY`
- Ensure `.env` file exists in `yunix-mcp-server/`
- Check that credentials are correct
- Verify `TRANSPORT=http` is set

### Error: `Port 3000 already in use`
```powershell
netstat -ano | Select-String "3000"
Stop-Process -Id <PID> -Force
```

### MCP tools not showing in Claude
- Verify endpoint is HTTPS (not HTTP)
- Check that server is running and health check passes
- Clear Claude cache and reconnect

### Tunnel not connecting
- Ensure `cloudflared` is running
- Check that firewall allows outbound connections
- Verify DNS is configured: `nslookup api.yunixofficial.com`

---

## Security Checklist

✅ `.env` is in `.gitignore` (never commit credentials)
✅ `SUPABASE_SERVICE_ROLE_KEY` is rotated (old key invalidated)
✅ HTTPS tunnel is used (not plain HTTP)
✅ `.env.example` has only placeholders (tracked in git for reference)
✅ Credentials are environment variables (not hardcoded)

---

## API Endpoints

Once deployed, your MCP server exposes:

### Health Check
```
GET https://api.yunixofficial.com/health
Response: {"status":"ok","server":"yunix-mcp-server","version":"1.0.0"}
```

### MCP Protocol
```
POST https://api.yunixofficial.com/mcp
Body: MCP JSON-RPC 2.0 request
```

Available tools:
- **trades**: List trades, create, read, update, delete
- **analytics**: Performance metrics, win rate, PnL
- **prop_firms**: Account cycles, drawdown tracking
- **certificates**: Course completions
- **playbooks**: Trading strategies

---

## Next Steps

1. **Rotate credentials** (if you haven't already):
   - Supabase Service Role Key
   - Telegram Bot Token (if used)

2. **Test locally**:
   ```powershell
   npm run start:http
   ```

3. **Deploy tunnel** (Cloudflare, ngrok, or localtunnel)

4. **Connect to Claude**:
   - Desktop: Add to `claude_desktop_config.json`
   - Web: Use claude.ai → Settings → Extensions

5. **Monitor**:
   - Check logs for errors
   - Test health endpoint daily
   - Keep Node.js and dependencies updated

---

**Questions?** Check the [MCP README](./README.md) or the [Yunix documentation](https://github.com/obsanet2021-pixel/yunix).
