// src/components/frames/Frame3.jsx - Script Command Builder (Optimized for 800x600)
import React, { useState, useRef, useEffect } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";

export const Frame3 = ({
  ports,
  selectedPort,
  onPortChange,
  onRefreshPorts,
  baudRate,
  onBaudRateChange,
  ipAddress,
  onIpChange,
  ipPort,
  onIpPortChange,
  connectionMode,
  onModeChange,
  connected,
  onConnect,
  onDisconnect,
  statusMessage,
  sending,
  onSendCommand,
  onClearMessage,
}) => {
  // State
  const [commandType, setCommandType] = useState(":scr_wrl");
  const [indexCounter, setIndexCounter] = useState(0);
  const [wrapperType, setWrapperType] = useState("");
  const [variable, setVariable] = useState("");
  const [useIndex, setUseIndex] = useState(false);
  const [delay, setDelay] = useState("0");
  const [outputText, setOutputText] = useState("");
  const [commands, setCommands] = useState([]);
  const [commandStatus, setCommandStatus] = useState([]);
  const [generateStatus, setGenerateStatus] = useState([]);
  const [manualIndex, setManualIndex] = useState("");

  // Refs
  const outputRef = useRef(null);
  const commandStatusRef = useRef(null);
  const generateStatusRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    if (commandStatusRef.current) {
      commandStatusRef.current.scrollTop = commandStatusRef.current.scrollHeight;
    }
  }, [commandStatus]);

  useEffect(() => {
    if (generateStatusRef.current) {
      generateStatusRef.current.scrollTop = generateStatusRef.current.scrollHeight;
    }
  }, [generateStatus]);

  // Add Command
  const handleAddCommand = () => {
    const cmdType = commandType.trim();
    let variableFormatted = "";

    if (variable) {
      variableFormatted = wrapperType
        ? `${wrapperType}{${variable}}`
        : `$\{${variable}}`;
    }

    let command;
    if (useIndex) {
      command = `${cmdType} ${indexCounter} "${variableFormatted}"`;
    } else {
      command = `${cmdType} "${variableFormatted}"`;
    }

    setCommands([...commands, command]);
    setOutputText((prev) => prev + command + "\n");

    if (useIndex) {
      setIndexCounter(indexCounter + 1);
    }

    setVariable("");
    setWrapperType("");
  };

  // Set Index
  const handleSetIndex = () => {
    const value = parseInt(manualIndex);
    if (!isNaN(value)) {
      setIndexCounter(value);
      setManualIndex("");
    } else {
      alert("Please enter a valid number.");
    }
  };

  // Clear
  const handleClear = () => {
    setCommands([]);
    setIndexCounter(0);
    setOutputText("");
    setCommandStatus([]);
    setGenerateStatus([]);
  };

  // Add timestamp
  const getTimestamp = () => {
    const now = new Date();
    return `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}]`;
  };

  // Send Direct Command
  const sendDirectCommand = async (cmd) => {
    const timestamp = getTimestamp();
    
    setCommandStatus((prev) => [
      ...prev,
      `${timestamp} > ${cmd}`,
    ]);

    await onSendCommand(cmd);
    /*
    setCommandStatus((prev) => [
      ...prev,
      `${timestamp} success : ${cmd}`,
    ]);

    const delayMs = parseInt(delay) || 0;
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }*/
  };

  // Start/Stop
  const handleStart = () => sendDirectCommand(":scr_run 1");
  const handleStop = () => sendDirectCommand(":scr_run 0");

  // Send Commands from Output Box
  const handleSendFromOutput = async () => {
    if (!connected) {
      alert("Please connect first.");
      return;
    }

    const lines = outputText.split("\n").filter((line) => line.trim());
    const delayMs = parseInt(delay) || 0;

    for (const line of lines) {
      if (line.startsWith(">>>")) continue;
      await sendDirectCommand(line);
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  };

  // Generate
  const handleGenerate = () => {
    const lines = outputText.split("\n").filter((line) => line.trim());
    if (lines.length === 0) {
      alert("No lines to generate from.");
      return;
    }

    const newGenerated = [];
    let localIndex = 0;

    for (const line of lines) {
      const cmd = `:scr_wrl ${localIndex} ${line}`;
      newGenerated.push(`Generated: ${cmd}`);
      localIndex++;
    }

    setGenerateStatus(newGenerated);
  };

  // Send Generated
  const handleSendGenerated = async () => {
    if (!connected) {
      alert("Please connect first.");
      return;
    }

    const delayMs = parseInt(delay) || 0;

    for (const line of generateStatus) {
      const cmd = line.replace("Generated: ", "");
      await sendDirectCommand(cmd);
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  };

  // Save Script
  const handleSave = async () => {
    const path = await save({
      defaultPath: "script.txt",
      filters: [{ name: "Text", extensions: ["txt"] }],
    });

    if (!path) return;

    await writeTextFile(path, outputText);
  };

  // Load Script
  const handleLoad = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setOutputText(text);
      const lines = text.split("\n").filter((line) => line.trim());
      setCommands(lines);
      setIndexCounter(lines.length);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-2 text-xs">
      <h2 className="text-lg font-bold text-gray-200">Script Command Builder</h2>

      {/* Connection Panel - Compact */}
      <div className="cursor-custom1 p-2 bg-gray-800 rounded space-y-2">
        {/* Row 1: Mode Toggle & Status */}
        <div className="flex items-center gap-2 text-[12px]">
          <span className={connectionMode === "serial" ? "text-green-400" : "text-gray-400"}>
            Serial
          </span>
          <button
            onClick={onModeChange}
            className={`cursor-custom1 relative w-10 h-5 rounded-full transition-colors ${
              connectionMode === "tcp" ? "bg-yellow-500" : "bg-green-600"
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
              connectionMode === "tcp" ? "translate-x-5" : ""
            }`} />
          </button>
          <span className={connectionMode === "tcp" ? "text-yellow-400" : "text-gray-400"}>
            TCP/IP
          </span>
          
          <span className={`ml-auto font-bold text-sm ${connected ? "text-green-400" : "text-red-400"}`}>
            {connected ? "●" : "○"}
          </span>
        </div>

        {/* Row 2: Connection Controls */}
        {connectionMode === "serial" ? (
          <div className="cursor-custom1 flex items-center gap-2 text-[11px]">
            <select
              value={selectedPort}
              onChange={(e) => onPortChange(e.target.value)}
              className="cursor-custom1 px-2 py-0.5 rounded bg-black text-green-300 border border-gray-600 text-[12px]"
            >
              <option value="">-- COM --</option>
              {ports.map((p, i) => (
                <option key={i} value={p.portName}>{p.portName}</option>
              ))}
            </select>
            <button onClick={onRefreshPorts} className="cursor-custom1 px-2 py-0.5 bg-blue-600 text-white rounded text-[12px]">
              Refresh
            </button>
            <input
              type="number"
              value={baudRate}
              onChange={(e) => onBaudRateChange(Number(e.target.value))}
              className="cursor-write w-16 px-1 py-0.5 rounded bg-black text-green-300 border border-gray-600 text-[12px]"
              placeholder="9600"
            />
            <button
              onClick={connected ? onDisconnect : onConnect}
              disabled={!selectedPort}
              className={`cursor-custom1 px-3 py-0.5 rounded text-[12px] font-semibold ${
                connected
                  ? "bg-red-600 hover:bg-red-500 text-white"
                  : !selectedPort
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-500 text-white"
              }`}
            >
              {connected ? "Disconnect" : "Connect"}
            </button>
          </div>
        ) : (
          <div className="cursor-custom1 flex items-center gap-2 text-[11px]">
            <input
              type="text"
              value={ipAddress}
              onChange={(e) => onIpChange(e.target.value)}
              className="cursor-write w-28 px-2 py-0.5 rounded bg-black text-yellow-400 border border-gray-600 text-[12px]"
              placeholder="192.168.x.x"
            />
            <input
              type="number"
              value={ipPort}
              onChange={(e) => onIpPortChange(Number(e.target.value))}
              className="cursor-write w-16 px-1 py-0.5 rounded bg-black text-yellow-400 border border-gray-600 text-[12px]"
              placeholder="5555"
            />
            <button
              onClick={connected ? onDisconnect : onConnect}
              disabled={!ipAddress || !ipPort}
              className={`cursor-custom1 px-3 py-0.5 rounded text-[12px] font-semibold ${
                connected
                  ? "bg-red-600 hover:bg-red-500 text-white"
                  : !ipAddress || !ipPort
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-500 text-white"
              }`}
            >
              {connected ? "Disconnect" : "Connect"}
            </button>
          </div>
        )}
      </div>

      {/* Command Builder */}
      <div className="cursor-custom1
          grid
          grid-cols-[35px_90px_30px_40px_30px_70px_1fr_50px_40px_50px]
          gap-1 p-2 bg-gray-800 rounded items-center text-[12px]
        ">
        <label className="cursor-custom1 text-gray-300">Cmd:</label>
        <select
          value={commandType}
          onChange={(e) => setCommandType(e.target.value)}
          className="cursor-custom1 px-0.5 py-0.5 rounded bg-black text-green-300 border border-gray-600 text-[12px]"
        >
          <option value="">--</option>
          <option value=":scr_wrl">:scr_wrl</option>
          <option value=":scr_rdl">:scr_rdl</option>
          <option value=":scr_run">:scr_run</option>
        </select>

        <label className="cursor-custom1 text-gray-300 text-right">Index:</label>
        <span className=" px-1 py-0.5 bg-gray-700 rounded text-green-400 text-center text-[12px]">
          {indexCounter}
        </span>

        <label className="cursor-custom1 text-gray-300">Wrap:</label>
        <select
          value={wrapperType}
          onChange={(e) => setWrapperType(e.target.value)}
          className="cursor-custom1 px-1 py-0.5 rounded bg-black text-green-300 border border-gray-600 text-[12px]"
        >
          <option value="">--</option>
          <option value="$INIT">$INIT</option>
          <option value="$DO">$DO</option>
          <option value="$IF">$IF</option>
          <option value="$IFDT">$IFDT</option>
          <option value="$THEN">$THEN</option>
          <option value="$ELSE">$ELSE</option>
        </select>

        <input
          type="text"
          value={variable}
          onChange={(e) => setVariable(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddCommand()}
          className="cursor-write col-span-3 px-1 py-0.5 rounded
           bg-black text-green-300 border border-gray-600 text-[12px]"
          placeholder="Variable"
        />

        <button
          onClick={handleAddCommand}
          className="cursor-custom1 px-2 py-0.5 bg-green-600 text-white rounded text-[12px] hover:bg-green-500"
        >
          Add
        </button>
                  <label className="cursor-custom1 text-gray-300">Delay:</label>
          <input
            type="number"
            value={delay}
            onChange={(e) => setDelay(e.target.value)}
            className="cursor-write w-14 px-1 py-0.5 rounded bg-black text-green-300 border border-gray-600 text-[12px]"
            placeholder="0"
          />
          <span className="cursor-custom1 absolute left-85 top-43.5 text-gray-400">ms</span>
      </div>

      {/* Index & File Controls */}
      <div className="cursor-custom1 flex items-center gap-2 p-2 bg-gray-800 rounded text-[12px]">
        <label className="cursor-custom1 flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={useIndex}
            onChange={(e) => setUseIndex(e.target.checked)}
            className="w-3 h-3"
          />
          <span className="text-gray-300">Index</span>
        </label>

        <input
          type="number"
          value={manualIndex}
          onChange={(e) => setManualIndex(e.target.value)}
          className="cursor-write w-12 px-1 py-0.5 rounded bg-black text-green-300 border border-gray-600 text-[12px]"
          placeholder="Set"
        />
        <button
          onClick={handleSetIndex}
          className="cursor-custom1 px-2 py-0.5 bg-blue-600 text-white rounded text-[12px] hover:bg-blue-500"
        >
          Set
        </button>

        <div className="cursor-custom1 ml-auto flex gap-1">
          <button onClick={handleSave} className="cursor-custom1 px-2 py-0.5 bg-purple-600 text-white rounded text-[12px] cursor-pointer hover:bg-purple-500">
            Save
          </button>
          <label className="cursor-custom1 px-2 py-0.5 bg-purple-600 text-white rounded text-[12px] cursor-pointer hover:bg-purple-500">
            Load
            <input type="file" accept=".txt" onChange={handleLoad} className="hidden" />
          </label>
        </div>
      </div>

      {/* Output Box - Compact */}
      <div>
        <textarea
          ref={outputRef}
          value={outputText}
          onChange={(e) => setOutputText(e.target.value)}
          className="cursor-write w-full h-32 p-2 bg-black text-blue-300 border border-gray-700 rounded
                    font-mono text-[14px] focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          placeholder="Commands..."
        />
      </div>

      {/* Control Buttons - Compact */}
      <div className="cursor-custom1 flex gap-1 text-[12px]">
        <button
          onClick={handleStart}
          disabled={!connected}
          className={`px-2 py-1 rounded ${
            !connected ? "cursor-custom1 bg-gray-600 text-gray-400" : "bg-green-600 text-white hover:bg-green-500"
          }`}
        >
          Start
        </button>
        <button
          onClick={handleStop}
          disabled={!connected}
          className={`px-2 py-1 rounded ${
            !connected ? "cursor-custom1 bg-gray-600 text-gray-400" : "bg-red-600 text-white hover:bg-red-500"
          }`}
        >
          Stop
        </button>
        <button
          onClick={handleSendFromOutput}
          disabled={!connected}
          className={`cursor-custom1 px-2 py-1 rounded ${
            !connected ? "bg-gray-600 text-gray-400" : "bg-blue-600 text-white hover:bg-blue-500"
          }`}
        >
          Send
        </button>
        <button onClick={handleClear} className="cursor-custom1 px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-500">
          Clear
        </button>
        <button onClick={handleGenerate} className="cursor-custom1 px-2 py-1 bg-cyan-600 text-white rounded hover:bg-cyan-500 ml-auto">
          Generate
        </button>
        <button
          onClick={handleSendGenerated}
          disabled={!connected}
          className={`cursor-custom1 px-2 py-1 rounded ${
            !connected ? " bg-gray-600 text-gray-400" : "bg-cyan-600 text-white hover:bg-cyan-500"
          }`}
        >
          Send Gen
        </button>
      </div>

      {/* Status Boxes - Compact */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-gray-300 text-[12px] font-semibold">Command Status:</label>
          <div
            ref={commandStatusRef}
            className="h-24 p-1 bg-black text-green-300 border border-gray-700 rounded 
              overflow-auto font-mono text-[12px]"
          >
            {commandStatus.length === 0 ? (
              <p className="text-gray-500">Waiting...</p>
            ) : (
              commandStatus.map((line, i) => <div key={i}>{line}</div>)
            )}
          </div>
        </div>

        <div>
          <label className="text-gray-300 text-[12px] font-semibold">Generate Status:</label>
          <div
            ref={generateStatusRef}
            className="h-24 p-1 bg-black text-blue-300 border border-gray-700 rounded 
              overflow-auto font-mono text-[12px]"
          >
            {generateStatus.length === 0 ? (
              <p className="text-gray-500">No generated...</p>
            ) : (
              generateStatus.map((line, i) => <div key={i}>{line}</div>)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};