# NexusFlow – Visual IoT Telemetry & Rule Engine

> **Project 1 — Infotact Solutions · Real-World Applications – Hands-on System Building**

NexusFlow is a visual IoT workflow application that allows users to build data-processing pipelines using a drag-and-drop interface. It simplifies sensor-data processing by connecting different nodes instead of hardcoding every business rule.

The project uses **React Flow** to build workflows, **Node.js and RxJS** to process the graph, and **MongoDB Time-Series collections** to store sensor telemetry.

---

## ✅ Completion Status

**Week 1 → Week 4 completed, including Mid-Project Review**

---

## Problem Statement

Hardcoding logic for IoT devices, such as:

```javascript
if (temperature > 80) {
  sendSMS();
}
```

requires developer intervention whenever a business rule changes.

NexusFlow addresses this problem by allowing users to visually create and modify data-processing rules through a node-based workflow builder.

---

## Use Case

A factory floor manager can create a workflow such as:

**Turbine Sensor → Moving Average → SMS Alert**

The sensor provides temperature readings, the Moving Average node processes the readings, and the alert node evaluates the processed value against a configured threshold.

The backend compiles the visual graph into an RxJS processing pipeline and evaluates incoming telemetry in real time.

> SMS and email delivery are **mock providers** (logged and shown in the Deliveries tab); no real SMS is sent unless `SMS_WEBHOOK_URL` points to a gateway. Webhooks are real HTTP calls.

---

# Key Features

- **Visual Workflow Builder** – Create and connect nodes through an interactive React Flow canvas.
- **Custom Node Library** – Includes sensor sources, HTTP sources, simulators, mathematical operations, filters, and alert nodes.
- **Graph Serialization** – Convert workflows into JSON containing nodes and connections.
- **Stream Compiler** – Converts the serialized workflow graph into RxJS processing pipelines.
- **Telemetry Ingestion** – Receive sensor readings through Express APIs and WebSockets.
- **Time-Series Storage** – Store telemetry using MongoDB Time-Series collections.
- **WebSocket Communication** – Support real-time communication between backend and frontend.
- **Live Dashboard** – Monitor node values, ingestion throughput, KPIs, alerts, and pipeline status.
- **Alert Engine** – Evaluate configured conditions and generate alert events.
- **Webhook Delivery** – Send alerts to external HTTP endpoints with retries and optional HMAC signatures.
- **Mock SMS / Email** – Simulate notification delivery for development and demonstrations.
- **Graph Validation** – Validate sources, actions, connectivity, cycles, and node parameters.
- **Sample Workflows** – Load predefined workflows for testing and demonstration.

---

# Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Flow 11, Recharts |
| Backend | Node.js, Express 5, RxJS 7 |
| Database | MongoDB 5.0+ Time-Series, Mongoose |
| Realtime | WebSockets (`ws`) |
| Delivery | HTTP Webhooks, Mock SMS / Email |
| API Requests | Axios |
| Language | JavaScript (ES2022) |

---

# How It Works

1. Users create a workflow by adding nodes to the canvas.
2. Nodes are connected to define the data-processing sequence.
3. The workflow is serialized into JSON.
4. The backend validates the graph and determines the execution order.
5. Sensor readings enter the system through the ingestion API or WebSocket.
6. The stream compiler converts the graph into an RxJS processing pipeline.
7. RxJS processes incoming telemetry according to the configured operations.
8. The alert engine evaluates configured conditions.
9. Live values, alerts, telemetry, and statistics are sent to the frontend through WebSockets.
10. The frontend displays the information on the workflow canvas and Live Dashboard.

---

# Node Library

### Data Sources

- `SensorNode`
- `SimulatorSourceNode`
- `HttpSourceNode`

### Math Operations

- `MovingAverageNode`
- `MultiplyNode`
- `AddNode`
- `FilterNode`

### Action Triggers

- `SmsAlertNode`
- `EmailAlertNode`
- `LogAlertNode`
- `WebhookAlertNode`
- `AlertNode`

Node parameters can be edited directly on the workflow node.

Workflow edges use `GlowEdge` to visually indicate data movement. Live values are merged at render time and are not stored in the saved graph JSON.

---

