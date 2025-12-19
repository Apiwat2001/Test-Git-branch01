import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./index.css";

const COMMANDS = {
  info: ":info 99"
};

function App() {
  const [ports, setPorts] = useState([]);
  const [activeFrame, setActiveFrame] = useState("frame1");
  const [selectedPort, setSelectedPort] = useState("");
  const [connected, setConnected] = useState(false);
  const frameNames = { frame1: "Connect Device", frame2: "Digital Test" };
  const [statusMessage, setStatusMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messageRef = useRef(null);
  const [customCommand, setCustomCommand] = useState("");
  const [baudRate, setBaudRate] = useState(9600);


  const clearMessage = () => {
    setStatusMessage("");
  };

  async function scanComPort() {
    try {
      const result = await invoke("list_com_ports");
      setPorts(result);
      if (result.length > 0 && !selectedPort) setSelectedPort(result[0].portName);
    } catch (e) {
      console.error("Error scanning ports:", e);
    }
  }

  // Auto-scroll เมื่อมีข้อความใหม่
  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollTop = messageRef.current.scrollHeight;
    }
  }, [statusMessage]);

  useEffect(() => {
    scanComPort();
  }, []);

  // ฟัง event จาก Rust backend สำหรับข้อมูล serial
  useEffect(() => {
    let unlisten;

    const setupListener = async () => {
      unlisten = await listen("serial-data", (event) => {
        const data = event.payload;
        console.log("Received serial data:", data);
        setStatusMessage((prev) => {
        const text = data.endsWith("\n") ? data : data + "\n";
        return prev + text;
      });
      });
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  async function connectPort() {
    if (!selectedPort) return alert("Please select a COM port first.");
    try {
      console.log("Connecting to port:", selectedPort);
      const res = await invoke("connect_com_port", {
                        portName: selectedPort,
                        baudRate: baudRate,
                      });

      console.log("Connect result:", res);
      setConnected(true);
      setStatusMessage(""); // เคลียร์ข้อความเก่า
    } catch (e) {
      console.error("Error connecting:", e);
      alert("Failed to connect: " + (e?.message || e));
      setConnected(false);
    }
  }

  async function disconnectPort() {
    try {
      const res = await invoke("disconnect_com_port", { portName: selectedPort });
      console.log("Disconnect result:", res);
      setConnected(false);
    } catch (e) {
      console.error("Error disconnecting:", e);
      alert("Failed to disconnect: " + (e?.message || e));
    }
  }

  async function sendCommand(command) {
    if (!connected) return alert("Please connect a COM port first.");
    if (!command.trim()) return alert("Please enter a command.");

    setSending(true);

    try {
      const sendResponse = await invoke("send_serial_async", {
        portName: selectedPort,
        command: command,
      });
      console.log("Sent response:", sendResponse);
      
      // แสดงคำสั่งที่ส่งไป
      setStatusMessage((prev) => prev + "\n> " + command.trim() + "\n");
    } catch (err) {
      console.error("Error:", err);
      setStatusMessage((prev) => prev + "\nError: " + err);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="flex flex-col w-52 bg-gray-800 text-white p-4 shadow-lg">
        {["frame1", "frame2", "frame3", "frame4"].map((frame) => (
          <button
            key={frame}
            onClick={() => setActiveFrame(frame)}
            className={`w-full mb-2 px-4 py-2 rounded-md text-left transition ${
              activeFrame === frame
                ? "bg-green-600 shadow-md"
                : "bg-gray-700 hover:bg-gray-600 active:bg-gray-900"
            }`}
          >
            {frameNames[frame] || "-- None --"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Frame 1 ====================================================================================================================================================*/}
        {activeFrame === "frame1" && (
          <div className="relative space-y-5">
            <h2 className="text-2xl font-bold text-gray-200">COM Port Scanner</h2>
            
            <div className="flex items-center gap-3">
              <select
                className="px-3 py-2 rounded border border-gray-300 bg-black text-green-300 focus:outline-none focus:ring-2 focus:ring-green-500 text-[14px]"
                value={selectedPort}
                onChange={async (e) => {
                  const newPort = e.target.value;
                  if (connected && selectedPort !== newPort) {
                    try {
                      await disconnectPort();
                      setConnected(false);
                    } catch (err) {
                      console.error("Error disconnecting old port:", err);
                      return;
                    }
                  }
                  setSelectedPort(newPort);
                }}
              >
                <option className="text-[14px]" value="">
                  -- Select COM Port --
                </option>
                {ports.map((p, i) => (
                  <option key={i} value={p.portName}>
                    {p.portName}
                  </option>
                ))}
              </select>
              <button
                onClick={scanComPort}
                className="px-4 py-2 bg-green-600 text-white rounded-md shadow hover:bg-green-500 active:bg-green-700 transition"
              >
                Refresh
              </button>
              <div className="flex items-center gap-3">
                <label className="text-gray-300 text-sm">Baudrate</label>
                <input
                  type="number"
                  value={baudRate}
                  onChange={(e) => setBaudRate(Number(e.target.value))}
                  className="w-32 px-3 py-2 rounded border border-gray-300 bg-black text-green-300
                            focus:outline-none focus:ring-2 focus:ring-green-500 text-[14px]"
                  placeholder="9600"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={connectPort}
                disabled={connected || !selectedPort}
                className={
                  connected || !selectedPort
                    ? "px-4 py-2 bg-gray-400 text-gray-200 rounded-md opacity-70 cursor-not-allowed"
                    : "px-4 py-2 bg-green-600 text-white rounded-md shadow hover:bg-green-500 active:bg-green-700"
                }
              >
                Connect
              </button>
              <button
                onClick={disconnectPort}
                disabled={!connected}
                className={
                  !connected
                    ? "px-4 py-2 bg-gray-400 text-gray-200 rounded-md opacity-70 cursor-not-allowed"
                    : "px-4 py-2 bg-red-600 text-white rounded-md shadow hover:bg-red-500 active:bg-red-700"
                }
              >
                Disconnect
              </button>
              <span
                className={`ml-4 font-bold ${
                  connected ? "text-green-400" : "text-red-400"
                }`}
              >
                {connected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
        )}

        {/* Frame 2 ====================================================================================================================================================*/}
        {activeFrame === "frame2" && (
          <div className="relative space-y-4">
            <h2 className="text-2xl font-bold text-gray-200">Digital Test</h2>
            
            <div className="absolute top-[0px] left-45 flex items-center gap-3">
              <select
                className="w-25 px-3 py-2 rounded border border-gray-300 bg-black text-green-300 focus:outline-none focus:ring-2 focus:ring-green-500 text-[12px]"
                value={selectedPort}
                onChange={async (e) => {
                  const newPort = e.target.value;
                  if (connected && selectedPort !== newPort) {
                    try {
                      await disconnectPort();
                      setConnected(false);
                    } catch (err) {
                      console.error(err);
                      return;
                    }
                  }
                  setSelectedPort(newPort);
                }}
              >
                <option className="text-[14px]" value="">
                  -- Select COM Port --
                </option>
                {ports.map((p, i) => (
                  <option key={i} value={p.portName}>
                    {p.portName}
                  </option>
                ))}
              </select>
              <button
                onClick={scanComPort}
                className="w-15 px-1 py-2 bg-blue-700 text-white rounded-md shadow hover:bg-blue-500 active:bg-blue-600 transition text-[12px]"
              >
                Refresh
              </button>
            </div>

            <div className="absolute top-[5px] left-90 flex gap-3 text-[12px]">
              <button
                onClick={connectPort}
                disabled={connected || !selectedPort}
                className={
                  connected || !selectedPort
                    ? "px-1.5 py-1 bg-gray-400 text-gray-200 rounded-md opacity-70 cursor-not-allowed"
                    : "px-1.5 py-1 bg-green-600 text-white rounded-md shadow hover:bg-green-500 active:bg-green-700"
                }
              >
                Connect
              </button>
              <button
                onClick={disconnectPort}
                disabled={!connected}
                className={
                  !connected
                    ? "px-1.5 py-1 bg-gray-400 text-gray-200 rounded-md opacity-70 cursor-not-allowed"
                    : "px-1.5 py-1 bg-red-600 text-white rounded-md shadow hover:bg-red-500 active:bg-red-700"
                }
              >
                Disconnect
              </button>
            </div>

            {/* Message Area */}
            <div
              className="w-full h-64 p-4 bg-black text-green-300 border border-gray-700 rounded-md overflow-auto text-sm font-mono"
              style={{ whiteSpace: "pre-wrap" }}
              ref={messageRef}
            >
              {statusMessage || "Waiting for data..."}
            </div>

            {/* Custom Command */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customCommand}
                onChange={(e) => setCustomCommand(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && connected && !sending) {
                    sendCommand(customCommand);
                  }
                }}
                placeholder="Enter custom command"
                className="w-[280px] px-5 py-3 rounded border border-gray-300
                          bg-black text-green-300
                          text-[15px] font-mono
                          placeholder:text-[14px]
                          focus:outline-none focus:ring-1 focus:ring-green-500"
              />

              <button
                onClick={() => sendCommand(customCommand)}
                disabled={!connected || sending}
                className={`w-16 px-2 py-2 text-[15px] rounded-md shadow
                  ${
                    !connected || sending
                      ? "bg-gray-400 text-gray-200 opacity-70 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700"
                  }
                `}
              >
                Send
              </button>

              <button
                onClick={clearMessage}
                className="px-4 py-2 text-[15px] bg-yellow-600 text-white rounded-md shadow
                          hover:bg-yellow-500 active:bg-yellow-700"
              >
                Clear
              </button>
            </div>

            {/* ปุ่มควบคุม */}
            <div className="flex gap-3">
              <button
                onClick={() => sendCommand(COMMANDS.info)}
                disabled={!connected || sending}
                className={`px-4 py-2 rounded-md shadow ${
                  !connected || sending
                    ? "bg-gray-400 text-gray-200 opacity-70 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-500 active:bg-green-700"
                }`}
              >
                {sending ? "Sending..." : "Device Info"}
              </button>
            </div>


          </div>
        )}

        {/* Frame 3 ====================================================================================================================================================*/}
        {activeFrame === "frame3" && (
          <div>
            <h2 className="text-xl font-bold text-gray-200">Frame 3</h2>
            <p className="text-gray-400">Content for frame 3.</p>
          </div>
        )}

        {/* Frame 4 ====================================================================================================================================================*/}
        {activeFrame === "frame4" && (
          <div>
            <h2 className="text-xl font-bold text-gray-200">Frame 4</h2>
            <p className="text-gray-400">Content for frame 4.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

/* v1.9beta2 */