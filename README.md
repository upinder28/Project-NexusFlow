# NexusFlow: Visual IoT Telemetry & Rule Engine

> **Project 1 — Infotact Solutions · Real-World Applications – Hands-on System Building**

NexusFlow is an IoT-based rule engine that lets users create data-processing workflows using a **visual drag-and-drop interface** — no hardcoded business logic required.

Instead of writing `if (temperature > 80°C) { sendSMS(); }`, factory operators build it visually by connecting nodes on a canvas.

---

## ✅ Completion Status: Week 1 → Week 4 (Mid-Project Review included)

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
| Delivery   | HTTP webhooks (HMAC-signed), mock SMS / email |
| Language   | JavaScript (ES2022)                 |

---

## Key Modules

### 1. Visual Graph Builder (React + React Flow)
A node-based UI allowing non-technical users to build complex logic trees and data pipelines.

**Node Library (editable parameters live on the node):**
- **Data Sources**: `SensorNode`, `SimulatorSourceNode`, `HttpSourceNode`
- **Math Operations**: `MovingAverageNode`, `MultiplyNode`, `AddNode`, `FilterNode`
- **Action Triggers**: `SmsAlertNode`, `EmailAlertNode`, `LogAlertNode`, `WebhookAlertNode`, `AlertNode` (generic)

Wires **glow and send a travelling dot** when data passes (`GlowEdge`). Live values are merged in at render time, so they never end up in the saved graph JSON.

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

### 4. Ingestion (Express + WebSockets)
- `POST /api/telemetry` and `POST /api/telemetry/batch` (up to 5000 readings) → in-memory buffer → one `insertMany({ ordered:false })` per batch. Returns `202` (accepted), `503` + `Retry-After` when the buffer is full.
- `ws://host:5000/ws/ingest` — devices stream readings over a WebSocket (single, array or `{readings:[]}` frames).
- Readings go straight to the rule engine from memory, never waiting for the DB.

### 5. Live Rule Execution & Dashboards (Week 3)
Deploy compiles the graph into RxJS in memory; telemetry flows through it live. Per-node values, alerts, deliveries and ingestion stats are pushed over the WebSocket (batched every 100 ms in the browser) into the canvas and a Recharts dashboard.

### 6. Webhooks & Alerting (Week 4)
Fired alerts are queued and delivered asynchronously (the rule engine never waits on a slow endpoint):
- **webhook** — real HTTP POST (JSON), 5 s timeout, 3 attempts with exponential backoff, optional `X-NexusFlow-Signature: sha256=<hmac>` when `WEBHOOK_SECRET` is set, SSRF guard (private / loopback / link-local targets refused unless `WEBHOOK_ALLOW_PRIVATE=true`; the checked IP is the one connected to).
- **sms / email** — **mock providers** (logged + shown in the Deliveries tab). Set `SMS_WEBHOOK_URL` to POST SMS to any HTTP gateway.
- Built-in demo receivers: `POST /api/mock/webhook` (always 200) and `/api/mock/flaky` (fails 2 of 3 calls, to show retries).

---

## API Endpoints

| Method | Endpoint | Description | Week |
|--------|----------|-------------|------|
| POST | `/api/telemetry` | Ingest one reading (202, buffered batch write) | 1 |
| POST | `/api/telemetry/batch` | Ingest up to 5000 readings | 2 |
| GET  | `/api/telemetry/:deviceId` | Latest 50 stored readings of a device | 1 |
| GET  | `/api/telemetry/stats` | Ingest counters + MongoDB storage numbers (collStats) | 2 |
| POST | `/api/compile` | Validate + compile + deploy graph (422 with error list if invalid) | 2 |
| POST | `/api/compile/validate` | Dry-run validation | 2 |
| POST | `/api/compile/stop` | Stop the running pipeline | 3 |
| GET  | `/api/compile/status` | Running pipeline + per-node message counts | 3 |
| GET  | `/api/compile/alerts` | Recent fired alerts | 2 |
| GET / PUT | `/api/graph` | Load / save the canvas graph (file on the server) | 2 |
| GET  | `/api/notifications` | Delivery log + queue stats + config | 4 |
| POST | `/api/notifications/test` | Send a test delivery `{channel, target}` | 4 |
| POST/GET/DELETE | `/api/mock/*` | Demo webhook receivers | 4 |
| GET  | `/api/stats` | Compile runs, alerts, WS counters, ingest + delivery stats | 2 |
| GET  | `/api/health` | Health check | 2 |
| WS   | `/ws/ingest` | Device telemetry over WebSocket | 3 |
| WS   | `/` | Canvas feed: `node`, `alert`, `delivery`, `telemetry`, `stats`, `pipeline` events | 3 |

The pipeline that is running is saved to `backend/data/active-pipeline.json` and re-deployed on server start.

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
- [x] `POST /api/compile` — accepts React Flow JSON graph; invalid graphs get `422` + error list
- [x] `graphValidator.js` — sources/actions/connectivity/cycles/params, topological order
- [x] `compiler.js` — graph → RxJS: fan-in = `merge`, fan-out = `share`, redeploy disposes the old pipeline
- [x] Operators: moving average (window), add / multiply, threshold filter (`operators.js`)
- [x] Alert engine: fires on rising edge, then again after the cooldown (default 30 s)
- [x] `GET/PUT /api/graph` (save / load), `POST /api/compile/validate`
- [x] `statsTracker.js` + `GET /api/stats`, `GET /api/health`
- [x] Buffered batch ingestion + `/api/telemetry/batch` for the 5,000 writes/s target