# Time-Series Database

NexusFlow uses MongoDB Time-Series collections optimized for append-only telemetry data.

```text
Collection: telemetries
timeField: timestamp
metaField: metadata
granularity: seconds
```

---

# Stream Compiler

The backend translates the React Flow graph into a reactive RxJS pipeline.

```text
POST /api/compile
        ↓
Graph JSON
        ↓
Graph Validation
        ↓
RxJS Pipeline
        ↓
Live WebSocket Events
```

The compiler supports:

- Fan-in using `merge`
- Fan-out using `share`
- Dynamic pipeline deployment
- Pipeline redeployment
- Pipeline stopping
- Topological execution order
- Moving average
- Add / Multiply operations
- Threshold filtering

---

# Telemetry Ingestion

## HTTP Ingestion

```text
POST /api/telemetry
POST /api/telemetry/batch
```

The batch endpoint supports up to **5,000 readings**.

Incoming readings are buffered in memory and written using:

```javascript
insertMany({ ordered: false })
```

The ingestion system returns:

- `202` when data is accepted
- `503` with `Retry-After` when the buffer is full

## WebSocket Ingestion

```text
ws://host:5000/ws/ingest
```

Devices can send:

- A single reading
- An array of readings
- `{ readings: [] }`

Readings are passed directly to the rule engine from memory without waiting for the database write.

---

# Live Rule Execution & Dashboard

The deployed graph runs as an RxJS pipeline in memory.

The frontend receives live:

- Node values
- Telemetry
- Alerts
- Delivery status
- Ingestion statistics
- Pipeline status

WebSocket updates are batched in the browser before being processed by React.

The Live Dashboard uses Recharts to display telemetry and runtime statistics.

---

# Webhooks & Alerting

Fired alerts are queued and delivered asynchronously so the rule engine does not have to wait for a slow external endpoint.

### Webhook

- HTTP POST with JSON
- 5-second timeout
- 3 delivery attempts
- Exponential backoff
- Optional HMAC signature
- SSRF protection
- Private / loopback / link-local targets blocked by default

When `WEBHOOK_SECRET` is configured:

```text
X-NexusFlow-Signature: sha256=<hmac>
```

Private webhook targets can be enabled using:

```text
WEBHOOK_ALLOW_PRIVATE=true
```

### SMS / Email

SMS and email currently use mock providers.

Delivery attempts are logged and displayed in the **Deliveries** tab.

### Demo Receivers

```text
POST /api/mock/webhook
POST /api/mock/flaky
```

The flaky endpoint intentionally fails two out of three calls to demonstrate retry behavior.

---

# API Endpoints

| Method | Endpoint | Description | Week |
|---|---|---|---|
| POST | `/api/telemetry` | Ingest one reading | 1 |
| POST | `/api/telemetry/batch` | Ingest up to 5,000 readings | 2 |
| GET | `/api/telemetry/:deviceId` | Latest 50 stored readings | 1 |
| GET | `/api/telemetry/stats` | Ingestion and MongoDB statistics | 2 |
| POST | `/api/compile` | Validate, compile, and deploy graph | 2 |
| POST | `/api/compile/validate` | Dry-run validation | 2 |
| POST | `/api/compile/stop` | Stop running pipeline | 3 |
| GET | `/api/compile/status` | Pipeline and node message counts | 3 |
| GET | `/api/compile/alerts` | Recent fired alerts | 2 |
| GET / PUT | `/api/graph` | Load / save canvas graph | 2 |
| GET | `/api/notifications` | Delivery log and queue statistics | 4 |
| POST | `/api/notifications/test` | Send test delivery | 4 |
| POST / GET / DELETE | `/api/mock/*` | Demo webhook receivers | 4 |
| GET | `/api/stats` | Runtime statistics | 2 |
| GET | `/api/health` | Health check | 2 |
| WS | `/ws/ingest` | Device telemetry WebSocket | 3 |
| WS | `/` | Canvas live event feed | 3 |

The active pipeline is stored at:

```text
backend/data/active-pipeline.json
```

and restored when the server starts.

---

# Week-wise Development Plan

## Week 1 — Foundation

### Backend

