# Deployment notes

## Frontend
- The app is configured for Vite and can be deployed to Netlify, Vercel, or any static host.
- The included Netlify config builds from the project root and publishes the dist folder.
- For GitHub Pages or other static hosts, ensure the SPA fallback route is configured.

## MCP server
- The MCP server lives in the yunix-mcp-server folder.
- Build it with:
  - npm install
  - npm run build
- Start it in HTTP mode with:
  - npm run start:http
- It exposes the MCP endpoint at /mcp and a health check at /health.
- Required environment variables:
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
  - YUNIX_USER_ID
  - PORT (optional, defaults to 3000)
  - TRANSPORT=http
