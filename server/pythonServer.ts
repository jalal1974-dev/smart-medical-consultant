/**
 * Python FastAPI Server Manager
 * ==============================
 * Starts the Python FastAPI backend (ultimate_server.py) as a child process
 * alongside the Node.js server. The Python server handles PPTX and SVG
 * infographic generation using Claude AI.
 *
 * Port: 8000 (configurable via PYTHON_API_PORT env var)
 */

import { spawn, ChildProcess } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import net from "net";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PYTHON_PORT = parseInt(process.env.PYTHON_API_PORT || "8000");
const PYTHON_SCRIPT = path.join(__dirname, "python", "ultimate_server.py");

let pythonProcess: ChildProcess | null = null;

function isPortListening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(500);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => resolve(false));
    socket.connect(port, "127.0.0.1");
  });
}

export async function startPythonServer(): Promise<void> {
  // If already running (e.g., started manually), skip
  const alreadyUp = await isPortListening(PYTHON_PORT);
  if (alreadyUp) {
    console.log(`[Python API] ✅ Already running on port ${PYTHON_PORT}`);
    return;
  }

  console.log(`[Python API] 🚀 Starting FastAPI server on port ${PYTHON_PORT}...`);

  const env = {
    ...process.env,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
  };

  pythonProcess = spawn(
    "uvicorn",
    [
      "ultimate_server:app",
      "--host", "0.0.0.0",
      "--port", String(PYTHON_PORT),
      "--log-level", "warning",
    ],
    {
      cwd: path.join(__dirname, "python"),
      env,
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  pythonProcess.stdout?.on("data", (data: Buffer) => {
    const msg = data.toString().trim();
    if (msg) console.log(`[Python API] ${msg}`);
  });

  pythonProcess.stderr?.on("data", (data: Buffer) => {
    const msg = data.toString().trim();
    // Uvicorn writes normal startup info to stderr — filter real errors
    if (msg && !msg.includes("INFO") && !msg.includes("Started") && !msg.includes("Uvicorn")) {
      console.error(`[Python API] ${msg}`);
    }
  });

  pythonProcess.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[Python API] Process exited with code ${code}`);
    }
    pythonProcess = null;
  });

  // Wait up to 10 seconds for the server to become ready
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await isPortListening(PYTHON_PORT)) {
      console.log(`[Python API] ✅ Ready on port ${PYTHON_PORT}`);
      return;
    }
  }

  console.warn(`[Python API] ⚠️ Server did not become ready within 10 seconds. PPTX/infographic generation may fail.`);
}

export function stopPythonServer(): void {
  if (pythonProcess) {
    pythonProcess.kill("SIGTERM");
    pythonProcess = null;
    console.log("[Python API] Stopped.");
  }
}

// Graceful shutdown
process.on("SIGTERM", stopPythonServer);
process.on("SIGINT", stopPythonServer);
