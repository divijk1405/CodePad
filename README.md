# CodePad

A real-time collaborative code editor where multiple users can write code together in shared rooms with live sync, syntax highlighting, and sandboxed code execution.

![Java](https://img.shields.io/badge/Java-17-orange) ![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.5-green) ![React](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-6-blue) ![Redis](https://img.shields.io/badge/Redis-7-red) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)

## Features

- **Real-time collaboration** — Multiple users edit the same code simultaneously with instant sync via WebSocket (STOMP)
- **Room-based sessions** — Create or join rooms using shareable 6-character codes
- **Syntax highlighting** — CodeMirror 6 editor with support for 11 languages: JavaScript, TypeScript, Python, Java, C++, C, Go, Rust, SQL, HTML, CSS
- **Live presence** — See who's in the room with colored avatar badges
- **Synced language selector** — Changing the language updates it for everyone in the room
- **Code execution** — Run Python and JavaScript code in sandboxed Docker containers with 5s timeout and 256MB memory limit
- **Auto-expiry** — Rooms expire after 24 hours of inactivity via Redis TTL
- **No authentication** — Just create a room, share the code, and start collaborating

## Architecture

```
CodePad/
├── backend/                                    # Java Spring Boot application
│   ├── pom.xml                                 # Maven config
│   ├── Dockerfile
│   └── src/main/
│       ├── resources/
│       │   └── application.yml                 # Server, DB, Redis config
│       └── java/com/codepad/
│           ├── CodePadApplication.java         # Entry point
│           ├── config/
│           │   ├── WebSocketConfig.java        # STOMP over SockJS at /ws
│           │   ├── RedisConfig.java            # RedisTemplate with JSON serializer
│           │   └── CorsConfig.java             # CORS allow all origins
│           ├── controller/
│           │   ├── RoomController.java         # REST endpoints
│           │   └── RoomWebSocketController.java # STOMP message handlers
│           ├── dto/
│           │   ├── CodeChange.java             # Code edit payload
│           │   ├── LanguageChange.java         # Language switch payload
│           │   ├── UserPresence.java           # Join/leave payload
│           │   ├── RunRequest.java             # Code execution request
│           │   └── RunResponse.java            # Code execution result
│           ├── model/
│           │   ├── Room.java                   # JPA entity (rooms table)
│           │   └── RoomRepository.java         # Spring Data JPA interface
│           └── service/
│               ├── RoomService.java            # Room state management (Redis + Postgres)
│               └── CodeExecutionService.java   # Docker sandbox execution
│
├── frontend/                                   # React + TypeScript SPA
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts                          # Dev server proxy config
│   ├── index.html
│   ├── Dockerfile
│   └── src/
│       ├── main.tsx                            # React DOM entry
│       ├── App.tsx                             # Main app: landing, room join, editor page
│       ├── index.css                           # Dark theme styles
│       ├── vite-env.d.ts
│       ├── types/
│       │   └── index.ts                        # TypeScript interfaces and constants
│       ├── hooks/
│       │   └── useWebSocket.ts                 # STOMP WebSocket client hook
│       └── components/
│           ├── CodeEditor.tsx                  # CodeMirror 6 editor component
│           └── OutputPanel.tsx                 # Code execution output display
│
├── docker-compose.yml                          # Full stack: Postgres, Redis, backend, frontend
├── test-websocket.js                           # Load test script (8 concurrent clients)
└── .gitignore
```

## How It Works

```
┌──────────┐     WebSocket (STOMP)      ┌──────────────┐
│ Client A │ ◄─────────────────────────► │              │
├──────────┤                             │  Spring Boot │     ┌─────────┐
│ Client B │ ◄─────────────────────────► │    Server    │◄───►│  Redis  │
├──────────┤                             │              │     └─────────┘
│ Client C │ ◄─────────────────────────► │   Port 8080  │     ┌─────────┐
└──────────┘                             │              │◄───►│Postgres │
   React + CodeMirror 6                  └──────┬───────┘     └─────────┘
   Port 3000                                    │
                                         ┌──────▼───────┐
                                         │   Docker     │
                                         │  Container   │
                                         │ (code exec)  │
                                         └──────────────┘
```

**Real-time sync flow:**

1. User types in editor → CodeMirror fires change event
2. Frontend sends full code content via STOMP to `/app/room/{roomId}/code`
3. Server saves to Redis and broadcasts to `/topic/room/{roomId}/code`
4. All other clients receive the update and apply it to their editor
5. New users joining a room receive the full current state immediately

## API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/rooms` | Create a new room. Returns `{id, language, code, createdAt}` |
| `GET` | `/api/rooms/:id` | Get room state. Returns `{id, code, language, users, createdAt}` |
| `POST` | `/api/run` | Execute code. Body: `{code, language}`. Returns `{stdout, stderr, exitCode, timedOut}` |

### WebSocket (STOMP)

**Connection:** `ws://localhost:8080/ws/websocket`

| Direction | Destination | Payload |
|-----------|-------------|---------|
| Send | `/app/room/{id}/code` | `{userId, content}` |
| Send | `/app/room/{id}/language` | `{userId, language}` |
| Send | `/app/room/{id}/join` | `{userId, username}` |
| Send | `/app/room/{id}/leave` | `{userId, username}` |
| Subscribe | `/topic/room/{id}/code` | Code change broadcasts |
| Subscribe | `/topic/room/{id}/language` | Language change broadcasts |
| Subscribe | `/topic/room/{id}/presence` | User join/leave events |
| Subscribe | `/topic/room/{id}/state` | Full state sync on join |

## Prerequisites

- **Java 17+** and **Maven**
- **Node.js 18+**
- **PostgreSQL 14+** (running locally or via Docker)
- **Redis 7+** (running locally or via Docker)
- **Docker** (for code execution sandbox)

## Setup & Run

### 1. Install dependencies (macOS)

```bash
brew install maven redis
brew services start redis
```

### 2. Set up PostgreSQL

If PostgreSQL is already running locally:

```bash
psql -U $(whoami) -d postgres -c "CREATE USER codepad WITH PASSWORD 'codepad';"
psql -U $(whoami) -d postgres -c "CREATE DATABASE codepad OWNER codepad;"
```

Or start everything with Docker:

```bash
docker-compose up -d postgres redis
```

### 3. Start the backend

```bash
cd backend
mvn spring-boot:run
```

The server starts at `http://localhost:8080`.

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The app opens at `http://localhost:3000`.

### 5. Pull Docker images for code execution (optional)

```bash
docker pull python:3.12-slim
docker pull node:20-slim
```

## Run with Docker Compose (Full Stack)

```bash
docker-compose up
```

This starts PostgreSQL, Redis, the backend, and the frontend all together.

## Load Testing

The included test script connects 8 simultaneous WebSocket clients to a single room and measures message round-trip time:

```bash
cd frontend
node ../test-websocket.js
```

**Target metrics:**
- 8 concurrent editors in one room without conflicts
- Edit propagation under 100ms on localhost

## Configuration

All backend config is in `backend/src/main/resources/application.yml`:

| Setting | Default | Description |
|---------|---------|-------------|
| `server.port` | 8080 | Backend server port |
| `spring.datasource.url` | `jdbc:postgresql://localhost:5432/codepad` | PostgreSQL connection |
| `spring.data.redis.host` | localhost | Redis host |
| `codepad.room.ttl-hours` | 24 | Room auto-expiry time |
| `codepad.execution.timeout-seconds` | 5 | Code execution timeout |
| `codepad.execution.memory-limit-mb` | 256 | Docker container memory limit |

## Code Execution Sandbox

Code runs in isolated Docker containers with these restrictions:

- **Network disabled** (`--network none`)
- **Read-only filesystem** (`--read-only`)
- **256MB memory limit**
- **0.5 CPU cores**
- **64 max PIDs**
- **5-second timeout** (killed after)
- **Only Python and JavaScript** supported for execution
- Output truncated at 10,000 characters