**Frontend (Node Library)**
- [x] Data Sources / Math Operations / Action Triggers in the sidebar, parameters editable on the node
- [x] Versioned graph JSON (`graphSerializer.js`), import / export, sample graphs, legacy Week-1 canvas migration
- [x] Validate button + error banner with the failing nodes outlined

### Week 3 — Live Execution & Dashboards
- [x] WebSocket telemetry ingestion (`wsIngest.js`, `/ws/ingest`)
- [x] Dynamically compiled rules run in memory against live data; redeploy disposes the old pipeline
- [x] Pipeline persisted and restored on restart (`graphStore.js`)
- [x] `liveStore.js` + `useLiveStream` (batched WS → React) and `LiveDashboard` (Recharts: node values, ingestion throughput, KPIs)

### Week 4 — Webhooks, Alerting & Polish
- [x] `notifier.js`: queued delivery, retry/backoff, HMAC signature, SSRF guard, mock SMS/email
- [x] `WebhookAlertNode`, Deliveries tab with live status (queued → sending → retrying → sent / failed / blocked)
- [x] Glowing wires, validation banner with failing nodes outlined, Validate / Stop, toasts, JSON import / export / samples

---

## Mid-Project Review

- **Graph serialization proof**: nav button **Graph JSON** — versioned JSON, whitelisted node data, validation, round-trip check (`frontend/src/lib/graphSerializer.js`, tested).
- **Ingestion audit**: `npm run benchmark` (drives a real server at 5,000 writes/s and writes a report to `backend/audit/`) and `npm run storage-compare` (Time-Series vs regular collection bytes per reading). **These need a running MongoDB; no result is recorded in this repo — run them and attach the generated report.**

---

## Project Structure

```
NexusFlow/
├── backend/
│   ├── server.js            # Express + WS wiring, restore of the active pipeline, graceful shutdown
│   ├── graphValidator.js    # graph → validated, normalised nodes + execution order
│   ├── compiler.js          # logic compiler (graph → RxJS), deploy / stop / status
│   ├── operators.js         # moving average / math / filter operators
│   ├── alertEngine.js       # rising-edge + cooldown evaluation, hands records to notifier
│   ├── notifier.js          # webhook / sms / email delivery (Week 4)
│   ├── ingestService.js     # buffered batch writes + back-pressure
│   ├── wsIngest.js          # /ws/ingest
│   ├── graphStore.js        # atomic JSON persistence (data/)
│   ├── statsTracker.js      # runtime counters (/api/stats)
│   ├── streamEngine.js, wss.js, db.js, simulator.js, stressTest.js
│   ├── models/Telemetry.js, controllers/telemetryController.js
│   ├── routes/              # telemetry, pipeline (/api/compile), graph, notifications, mock
│   ├── scripts/             # benchmark.js, storageCompare.js
│   ├── samples/             # simple + complex graph JSON
│   └── test/                # node --test (npm test)
└── frontend/src/
    ├── pages/Canvas.jsx
    ├── nodes/               # custom React Flow nodes (+ WebhookAlertNode)
    ├── components/          # GlowEdge, LiveDashboard, ParamInput
    ├── hooks/useLiveStream.js
    └── lib/                 # nodeRegistry, graphSerializer, liveStore, sampleGraphs (+ tests)
```

`DataSourceNode.jsx`, `MathOperationNode.jsx` and `components/InspectorPanel.jsx` are not registered on the canvas (the specific nodes replace them).

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
npm start          # Vite dev server on :3000
```

### 4. Tests
```bash
cd backend  && npm test    # 52 tests: compiler, validator, ingest, notifier, WS ingest, e2e webhook
cd frontend && npm test    # serializer + live store
```

### 5. Ingestion audit (needs MongoDB)
```bash
cd backend
npm run benchmark                 # 5,000 writes/s for 20 s → backend/audit/ingestion-audit-*.json
npm run storage-compare           # Time-Series vs regular collection storage
```

### Configuration (`backend/.env.example`)
`PORT`, `MONGO_URI`, `RETENTION_DAYS`, `INGEST_*`, `DATA_DIR`, `WEBHOOK_SECRET`, `WEBHOOK_ALLOW_PRIVATE`, `SMS_WEBHOOK_URL`. Frontend: `VITE_API_URL` (default `http://localhost:5000`).

### Production notes
- Ingestion endpoints have **no authentication** — put them behind a gateway / API key before exposing them.
- Webhook targets are user input: keep `WEBHOOK_ALLOW_PRIVATE` off unless you need internal targets.
- Single process; the delivery queue and alert history are in memory (a restart loses undelivered items).

---

## Demo Flow

1. Open `http://localhost:3000`
2. Pick **Samples… → Complex** (or keep the default Turbine Sensor → Moving Average → SMS Alert)
3. Click **▶ Compile** — the backend validates and deploys the RxJS pipeline (errors outline the failing nodes)
4. Run `npm run simulate` (feeds `device-1`); simulator nodes need no feed
5. Watch values, glowing wires and the **Live Dashboard**; alerts appear in **Alerts**, webhook / SMS / email attempts in **Deliveries**
6. Webhook node default URL is the built-in receiver; check `GET /api/mock/received`

---
