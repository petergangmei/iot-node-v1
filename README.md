# ESP32 IoT Control Server

A Node.js server for controlling ESP32 devices via WebSocket and REST API with a beautiful web dashboard.

## Features

- ✅ Real-time bidirectional communication via WebSocket
- ✅ REST API for device control
- ✅ Beautiful web dashboard for controlling devices
- ✅ Support for multiple ESP32 devices
- ✅ Activity logging and monitoring
- ✅ LED control and custom command support

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Usage

### Server Endpoints

- **Dashboard**: `http://localhost:8080`
- **WebSocket**: `ws://localhost:8080/ws`
- **API Base**: `http://localhost:8080/api`

### API Endpoints

#### Get Connected Devices
```
GET /api/devices
```

Response:
```json
{
  "devices": [
    {
      "id": "default",
      "connected": true,
      "connectedAt": "2025-11-06T10:30:00.000Z"
    }
  ]
}
```

#### Control LED
```
GET /api/led?state=on&device=default
```

Parameters:
- `state`: `on` or `off`
- `device`: Device ID (optional, defaults to "default")

#### Send Custom Command
```
POST /api/command
Content-Type: application/json

{
  "command": "sensor:read",
  "device": "default"
}
```

## ESP32 Integration

### Arduino Code Example

```cpp
#include <WiFi.h>
#include <WebSocketsClient.h>

const char* ssid = "YourWiFi";
const char* password = "YourPassword";
const char* serverHost = "your-ec2-ip-or-domain.com";
const int serverPort = 8080;

WebSocketsClient webSocket;

#define LED_PIN 12

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  if(type == WStype_TEXT){
    String msg = String((char*)payload);
    Serial.println("Message: " + msg);

    if (msg == "light:on") digitalWrite(LED_PIN, HIGH);
    if (msg == "light:off") digitalWrite(LED_PIN, LOW);
  }
  else if(type == WStype_CONNECTED) {
    Serial.println("Connected to server");
  }
  else if(type == WStype_DISCONNECTED) {
    Serial.println("Disconnected from server");
  }
}

void setup() {
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  Serial.begin(115200);
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");

  // Connect to WebSocket server
  // Add device ID as query parameter: /ws?id=device1
  webSocket.begin(serverHost, serverPort, "/ws?id=default");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

void loop() {
  webSocket.loop();
}
```

### Required Arduino Libraries

Install these libraries via Arduino Library Manager:
- `WebSocketsClient` by Markus Sattler
- `ArduinoJson` by Benoit Blanchon (optional, for JSON parsing)

## Deployment on AWS EC2

### 1. Launch EC2 Instance
- Choose Ubuntu Server
- Open ports: 80, 443, 8080
- Assign Elastic IP

### 2. Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Clone and Run
```bash
git clone <your-repo>
cd iot
npm install
npm start
```

### 4. Run with PM2 (Process Manager)
```bash
sudo npm install -g pm2
pm2 start server.js --name iot-server
pm2 startup
pm2 save
```

### 5. Setup Nginx (Optional - for HTTPS)
```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/iot
```

Add configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/iot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Security Recommendations

- Use HTTPS/WSS in production
- Implement device authentication tokens
- Set up firewall rules
- Use environment variables for sensitive data
- Enable rate limiting
- Implement CORS properly

## Project Structure

```
iot/
├── server.js           # Main server file
├── package.json        # Dependencies
├── .gitignore         # Git ignore rules
├── README.md          # Documentation
├── masterplan.md      # Architecture documentation
└── public/
    └── index.html     # Web dashboard
```

## Environment Variables

Create a `.env` file:
```
PORT=8080
```

## License

MIT
