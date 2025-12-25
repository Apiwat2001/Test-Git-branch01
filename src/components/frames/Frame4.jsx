// src/components/frames/Frame4.jsx
import React from "react";
import { ConnectionPanel } from "../ConnectionPanel";
import { MessageDisplay } from "../MessageDisplay";
import { CommandInput } from "../CommandInput";

export const Frame4 = ({
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
  onConnect,
  onDisconnect,
  
  // Messages
  statusMessage,
  sending,
  onSendCommand,
  onClearMessage,
}) => {
  return (
    <div className="relative space-y-4">
      <h2 className="text-2xl font-bold text-gray-200">Frame 4 - Advanced</h2>
      
      <p className="text-gray-400">
        Advanced features and configurations
      </p>

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
        className="text-orange-300"
      />

      <CommandInput
        onSend={onSendCommand}
        onClear={onClearMessage}
        disabled={!connected}
        sending={sending}
        placeholder="Enter advanced command"
      />

      {/* Advanced features grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-800 rounded-md">
          <h3 className="text-lg font-semibold text-gray-300 mb-2">
            Feature A
          </h3>
          <p className="text-gray-400 text-sm">
            Description of feature A
          </p>
        </div>

        <div className="p-4 bg-gray-800 rounded-md">
          <h3 className="text-lg font-semibold text-gray-300 mb-2">
            Feature B
          </h3>
          <p className="text-gray-400 text-sm">
            Description of feature B
          </p>
        </div>

        <div className="p-4 bg-gray-800 rounded-md">
          <h3 className="text-lg font-semibold text-gray-300 mb-2">
            Feature C
          </h3>
          <p className="text-gray-400 text-sm">
            Description of feature C
          </p>
        </div>

        <div className="p-4 bg-gray-800 rounded-md">
          <h3 className="text-lg font-semibold text-gray-300 mb-2">
            Feature D
          </h3>
          <p className="text-gray-400 text-sm">
            Description of feature D
          </p>
        </div>
      </div>
    </div>
  );
};