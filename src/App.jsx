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
  const [ipAddress, setIpAddress] = useState("192.168.");
  const [ipPort, setIpPort] = useState(5555);
  const [connectionMode, setConnectionMode] = useState("serial");
  const prevModeRef = useRef(connectionMode);

  const clearMessage = () => {
    setStatusMessage("");
  };

  const canConnect =
    connectionMode === "serial"
      ? selectedPort
      : ipAddress && ipPort;

  async function scanComPort() {
    try {
      const result = await invoke("list_com_ports");
      setPorts(result);
      if (result.length > 0 && !selectedPort) setSelectedPort(result[0].portName);
    } catch (e) {
      console.error("Error scanning ports:", e);
    }
  }

  // auto scroll เมื่อมีข้อความใหม่
  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollTop = messageRef.current.scrollHeight;
    }
  }, [statusMessage]);

  useEffect(() => {
    scanComPort();
  }, []);

  // ฟัง event จาก rust สำหรับข้อมูล serial
  useEffect(() => {
    let unSerial;
    let unTcp;

    const setup = async () => {
      unSerial = await listen("serial-data", (e) => {
        if (connectionMode !== "serial") return;

        setStatusMessage(p => {
          const t = e.payload;
          return p + (t.endsWith("\n") ? t : t + "\n");
        });
      });

      unTcp = await listen("tcp-data", (e) => {
        if (connectionMode !== "tcp") return;

        setStatusMessage(p => {
          const t = e.payload;
          return p + (t.endsWith("\n") ? t : t + "\n");
        });
      });
    };

  setup();

  return () => {
    unSerial?.();
    unTcp?.();
  };
}, [connectionMode]);

