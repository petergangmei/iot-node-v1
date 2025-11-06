require('dotenv').config();
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

// Store connected ESP32 devices
const esp32Devices = new Map();

// Create HTTP server
const server = http.createServer((req, res) => {
  // Enable CORS for browser requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Serve the control dashboard
  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(path.join(__dirname, 'public', 'index.html'), (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading dashboard');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }

  // API: Get list of connected devices
  if (req.url === '/api/devices') {
    const devices = Array.from(esp32Devices.keys()).map(id => ({
      id,
      connected: true,
      connectedAt: esp32Devices.get(id).connectedAt
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ devices }));
    return;
  }

  // API: Control LED
  if (req.url.startsWith('/api/led')) {
    const urlParams = new URL(req.url, `http://localhost:${PORT}`);
    const state = urlParams.searchParams.get('state');
    const deviceId = urlParams.searchParams.get('device') || 'default';

    if (!state || !['on', 'off'].includes(state)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid state. Use on or off' }));
      return;
    }

    const device = esp32Devices.get(deviceId);
    if (device && device.socket.readyState === WebSocket.OPEN) {
      device.socket.send(`light:${state}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        message: `LED turned ${state}`,
        device: deviceId
      }));
    } else {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'ESP32 device not connected',
        device: deviceId
      }));
    }
    return;
  }

  // API: Send custom command
  if (req.url.startsWith('/api/command')) {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const { command, device = 'default' } = JSON.parse(body);
          
          if (!command) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Command is required' }));
            return;
          }

          const esp32Device = esp32Devices.get(device);
          if (esp32Device && esp32Device.socket.readyState === WebSocket.OPEN) {
            esp32Device.socket.send(command);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: true, 
              message: 'Command sent',
              command,
              device
            }));
          } else {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              error: 'ESP32 device not connected',
              device
            }));
          }
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }
  }

  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Create WebSocket server
const wsServer = new WebSocket.Server({ noServer: true });

wsServer.on('connection', (socket, request) => {
  // Extract device ID from query params or use default
  const url = new URL(request.url, `http://localhost:${PORT}`);
  const deviceId = url.searchParams.get('id') || 'default';

  console.log(`✅ ESP32 device connected: ${deviceId}`);
  
  // Store the device connection
  esp32Devices.set(deviceId, {
    socket,
    connectedAt: new Date().toISOString()
  });

  // Send welcome message
  socket.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to IoT server',
    deviceId
  }));

  // Handle messages from ESP32
  socket.on('message', (data) => {
    try {
      const message = data.toString();
      console.log(`📨 Message from ${deviceId}:`, message);
      
      // You can process sensor data or status updates here
      // For example, broadcast to other clients or store in database
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  // Handle disconnection
  socket.on('close', () => {
    console.log(`❌ ESP32 device disconnected: ${deviceId}`);
    esp32Devices.delete(deviceId);
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error(`⚠️ WebSocket error for ${deviceId}:`, error);
  });
});

// Upgrade HTTP to WebSocket for ESP32 connections
server.on('upgrade', (request, socket, head) => {
  if (request.url.startsWith('/ws')) {
    wsServer.handleUpgrade(request, socket, head, (ws) => {
      wsServer.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Start the server
server.listen(PORT, () => {
  console.log('🚀 ESP32 IoT Server Started');
  console.log(`📡 HTTP Server: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket Server: ws://localhost:${PORT}/ws`);
  console.log(`🌐 Control Dashboard: http://localhost:${PORT}`);
  console.log('\n📋 API Endpoints:');
  console.log(`   GET  /api/devices - List connected devices`);
  console.log(`   GET  /api/led?state=on&device=default - Control LED`);
  console.log(`   POST /api/command - Send custom command`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

