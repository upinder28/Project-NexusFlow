# NexusFlow: Visual IoT Telemetry & Rule Engine

> **Project 1 — Infotact Solutions · Real-World Applications – Hands-on System Building**

NexusFlow is an IoT-based rule engine that lets users create data-processing workflows using a **visual drag-and-drop interface** — no hardcoded business logic required.

Instead of writing `if (temperature > 80°C) { sendSMS(); }`, factory operators build it visually by connecting nodes on a canvas.

---

## ✅ Completion Status: Week 1 + Week 2 + Mid-Project Review

---

## Problem Statement

Hardcoding logic for IoT devices (e.g., "If temperature > 80°C, send an alert") requires developer intervention for every business rule change. Standard MERN apps struggle to store and query high-frequency machine data efficiently while simultaneously running dynamic, user-defined logic against continuous data streams.

## Use Case

A factory floor manager logs into NexusFlow. Using a React-based visual drag-and-drop canvas, they connect a "Turbine Sensor" node → "Moving Average Filter" node → "SMS Alert" node. The Node.js backend instantly compiles this visual graph into an executable data stream. As millions of telemetry points pour into the optimized MongoDB Time-Series collections, the custom rule executes in real-time, notifying the manager when anomalies occur.

---

## Technologies

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18, React Flow 11, Recharts   |
| Backend    | Node.js, Express 5, RxJS 7          |
| Database   | MongoDB 5.0+ Time-Series            |
| Realtime   | WebSockets (ws library)             |
| Language   | JavaScript (ES2022)                 |

---

## Key Modules

### 1. Visual Graph Builder (React + React Flow)
A node-based UI allowing non-technical users to build complex logic trees and data pipelines.

**13 Custom Node Types:**
- **Sources**: `SensorNode`, `SimulatorSourceNode`, `HttpSourceNode`, `DataSourceNode`
- **Operations**: `MovingAverageNode`, `MathOperationNode`, `MultiplyNode`, `AddNode`, `FilterNode`
- **Actions**: `SmsAlertNode`, `EmailAlertNode`, `LogAlertNode`, `AlertNode`

### 2. Time-Series Database (MongoDB 5.0+)
Utilizes native MongoDB Time-Series collections optimized for append-only sensor data.
```
Collection: telemetries
timeField: timestamp | metaField: metadata | granularity: seconds
```

### 3. Stream Compiler (Node.js + RxJS)
Backend engine that translates the JSON graph from the frontend into highly concurrent, reactive data streams (Observables).

```
POST /api/compile  →  Graph JSON  →  RxJS Pipeline  →  WebSocket broadcast
```

### 4. Ingestion API (Express + WebSockets)
High-throughput endpoints to receive mock hardware telemetry and broadcast alerts back to the client.

---

## API Endpoints

| Method | Endpoint | Description | Week |
|--------|----------|-------------|------|
| POST | `/api/telemetry` | Ingest sensor telemetry, push to RxJS stream & MongoDB | 1 |
| GET  | `/api/telemetry/:deviceId` | Retrieve stored telemetry with optional time-range filter | 1 |
| POST | `/api/compile` | Compile React Flow graph JSON into RxJS observable pipeline | 2 |
| POST | `/api/graph/save` | Persist current graph JSON to disk | 2 |
| GET  | `/api/graph/load` | Reload previously saved graph JSON | 2 |
| POST | `/api/graph/validate` | Validate graph structure (source, connectivity, actions) | 2 |
| GET  | `/api/stats` | Runtime stats: ingest rate, alerts, compile runs, uptime | 2 |
| GET  | `/api/health` | Server health check | 2 |

---

## Week-wise Development Plan

### Week 1 — Foundation

**Backend (Node.js, Express, MongoDB Time-Series)**
- [x] MongoDB Time-Series collection setup (`timeseries: { timeField, metaField, granularity }`)
- [x] Express server with CORS + WebSocket upgrade
- [x] `POST /api/telemetry` — high-throughput ingestion endpoint
- [x] `GET /api/telemetry/:deviceId` — historical data retrieval
- [x] RxJS Subject per deviceId (`streamEngine.js`)
- [x] Mock IoT simulator (`simulator.js`) — 1 data point/sec

**Frontend (React, React Flow)**
- [x] React app initialized with Vite
- [x] React Flow integration — drag-and-drop canvas
- [x] Animated edge connections
- [x] Pipeline preview status bar
- [x] localStorage graph persistence
- [x] WebSocket live connection + status indicator

---

### Week 2 — Core Engine

