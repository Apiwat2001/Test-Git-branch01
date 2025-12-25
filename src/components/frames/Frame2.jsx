// src/components/frames/Frame2.jsx
import React from "react";
import { ConnectionPanel } from "../ConnectionPanel";
import { MessageDisplay } from "../MessageDisplay";
import { CommandInput } from "../CommandInput";
import { COMMANDS } from "../../constants/commands";

export const Frame2 = ({
  // Port scanner
  ports,
  selectedPort,
  onPortChange,
  onRefreshPorts,
  
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
    <div className="relative space-y-4 cursor-custom1">
      <h2 className="text-2xl font-bold text-gray-200">Digital Test</h2>

      {/* Compact Connection Panel in Header */}
      <div className="absolute top-[0px] left-45">
        <ConnectionPanel
          ports={ports}
          selectedPort={selectedPort}
          onPortChange={onPortChange}
          onRefreshPorts={onRefreshPorts}
          connected={connected}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
          compact={true}
          connectionMode="serial"
        />
      </div>

      {/* Message Display */}
      <MessageDisplay 
        message={statusMessage}
        className="text-green-300"
      />

      {/* Command Panel */}
      <div className="command-panel overflow-y-auto max-h-60">
        <CommandInput
          onSend={onSendCommand}
          onClear={onClearMessage}
          disabled={!connected}
          sending={sending}
        />

        {/* Device Info Button */}
        <div className="flex gap-3 mt-3">
          <button
            onClick={() => onSendCommand(COMMANDS.info)}
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
  );
};