useEffect(() => {
  if (!connected) {
    prevModeRef.current = connectionMode;
    return;
  }
  //disconnect ตามโหมดเดิม 
  if(prevModeRef.current === "serial"){
    invoke("disconnect_com_port",{
      portName : selectedPort,
    }).catch(console.error);
  }
  else{
    invoke("disconnect_tcp",{
      ip : ipAddress,
      port : ipPort,
    }).catch(console.error);
  }

  setConnected(false);
  prevModeRef.current = connectionMode
}, [connectionMode]);

  async function connectPort() {
    try {
      if (connectionMode === "serial") {
        if (!selectedPort) return alert("Select COM port");

        await invoke("connect_com_port", {
          portName: selectedPort,
          baudRate,
        });
      } else {
        await invoke("connect_tcp", {
          ip: ipAddress,
          port: ipPort,
        });
      }

      setConnected(true);
      setStatusMessage("");
    } catch (e) {
      console.error(e);
      alert(e);
      setConnected(false);
    }
  }

  async function disconnectPort() {
    try {
      if (connectionMode === "serial") {
        await invoke("disconnect_com_port", {
          portName: selectedPort,
        });
      } else {
        await invoke("disconnect_tcp", {
          ip: ipAddress,
          port: ipPort,
        });
      }
      setConnected(false);
    } catch (e) {
      console.error(e);
    }
  }

  async function sendCommand(command) {
    if (!connected) return;

    setSending(true);

    try {
      if (connectionMode === "serial") {
        await invoke("send_serial_async", {
          portName: selectedPort,
          command,
        });
      } else {
        await invoke("send_tcp", {
          ip: ipAddress,
          port: ipPort,
          data: command + "\r\n",
        });
      }

      setStatusMessage((p) => p + `> ${command}\n`);

    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }
  {/* Root */}
  return (
    <div className="flex h-screen cursor-custom1">
      {/* Sidebar */}
      <div className="flex flex-col w-52 bg-gray-800 text-white p-4 shadow-lg">
        {["frame1", "frame2", "frame3", "frame4"].map((frame) => (
          <button
            key={frame}
            onClick={() => setActiveFrame(frame)}
            className={`cursor-custom1 w-full mb-2 px-4 py-2 rounded-md text-left transition ${
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
          <div className="relative space-y-3">
            <h2 className="text-2xl font-bold text-gray-200">
              Device Info</h2>
            
            <div className="flex items-center gap-3">
              <select
                className="w-25 px-3 py-0.5 text-[14px] rounded border border-gray-300 
                bg-black text-green-300 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-custom1"
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
                  <option className="text-[12px]" value="">
                    -- Select COM Port --
                  </option>
                  {ports.map((p, i) => (
                    <option
                      key={i}
                      value={p.portName}
                      className="text-[12px]"
                    >
                      {p.portName}
                    </option>
                  ))}
              </select>
              <button
                onClick={scanComPort}
                className="px-1 py-[3px] bg-blue-700 text-[14px] text-white rounded-md shadow 
                           hover:bg-green-500 active:bg-green-700 transition cursor-custom1"
              >
                Refresh
              </button>
              <div className="flex items-center gap-3">
                <label className="text-gray-300 text-sm">Baudrate</label>
                <input
                  type="number"
                  value={baudRate}
                  onChange={(e) => setBaudRate(Number(e.target.value))}
                  className="w-30 px-3 py-1 rounded border border-gray-300 bg-black text-green-300
                            focus:outline-none focus:ring-2 focus:ring-green-500 text-[12px] cursor-write"
                  placeholder="9600"
                />
              </div>
            </div>
              {/* IP / Port Input */}
              <div className="flex items-center gap-3">
                <label className="text-gray-300 text-sm">IP</label>
                <input
                  type="text"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  className="w-40 px-3 py-1 rounded border border-gray-300 bg-black text-yellow-400
                            focus:outline-none focus:ring-2 focus:ring-green-500 text-[14px] cursor-write"
                  placeholder="192.168.x.x"
                />

                <label className="text-gray-300 text-sm">Port</label>
                <input
                  type="number"
                  value={ipPort}
                  onChange={(e) => setIpPort(Number(e.target.value))}
                  className="w-20 px-3 py-1 rounded border border-gray-300 bg-black text-yellow-400
                            focus:outline-none focus:ring-2 focus:ring-green-500 text-[14px] cursor-write"
                  placeholder="5555"
                />
            </div>

            {/* Connection Mode Toggle */}
            <div className="flex items-center gap-4 mt-7">
              <span
                className={`text-sm font-semibold ${
                  connectionMode === "serial" ? "text-green-400" : "text-gray-400"
                }`}
              >
                Serial Port
              </span>

              <button
                onClick={() =>
                  setConnectionMode((prev) => (prev === "serial" ? "tcp" : "serial"))
                }
                className={`relative w-14 h-7 rounded-full transition-colors duration-300 cursor-custom1
                  ${connectionMode === "tcp" ? "bg-yellow-500" : "bg-green-600"}`}
              >
                <span
                  className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full
                    transition-transform duration-300
                    ${connectionMode === "tcp" ? "translate-x-7" : ""}`}
                />
              </button>

              <span
                className={`text-sm font-semibold ${
                  connectionMode === "tcp" ? "text-yellow-400" : "text-gray-400"
                }`}
              >
                TCP/IP
              </span>
            </div>

            <div className="flex items-center gap-3 mt-7 text-[14px]">
              <button
                onClick={connectPort}
                disabled={connected || !canConnect}
                className={
                  connected || !selectedPort
                    ? "px-4 py-2 bg-gray-400 text-gray-200 rounded-md opacity-70 cursor-not-allowed "
                    : "px-4 py-2 bg-green-600 text-white rounded-md shadow hover:bg-green-500 active:bg-green-700 cursor-custom1"
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
                    : "px-4 py-2 bg-red-600 text-white rounded-md shadow hover:bg-red-500 active:bg-red-700 cursor-custom1"
                }
              >
                Disconnect
              </button>
              <span
                className={`ml-9 font-bold text-[22px] ${
                  connected ? "text-green-400" : "text-red-400"
                }`}
              >
                {connected ? "Connected" : "Disconnected"}
              </span>
            </div>
              {/* Message Area */}
            <div
              className="w-full h-50 p-4 bg-black text-blue-300 border border-gray-700 rounded-md 
                         overflow-auto text-sm font-mono"
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
                  className="w-[280px] px-3 py-2 rounded border border-gray-300
                            bg-black text-blue-300
                            text-[15px] font-mono
                            placeholder:text-[14px]
                            focus:outline-none focus:ring-1 focus:ring-green-500 cursor-write"
                />

                <button
                  onClick={() => sendCommand(customCommand)}
                  disabled={!connected || sending}
                  className={`w-16 px-2 py-2 text-[15px] rounded-md shadow
                    ${
                      !connected || sending
                        ? "bg-gray-400 text-gray-200 opacity-70 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700 cursor-custom1"
                    }
                  `}
                >
                  Send
                </button>

                <button
                  onClick={clearMessage}
                  className="px-4 py-2 text-[15px] bg-yellow-600 text-white rounded-md shadow
                            hover:bg-yellow-500 active:bg-yellow-700 cursor-custom1"
                >
                  Clear
                </button>
              </div>
          </div>
        )}

        {/* Frame 2 ====================================================================================================================================================*/}
        {activeFrame === "frame2" && (
          <div className="relative space-y-4 cursor-custom1">
            <h2 className="text-2xl font-bold text-gray-200">Digital Test</h2>
            
            <div className="absolute top-[0px] left-45 flex items-center gap-3">
              <select
                className="w-25 px-3 py-2 rounded border border-gray-300 bg-black text-green-300
                 focus:outline-none focus:ring-2 focus:ring-green-500 text-[12px] cursor-custom1"
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
                className="w-15 px-1 py-2 bg-blue-700 text-white rounded-md shadow 
                hover:bg-blue-500 active:bg-blue-600 transition text-[12px] cursor-custom1"
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
                    : "px-1.5 py-1 bg-green-600 text-white rounded-md shadow hover:bg-green-500 active:bg-green-700 cursor-custom1"
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
                    : "px-1.5 py-1 bg-red-600 text-white rounded-md shadow hover:bg-red-500 active:bg-red-700 cursor-custom1"
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

            {/* Command-panel */}
            <div className="command-panel overflow-y-auto max-h-60">
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
                            focus:outline-none focus:ring-1 focus:ring-green-500 cursor-write"
                />

                <button
                  onClick={() => sendCommand(customCommand)}
                  disabled={!connected || sending}
                  className={`w-16 px-2 py-2 text-[15px] rounded-md shadow
                    ${
                      !connected || sending
                        ? "bg-gray-400 text-gray-200 opacity-70 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700 cursor-custom1"
                    }
                  `}
                >
                  Send
                </button>

                <button
                  onClick={clearMessage}
                  className="px-4 py-2 text-[15px] bg-yellow-600 text-white rounded-md shadow
                            hover:bg-yellow-500 active:bg-yellow-700 cursor-custom1"
                >
                  Clear
                </button>
                
              </div>
              {/* Device info */}
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => sendCommand(COMMANDS.info)}
                  disabled={!connected || sending}
                  className={`px-4 py-2 rounded-md shadow ${
                    !connected || sending
                      ? "bg-gray-400 text-gray-200 opacity-70 cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-500 active:bg-green-700 cursor-custom1"
                  }`}
                >
                  {sending ? "Sending..." : "Device Info"}
                </button>
              </div>
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


/* v2.1beta3 */