**Backend (Logic Compiler)**
- [x] `POST /api/compile` — accepts React Flow JSON graph
- [x] `compiler.js` — graph walk: source → operations → actions
- [x] RxJS operators: `bufferCount` (moving average), `map` (math), `filter` (threshold)
- [x] Support for all node types: `movingAverage`, `multiply`, `add`, `filter`, `mathOperation`
- [x] Duplicate pipeline prevention via subscription registry
- [x] Alert engine (`alertEngine.js`) — SMS/email/log dispatch + WebSocket broadcast
- [x] `POST /api/graph/save` + `GET /api/graph/load` + `POST /api/graph/validate`
- [x] `GET /api/stats` — runtime stats tracker
- [x] `statsTracker.js` — ingest rate, alert count, compile runs, uptime

**Frontend (Node Library)**
- [x] `DataSourceNode` — type selector (Sensor/HTTP/Simulator/MQTT) + deviceId config
- [x] `MathOperationNode` — 7 operations (Moving Average, Add, Subtract, Multiply, Divide, Max, Min)
- [x] Both registered in Canvas `nodeTypes` map
- [x] Added to sidebar under Sources / Operations sections
- [x] Graph save/load via backend buttons in nav bar
- [x] JSON file import from local disk
- [x] Graph validate with banner feedback
- [x] Mid-Project Review dashboard (`/src/pages/MidReview.jsx`)

---

## Mid-Project Review Dashboard

Navigate to the **Mid-Review** page from the canvas (purple button in nav) to see:
- Live backend stats (ingest rate, alerts fired, active devices, uptime)
- Live telemetry area chart (device-1 stream)
- Development timeline (Week 1 → Week 2 → Mid-Review)
- System architecture diagram (Simulator → API → MongoDB → RxJS → WebSocket → React)
- All 6 modules with expandable feature lists
- Complete API endpoint table
- Demo pipeline: Turbine Sensor → Moving Average → SMS Alert

---

## Project Structure

```
NexusFlow/
├── backend/
│   ├── server.js            # Express + WebSocket server
│   ├── compiler.js          # Logic compiler (graph → RxJS pipeline)
│   ├── streamEngine.js      # RxJS Subject registry per deviceId
│   ├── alertEngine.js       # Alert trigger & WebSocket broadcast
│   ├── statsTracker.js      # Runtime stats (Week 2)
│   ├── simulator.js         # Mock IoT telemetry generator
│   ├── stressTest.js        # 5000-write/sec ingestion audit
│   ├── db.js                # MongoDB Time-Series connection
│   ├── wss.js               # WebSocket server instance
│   ├── models/
│   │   └── Telemetry.js     # MongoDB schema (timeField/metaField)
│   ├── controllers/
│   │   └── telemetryController.js
│   └── routes/
│       ├── telemetry.js     # Week 1: ingest + query
│       └── graph.js         # Week 2: save / load / validate
└── frontend/
    └── src/
        ├── App.jsx           # Hash-based routing (Canvas ↔ MidReview)
        ├── pages/
        │   ├── Canvas.jsx    # Main drag-and-drop canvas
        │   └── MidReview.jsx # Mid-project review dashboard
        ├── nodes/            # 13 custom React Flow node components
        │   ├── SensorNode.jsx
        │   ├── DataSourceNode.jsx
        │   ├── SimulatorSourceNode.jsx
        │   ├── HttpSourceNode.jsx
        │   ├── MovingAverageNode.jsx
        │   ├── MathOperationNode.jsx
        │   ├── MultiplyNode.jsx
        │   ├── AddNode.jsx
        │   ├── FilterNode.jsx
        │   ├── SmsAlertNode.jsx
        │   ├── EmailAlertNode.jsx
        │   ├── LogAlertNode.jsx
        │   └── AlertNode.jsx
        └── components/
            └── InspectorPanel.jsx
```

---

## Running the Project

### Prerequisites
- Node.js 18+
- MongoDB running locally on port 27017

### 1. Start the Backend
```bash
cd backend
npm install
npm start          # Start Express + WebSocket server on :5000
```

### 2. Start the IoT Simulator (separate terminal)
```bash
cd backend
npm run simulate   # Sends 1 telemetry point/sec to POST /api/telemetry
```

### 3. Start the Frontend
```bash
cd frontend
npm install
npm start          # Vite dev server on :5173
```

### 4. (Optional) Run Ingestion Stress Test
```bash
cd backend
npm run benchmark  # Fires 5000 concurrent writes, reports writes/sec
```

---

## Demo Flow

1. Open `http://localhost:5173`
2. The default pipeline is already set: **Turbine Sensor → Moving Average → SMS Alert**
3. Click **▶ Compile** — the backend builds the RxJS pipeline
4. Run the simulator: `npm run simulate` in `/backend`
5. Watch the sensor node show live temperature values with a sparkline
6. When the moving average crosses 85°C, the SMS Alert node turns red and the Alert Log fires
7. Click **📊 Mid-Review** to open the project dashboard

---