- [x] MongoDB Time-Series collection
- [x] Express server with CORS and WebSocket upgrade
- [x] `POST /api/telemetry`
- [x] `GET /api/telemetry/:deviceId`
- [x] RxJS Subject per device
- [x] Mock IoT simulator

### Frontend

- [x] React application initialized with Vite
- [x] React Flow integration
- [x] Drag-and-drop canvas
- [x] Animated edge connections
- [x] Pipeline preview status bar
- [x] LocalStorage graph persistence
- [x] WebSocket connection and status indicator

---

## Week 2 — Core Engine

### Backend

- [x] `POST /api/compile`
- [x] Graph validation
- [x] Source and action validation
- [x] Connectivity and cycle validation
- [x] Parameter validation
- [x] Topological execution order
- [x] Graph-to-RxJS compiler
- [x] Fan-in using `merge`
- [x] Fan-out using `share`
- [x] Pipeline redeployment
- [x] Moving average
- [x] Add / Multiply operations
- [x] Threshold filter
- [x] Alert engine with rising-edge detection
- [x] Alert cooldown
- [x] Graph save / load
- [x] Dry-run validation
- [x] Runtime statistics
- [x] Health endpoint
- [x] Buffered batch ingestion
- [x] `/api/telemetry/batch`

### Frontend

- [x] Data source nodes
- [x] Math operation nodes
- [x] Action trigger nodes
- [x] Editable node parameters
- [x] Versioned graph JSON
- [x] Graph import / export
- [x] Sample graphs
- [x] Legacy Week 1 canvas migration
- [x] Validate button
- [x] Validation error banner
- [x] Failing-node highlighting

---

## Week 3 — Live Execution & Dashboards

- [x] WebSocket telemetry ingestion
- [x] `/ws/ingest`
- [x] Dynamic RxJS rule execution
- [x] Pipeline redeployment
- [x] Pipeline persistence and restoration
- [x] `liveStore.js`
- [x] `useLiveStream`
- [x] Batched WebSocket updates
- [x] `LiveDashboard`
- [x] Recharts dashboard
- [x] Node value monitoring
- [x] Ingestion throughput monitoring
- [x] KPI monitoring

---

## Week 4 — Webhooks, Alerting & Polish

- [x] Queued notification delivery
- [x] Retry and exponential backoff
- [x] HMAC webhook signatures
- [x] SSRF protection
- [x] Mock SMS / email providers
- [x] `WebhookAlertNode`
- [x] Deliveries tab
- [x] Live delivery status
- [x] Glowing workflow edges
- [x] Validation banner
- [x] Validate / Stop controls
- [x] Toast notifications
- [x] JSON import / export
- [x] Sample workflows

---

# Mid-Project Review

### Graph Serialization Proof

The **Graph JSON** feature provides:

- Versioned JSON
- Whitelisted node data
- Graph validation
- Round-trip serialization checks

Implementation:

```text
frontend/src/lib/graphSerializer.js
```

### Ingestion Audit

Run:

```bash
npm run benchmark
```

This drives the server at the target ingestion rate and generates an audit report under:

```text
backend/audit/
```

Storage comparison:

```bash
npm run storage-compare
```

This compares Time-Series and regular MongoDB collection storage.

> These commands require a running MongoDB instance. No benchmark result is currently recorded in the repository.

---

# Project Structure

```text
NexusFlow/
│
├── backend/
│   ├── server.js
│   ├── graphValidator.js
│   ├── compiler.js
│   ├── operators.js
│   ├── alertEngine.js
│   ├── notifier.js
│   ├── ingestService.js
│   ├── wsIngest.js
│   ├── graphStore.js
│   ├── statsTracker.js
│   ├── streamEngine.js
│   ├── wss.js
│   ├── db.js
│   ├── simulator.js
│   ├── stressTest.js
│   │
│   ├── models/
│   │   └── Telemetry.js
│   │
│   ├── controllers/
│   │   └── telemetryController.js
│   │
│   ├── routes/
│   │   └── telemetry, pipeline, graph, notifications, mock
│   │
│   ├── scripts/
│   │   └── benchmark.js, storageCompare.js
│   │
│   ├── samples/
│   │   └── sample graph JSON files
│   │
│   └── test/
│       └── Node.js tests
│
└── frontend/
    └── src/
        ├── pages/
        │   └── Canvas.jsx
        │
        ├── nodes/
        │   └── Custom React Flow nodes
        │
        ├── components/
        │   ├── GlowEdge
        │   ├── LiveDashboard
        │   └── ParamInput
        │
        ├── hooks/
        │   └── useLiveStream.js
        │
        └── lib/
            ├── nodeRegistry.js
            ├── graphSerializer.js
            ├── liveStore.js
            ├── liveStore.test.js
            └── sampleGraphs.js
```

