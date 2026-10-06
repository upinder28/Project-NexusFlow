# NexusFlow: Visual IoT Telemetry & Rule Engine

NexusFlow is an IoT-based rule engine that allows users to create and manage data processing workflows using a visual drag-and-drop interface.

Instead of hardcoding rules such as **"If temperature > 80°C, send an alert"**, users can create these workflows visually by connecting different nodes.

## Project Overview

NexusFlow uses a React-based visual canvas where users can create workflows such as:

**Turbine Sensor → Moving Average Filter → SMS Alert**

The workflow created on the frontend is converted into JSON and sent to the Node.js backend. The backend processes the graph and converts it into an executable RxJS data stream.

IoT telemetry data is stored using MongoDB Time-Series collections.

## Technologies Used

- **Frontend:** React.js, React Flow
- **Backend:** Node.js, Express.js, RxJS
- **Database:** MongoDB Time-Series
- **Communication:** WebSockets
- **Language:** JavaScript

## Main Modules

### Visual Graph Builder

The Visual Graph Builder provides a drag-and-drop canvas using React Flow.

It allows users to:

- Add different nodes
- Connect nodes
- Create data pipelines
- Modify the workflow
- Save the workflow as JSON

### Time-Series Database

MongoDB Time-Series collections are used to store continuous IoT sensor data.

The telemetry data contains information such as:

- Device/Sensor
- Sensor value
- Timestamp

### Stream Compiler

The Stream Compiler is implemented using Node.js and RxJS.

It takes the JSON graph created in React Flow and:

1. Reads the nodes and connections
2. Understands the flow of the graph
3. Converts it into processing logic
4. Creates the required RxJS stream

### Ingestion API

Express APIs are used to receive mock IoT telemetry data.

WebSockets are used for real-time communication and updates.

## Week 1

### Backend

- MongoDB Time-Series collection setup
- Express server setup
- IoT telemetry ingestion API
- Sensor data structure
- MongoDB connection

### Frontend

- React application setup
- React Flow integration
- Drag-and-drop canvas
- Basic nodes and connections

## Week 2

### Backend

- Graph JSON handling
- Graph parsing
- Logic compiler
- Node and edge processing
- RxJS stream implementation

### Frontend

Created custom nodes for:

- Data Sources
- Math Operations
- Action Triggers

The frontend can serialize the complete visual graph into JSON and send it to the backend.

## Current Status

The project is completed up to **Week 2 / Mid-Project Review**.

The current implementation includes:

- Visual IoT workflow builder
- MongoDB Time-Series storage
- Telemetry ingestion
- Custom node library
- Graph serialization
- Backend graph compiler
- RxJS-based stream processing
- WebSocket communication
