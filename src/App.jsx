// src/App.jsx
import React, { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { Frame1 } from "./components/frames/Frame1";
import { Frame2 } from "./components/frames/Frame2";
import { Frame3 } from "./components/frames/Frame3";
import { Frame4 } from "./components/frames/Frame4";
import { usePortScanner } from "./hooks/usePortScanner";
import { useSerialConnection } from "./hooks/useSerialConnection";
import { useTcpConnection } from "./hooks/useTcpConnection";
import { FRAME_NAMES, DEFAULT_CONFIG } from "./constants/commands";
import "./index.css";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [activeFrame, setActiveFrame] = useState("frame1");
  const [baudRate, setBaudRate] = useState(DEFAULT_CONFIG.baudRate);
  const [ipAddress, setIpAddress] = useState(DEFAULT_CONFIG.ipAddress);
  const [ipPort, setIpPort] = useState(DEFAULT_CONFIG.ipPort);
  const [connectionMode, setConnectionMode] = useState(DEFAULT_CONFIG.connectionMode);

  // Custom hooks
  const {
    ports,
    selectedPort,
    setSelectedPort,
    scanPorts,
  } = usePortScanner();

  const serialConn = useSerialConnection();
  const tcpConn = useTcpConnection(ipAddress, ipPort);

  // Select active connection based on mode
  const activeConn = connectionMode === "serial" ? serialConn : tcpConn;

  // Auto-disconnect when switching connection mode
  useEffect(() => {
    if (!connectionMode) return;
    const handleModeSwitch = async () => {
      try {
        if (serialConn.connected && selectedPort) {
          await serialConn.disconnect(selectedPort);
        }
        if (tcpConn.connected && ipAddress && ipPort) {
          await tcpConn.disconnect(ipAddress, ipPort);
        }
      } catch (e) {
        console.warn("Mode switch disconnect failed:", e);
      }
    };

    handleModeSwitch();
  }, [connectionMode]);

  // Refresh แล้ว Disconnect 
  useEffect(() => {
    const handleBeforeUnload = () => {
      invoke("disconnect_all").catch((e) =>
        console.warn("disconnect_all failed:", e)
      );
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Handle port change with auto-disconnect
  const handlePortChange = async (newPort) => {
    if (serialConn.connected && selectedPort !== newPort) {
      try {
        await serialConn.disconnect(selectedPort);
      } catch (err) {
        console.error("Error disconnecting old port:", err);
        return;
      }
    }
    setSelectedPort(newPort);
  };

  // Connect handler
  const handleConnect = async () => {
    try {
      if (connectionMode === "serial") {
        await serialConn.connect(selectedPort, baudRate);
      } else {
        await tcpConn.connect(ipAddress, ipPort);
      }
    } catch (error) {
      alert(error.message || "Connection failed");
    }
  };

  // Disconnect handler
  const handleDisconnect = async () => {
    try {
      if (connectionMode === "serial") {
        await serialConn.disconnect(selectedPort);
      } else {
        await tcpConn.disconnect(ipAddress, ipPort);
      }
    } catch (error) {
      console.error("Disconnect error:", error);
    }
  };

  // Send command handler
  const handleSendCommand = async (command) => {
    try {
      if (connectionMode === "serial") {
        await serialConn.sendCommand(selectedPort, command);
      } else {
        await tcpConn.sendData(ipAddress, ipPort, command);
      }
    } catch (error) {
      alert(error.message || "Send failed");
    }
  };

  // Mode toggle handler
  const handleModeToggle = () => {
    setConnectionMode((prev) => (prev === "serial" ? "tcp" : "serial"));
  };

  // Common props for frames
  const commonFrameProps = {
    // Port scanner
    ports,
    selectedPort,
    onPortChange: handlePortChange,
    onRefreshPorts: scanPorts,
    
    // Connection config
    baudRate,
    onBaudRateChange: setBaudRate,
    ipAddress,
    onIpChange: setIpAddress,
    ipPort,
    onIpPortChange: setIpPort,
    connectionMode,
    onModeChange: handleModeToggle,
    
    // Connection state (from active connection)
    connected: activeConn.connected,
    checking: activeConn.checking,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    
    // Messages (from active connection)
    statusMessage: activeConn.statusMessage,
    sending: activeConn.sending,
    onSendCommand: handleSendCommand,
    onClearMessage: activeConn.clearMessage,
  };

  return (
    <div className="flex h-screen cursor-custom1">
      <Sidebar
        activeFrame={activeFrame}
        onFrameChange={setActiveFrame}
        frameNames={FRAME_NAMES}
      />

      <div className="flex-1 p-6 overflow-auto">
        {activeFrame === "frame1" && <Frame1 {...commonFrameProps} />}
        {activeFrame === "frame2" && <Frame2 {...commonFrameProps} />}
        {activeFrame === "frame3" && <Frame3 {...commonFrameProps} />}
        {activeFrame === "frame4" && <Frame4 {...commonFrameProps} />}
      </div>
    </div>
  );
}

export default App;


/* version 2.4 */