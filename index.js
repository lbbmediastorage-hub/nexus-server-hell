const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.PORT || 8080;

// Create HTTP server for health checks & WebSocket upgrades
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Project Nexus P2P Matchmaker & Signaling Server Online\nActive Nodes: ' + clients.size);
  } else {
    res.writeHead(404);
    res.end();
  }
});

const wss = new WebSocketServer({ server });

// In-memory registry: Map<cleanPcId, { ws, pcId, pin, computerName, publicIp, registeredAt }>
const clients = new Map();

function cleanId(id) {
  return String(id || '').replace(/[\s-]/g, '').trim();
}

wss.on('connection', (ws, req) => {
  const remoteIp = req.headers['x-forwarded-for'] 
    ? req.headers['x-forwarded-for'].split(',')[0].trim() 
    : req.socket.remoteAddress;

  let registeredId = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const action = msg.action || msg.type;

      switch (action) {
        case 'register': {
          const rawId = msg.pcId || msg.pc_id;
          const id = cleanId(rawId);
          if (!id) {
            ws.send(JSON.stringify({ status: 'error', message: 'Invalid PC ID' }));
            return;
          }

          registeredId = id;
          clients.set(id, {
            ws,
            pcId: rawId,
            pin: String(msg.pin || '').trim(),
            computerName: msg.computerName || 'Windows PC',
            publicIp: remoteIp,
            localIp: msg.localIp || '',
            port: msg.port || 9988,
            registeredAt: Date.now(),
          });

          console.log(`[+] Registered PC: ${rawId} (Public: ${remoteIp}, Local: ${msg.localIp || 'N/A'}) | Total Online: ${clients.size}`);
          ws.send(JSON.stringify({ status: 'registered', pcId: rawId, publicIp: remoteIp }));
          break;
        }

        case 'connect': {
          const targetId = cleanId(msg.partnerId || msg.target_id);
          const pin = String(msg.pin || '').trim();
          const senderId = msg.senderId || msg.sender_id || registeredId;

          const target = clients.get(targetId);
          if (!target || target.ws.readyState !== WebSocket.OPEN) {
            ws.send(JSON.stringify({ 
              status: 'error', 
              message: `Partner ID '${msg.partnerId}' is offline or not found.` 
            }));
            return;
          }

          if (target.pin !== pin) {
            console.log(`[!] Auth failed for ${targetId}: Incorrect PIN entered by ${senderId}`);
            ws.send(JSON.stringify({ 
              status: 'error', 
              message: 'Incorrect Password / PIN.' 
            }));
            return;
          }

          console.log(`[*] Connecting ${senderId} -> ${targetId} via P2P match`);

          // Tell the target host that a partner wants to connect
          target.ws.send(JSON.stringify({
            action: 'incoming_connection',
            senderId,
            senderIp: remoteIp,
          }));

          // Tell the sender that partner accepted and provide connection info
          ws.send(JSON.stringify({
            status: 'partner_accepted',
            partnerId: target.pcId,
            partnerIp: target.publicIp,
            partnerLocalIp: target.localIp,
            partnerPort: target.port || 9988,
            targetComputerName: target.computerName,
          }));
          break;
        }

        case 'signal': {
          // Forward P2P ICE / NAT hole-punching metadata directly to target
          const targetId = cleanId(msg.targetId || msg.target_id);
          const target = clients.get(targetId);
          if (target && target.ws.readyState === WebSocket.OPEN) {
            target.ws.send(JSON.stringify({
              action: 'signal',
              senderId: registeredId,
              data: msg.data,
            }));
          }
          break;
        }

        case 'ping': {
          ws.send(JSON.stringify({ status: 'pong', timestamp: Date.now() }));
          break;
        }
      }
    } catch (err) {
      console.error('Error handling message:', err.message);
    }
  });

  ws.on('close', () => {
    if (registeredId && clients.has(registeredId)) {
      clients.delete(registeredId);
      console.log(`[-] Disconnected PC: ${registeredId} | Remaining Online: ${clients.size}`);
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Project Nexus Matchmaking & Signaling Server v1.0   `);
  console.log(` Listening on port: ${PORT}                          `);
  console.log(` Memory Footprint: < 15 MB | Pure P2P Broker        `);
  console.log(`====================================================`);
});