> `DataSourceNode.jsx`, `MathOperationNode.jsx`, and `components/InspectorPanel.jsx` are not registered on the canvas because the project uses the specific node implementations instead.

---

# Final Project Review

NexusFlow combines a visual workflow builder with a backend stream-processing engine to simplify IoT telemetry processing.

Users can create workflows by connecting different nodes, while the backend processes incoming telemetry according to the configured logic.

The project integrates:

- React Flow
- Node.js
- Express
- RxJS
- MongoDB
- WebSockets
- Recharts

The final implementation focuses on dynamic workflow processing, real-time telemetry handling, graph validation, live monitoring, and a modular architecture that can be extended with additional data sources, processing nodes, and alert actions.

---

# Running the Project

## Prerequisites

- Node.js 18+
- npm
- MongoDB
- Git

MongoDB should be running locally.

---

## 1. Start the Backend

Open a terminal:

```bash
cd backend
npm install
```

Create `backend/.env` (or copy `.env.example`):

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/nexusflow
```

Start the server:

```bash
npm start
```

The backend runs on:

```text
http://localhost:5000
```

---

## 2. Start the IoT Simulator

Open a separate terminal:

```bash
cd backend
npm run simulate
```

The simulator sends telemetry readings to:

```text
POST /api/telemetry
```

---

## 3. Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm start
```

Open the URL displayed by Vite in the terminal.

If your Vite configuration uses port `3000`, the application will be available at:

```text
http://localhost:3000
```

---

## 4. Run Tests

### Backend

```bash
cd backend
npm test
```

### Frontend

```bash
cd frontend
npm test
```

---

## 5. Run the Ingestion Audit

Make sure MongoDB is running.

```bash
cd backend
npm run benchmark
npm run storage-compare
```

---

# Configuration

Backend configuration can be provided through:

```text
backend/.env
```

Important variables include:

```text
PORT
MONGO_URI
RETENTION_DAYS
INGEST_*
DATA_DIR
WEBHOOK_SECRET
WEBHOOK_ALLOW_PRIVATE
SMS_WEBHOOK_URL
```

Frontend:

```text
VITE_API_URL
```

Default API URL:

```text
http://localhost:5000
```

---

# Production Notes

- Ingestion endpoints currently have **no authentication**. Put them behind an API key, gateway, or other authentication mechanism before exposing them publicly.
- Webhook targets are user-provided. Keep `WEBHOOK_ALLOW_PRIVATE` disabled unless private targets are explicitly required.
- The application currently runs as a single process.
- Delivery queue and alert history are stored in memory, so a restart can lose undelivered items and in-memory alert history.

---

# Demo Flow

1. Open the frontend application.
2. Select **Samples → Complex** or use the default workflow.
3. Click **▶ Compile**.
4. The backend validates and deploys the RxJS pipeline.
5. Start the simulator using:

   ```bash
   npm run simulate
   ```

6. Watch live values and glowing workflow edges.
7. Open the **Live Dashboard**.
8. Check **Alerts** for triggered alerts.
9. Check **Deliveries** for webhook, SMS, and email attempts.
10. Check the demo webhook receiver using:

   ```text
   GET /api/mock/received
   ```

---

# Project Goal

NexusFlow aims to make IoT data pipelines easier to create, configure, and process through a visual workflow builder and a modular backend.

---

# Development Workflow

The project uses feature branches for development.

Current branch:

```text
Swati-Sharma
```

Typical workflow:

```bash
git checkout Swati-Sharma
git pull origin Swati-Sharma

# Make changes

git status
git add .
git commit -m "Describe your changes"
git push origin Swati-Sharma
```