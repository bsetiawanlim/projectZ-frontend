# Server Execution Rule

## Trigger
When the user asks to "run the server", "run server", "start server", "start the server", "run frontend and backend server", "start the servers", "run both servers", or any variation requesting to start or launch the dev environment.

## Mandatory Execution Protocol
1. **DO NOT ASK ANYTHING & DO NOT REQUEST CONFIRMATIONS/PERMISSIONS**:
   - Never ask clarifying questions, confirmation dialogs, multiple-choice options, or prompt the user before starting the servers.
   - Never hesitate or ask which server to run — run both backend and frontend servers immediately.
   - Proceed directly to executing the start commands as daemon processes.

2. **Server Architecture & Commands**:
   - **Backend Server**:
     - Directory: `../backend` (`d:/Work/Programming/PZ/backend`)
     - Command: `pnpm --dir ../backend start` (runs `tsx src/server.ts`)
     - Port: `3000`
     - Health Endpoint: `http://localhost:3000/api/health`
     - Swagger Docs: `http://localhost:3000/documentation`
   - **Frontend Server**:
     - Directory: current workspace `d:/Work/Programming/PZ/frontend`
     - Command: `pnpm dev` (runs Next.js App Router on `:3001` via Turbo)
     - Port: `3001`
     - URL: `http://localhost:3001`

3. **Execution Steps**:
   - Launch backend and frontend as background daemon tasks (`IsDaemon: true`).
   - Verify both ports (3000 and 3001) are active and listening.
   - Verify `http://localhost:3000/api/health` returns status `200` with `status: "ok"`.
   - Report active URLs and ports directly and concisely to the user.
