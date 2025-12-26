// src/components/ConnectionPanel.jsx
import React from "react";

export const ConnectionPanel = ({
  // Serial props
  ports = [],
  selectedPort,
  onPortChange,
  baudRate,
  onBaudRateChange,
  onRefreshPorts,
  
  // TCP props
  ipAddress,
  onIpChange,
  ipPort,
  onIpPortChange,
  
  // Connection props
  connectionMode,
  onModeChange,
  connected,
  checking,
  onConnect,
  onDisconnect,
  
  // UI variants
  compact = false,

  //Custom Button
  renderConnectButtons,
}) => {
  const canConnect = connectionMode === "serial" ? selectedPort : ipAddress && ipPort;

  return (
    <div className="space-y-3">
      {/* Serial Port Selection */}
      {connectionMode === "serial" && (
        <div className="flex items-center gap-3">
          <select
            className={`${compact ? 'w-25 py-0.5 text-[12px]' : 'w-30 py-1 text-[14px]'} 
                       px-3 rounded border border-gray-300 
                       bg-black text-green-300 focus:outline-none focus:ring-2 
                       focus:ring-green-500 cursor-custom1`}
            value={selectedPort}
            onChange={(e) => onPortChange(e.target.value)}
          >
            <option value="">-- Select COM Port --</option>
            {ports.map((p, i) => (
              <option key={i} value={p.portName}>
                {p.portName}
              </option>
            ))}
          </select>

          <button
            onClick={onRefreshPorts}
            className={`${compact ? 'px-1 py-[3px] text-[12px]' : 'px-2 py-1 text-[14px]'}
                       bg-blue-700 text-white rounded-md shadow 
                       hover:bg-green-500 active:bg-green-700 transition cursor-custom1`}
          >
            Refresh
          </button>

          {!compact && (
            <>
              <label className="text-gray-300 text-sm">Baudrate</label>
              <input
                type="number"
                value={baudRate}
                onChange={(e) => onBaudRateChange(Number(e.target.value))}
                className="w-30 px-3 py-1 rounded border border-gray-300 bg-black text-green-300
                          focus:outline-none focus:ring-2 focus:ring-green-500 text-[12px] cursor-write"
                placeholder="9600"
              />
            </>
          )}
        </div>
      )}

      {/* TCP/IP Input */}
      {connectionMode === "tcp" && !compact && (
        <div className="flex items-center gap-3">
          <label className="text-gray-300 text-sm">IP</label>
          <input
            type="text"
            value={ipAddress}
            onChange={(e) => onIpChange(e.target.value)}
            className="w-40 px-3 py-1 rounded border border-gray-300 bg-black text-yellow-400
                      focus:outline-none focus:ring-2 focus:ring-green-500 text-[14px] cursor-write"
            placeholder="192.168.x.x"
          />

          <label className="text-gray-300 text-sm">Port</label>
          <input
            type="number"
            value={ipPort}
            onChange={(e) => onIpPortChange(Number(e.target.value))}
            className="w-20 px-3 py-1 rounded border border-gray-300 bg-black text-yellow-400
                      focus:outline-none focus:ring-2 focus:ring-green-500 text-[14px] cursor-write"
            placeholder="5555"
          />
        </div>
      )}

      {/* Connection Mode Toggle */}
      {!compact && (
        <div className="flex items-center gap-4 mt-7">
          <span className={`text-sm font-semibold ${
            connectionMode === "serial" ? "text-green-400" : "text-gray-400"
          }`}>
            Serial Port
          </span>

          <button
            onClick={onModeChange}
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 cursor-custom1
              ${connectionMode === "tcp" ? "bg-yellow-500" : "bg-green-600"}`}
          >
            <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full
              transition-transform duration-300
              ${connectionMode === "tcp" ? "translate-x-7" : ""}`}
            />
          </button>

          <span className={`text-sm font-semibold ${
            connectionMode === "tcp" ? "text-yellow-400" : "text-gray-400"
          }`}>
            TCP/IP
          </span>
        </div>
      )}

{/* Connect / Disconnect Buttons */}
      {renderConnectButtons ? (
        renderConnectButtons({ connected, canConnect, checking, onConnect, onDisconnect })
      ) : (
        <div className={`Relative items-center gap-3 ${compact ? '' : 'mt-7'}`}>
          <button
            onClick={onConnect}
            disabled={checking || connected || !canConnect}
            className={`${compact ? 'absolute top-[0px] left-[180px] px-1.5 py-1 text-[12px]' : 
                                    'px-4 py-2 text-[14px] '}
              ${connected || !canConnect
                ? "bg-gray-400 text-gray-200 rounded-md opacity-70 cursor-not-allowed"
                : "bg-green-600 text-white rounded-md shadow hover:bg-green-500 active:bg-green-700 cursor-custom1"
              }`}
          >
            Connect
          </button>

          <button
            onClick={onDisconnect}
            disabled={checking || !connected}
            className={`${compact ? 'absolute top-[0px] left-[240px] px-1.5 py-1 text-[12px]' : 
                                    'px-4 py-2 text-[14px]' }
              ${!connected
                ? "bg-gray-400 text-gray-200 rounded-md opacity-70 cursor-not-allowed"
                : "bg-red-600 text-white rounded-md shadow hover:bg-red-500 active:bg-red-700 cursor-custom1"
              }`}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};