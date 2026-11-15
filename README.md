# Nexus Signaling & P2P Matchmaking Server

Ultra-lightweight WebSocket matchmaking service for **Nexus** (UltraViewer / TeamViewer alternative).

### Key Architectural Characteristics
- **Zero Video / Screen Relaying**: Screen frames, keyboard events, and mouse motions are **100% direct P2P** between host and viewer. Video NEVER passes through this server.
- **Resource Footprint**: < 15 MB RAM, virtually 0% CPU. Can run indefinitely on Railway's free tier.
- **Role**:
  1. Registers online PCs with their 9-digit `pcId` and active 6-digit session `pin`.
  2. Detects public IP (`req.headers['x-forwarded-for']`) and matches partners.
  3. Relays initial connection handshakes and local LAN IPs between peers.

---

## 🚀 1-Click Railway Deployment Guide

### Option 1: Deploy with Railway CLI
1. Install Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```
2. Login to your Railway account:
   ```bash
   railway login
   ```
3. Navigate to the server folder and deploy:
   ```bash
   cd server
   railway init
   railway up
   ```
4. In the Railway dashboard for this service:
   - Go to **Settings** -> **Networking** -> Click **Generate Domain**.
   - You will receive a domain like: `nexus-matchmaker.up.railway.app`
   - Your WebSocket URL is: `wss://nexus-matchmaker.up.railway.app`

### Option 2: Deploy from GitHub Repo
1. Commit and push your code to your GitHub repository.
2. In Railway Dashboard ([railway.app](https://railway.app)):
   - Click **+ New Project** -> **Deploy from GitHub repo**.
   - Select your repo.
   - In **Settings** -> **Root Directory**, set `/server` (or leave as root with the Dockerfile).
   - In **Settings** -> **Networking**, click **Generate Domain**.
   - Copy the public domain URL.

---

## Testing Server Health
Once deployed, open `https://<your-domain>/health` in your browser:
```text
Project Nexus P2P Matchmaker & Signaling Server Online
Active Nodes: 0
```
