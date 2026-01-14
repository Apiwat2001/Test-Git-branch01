// src/components/frames/Frame1.jsx
import React from "react";
import { ConnectionPanel } from "../ConnectionPanel";
import { MessageDisplay } from "../MessageDisplay";
import { CommandInput } from "../CommandInput";

export const Frame1 = ({
  // Port scanner
  ports,
  selectedPort,
  onPortChange,
  onRefreshPorts,
  
  // Connection config
  baudRate,
  onBaudRateChange,
  ipAddress,
  onIpChange,
  ipPort,
  onIpPortChange,
  connectionMode,
  onModeChange,
  
  // Connection state
  connected,
  checking,
  onConnect,
  onDisconnect,
  
  // Messages
  statusMessage,
  sending,
  onSendCommand,
  onClearMessage,
}) => {
  
  return (
   <div className="relative space-y-3">
      <h2 className="text-2xl font-bold text-gray-200">Device Info</h2>

      {checking && (
        <div className="text-yellow-400 text-sm animate-pulse">
          Checking connection status...
        </div>
      )}
      
      <ConnectionPanel
        ports={ports}
        selectedPort={selectedPort}
        onPortChange={onPortChange}
        baudRate={baudRate}
        onBaudRateChange={onBaudRateChange}
        onRefreshPorts={onRefreshPorts}
        ipAddress={ipAddress}
        onIpChange={onIpChange}
        ipPort={ipPort}
        onIpPortChange={onIpPortChange}
        connectionMode={connectionMode}
        onModeChange={onModeChange}
        connected={connected}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />

      <MessageDisplay 
        message={statusMessage}
        className="text-blue-300"
      />

      <CommandInput
        onSend={onSendCommand}
        onClear={onClearMessage}
        disabled={!connected}
        sending={sending}
      />
    </div>
  );
};