import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./index.css";



function App() {
  const [ports, setPorts] = useState([]);
  const [activeFrame, setActiveFrame] = useState("frame1");
  const [selectedPort, setSelectedPort] = useState("");
  const [connected, setConnected] = useState(false);
  const frameNames = {
    frame1: "Connect Device",
    frame2: "Digital Test"};
  const [statusMessage, setStatusMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messageRef = useRef(null);

  
  async function scanComPort() {
    try {
      const result = await invoke("list_com_ports");
      setPorts(result);
      if (result.length > 0 && !selectedPort) setSelectedPort(result[0].portName);
    } catch (e) {
      console.error("Error scanning ports:", e);
    }
  }

useEffect(() => {
   if(messageRef.current){
     messageRef.current.scrollTo({
      top : messageRef.current.scrollHeight,
      behavior : "smooth"
     });
   }
 }, [statusMessage]);

  useEffect(() => {
    scanComPort();
  }, []);

  async function connectPort() {
    if (!selectedPort) return alert("Please select a COM port first.");
    try {
      console.log("Connecting to port:", selectedPort);
      const res = await invoke("connect_com_port", { portName: selectedPort }); 
      console.log("Connect result:", res);
      setConnected(true);
    } catch (e) {
      console.error("Error connecting:", e);
      alert("Failed to connect: " + (e && e.message ? e.message : e));
      setConnected(false);
    }
  }

  async function disconnectPort() {
    try {
      const res = await invoke("disconnect_com_port", { portName: selectedPort });
      console.log("Disconnect result:", res);
      setConnected(false); // update state หลัง disconnect สำเร็จ
    } catch (e) {
      console.error("Error disconnecting:", e);
      alert("Failed to disconnect: " + (e && e.message ? e.message : e));
    }
  }

  async function sendCommand(command) {
  if (!connected) return alert("Please connect a COM port first.");
  setSending(true); // เปิด loading

  try {
    // ส่ง command และรออ่าน response
    const response = await invoke("send_serial_async", {
      portName: selectedPort,
      command: command,
    });

    setStatusMessage((prev) => prev + "\n" + response);

    // scroll message area ลงอัตโนมัติ
    if (messageRef.current) {
      messageRef.current.scrollTop = messageRef.current.scrollHeight;

    }
  } catch (err) {
    console.error("Error reading response:", err);
    setStatusMessage((prev) => prev + "\nError reading response");
  } finally {
    setSending(false); // ปิด loading
  }
}

  return (
    <div className="flex h-screen">

      {/* Sidebar */}
      <div className="flex flex-col w-52 bg-gray-800 text-white p-4 shadow-lg">
        {["frame1", "frame2", "frame3"].map((frame, idx) => (
          <button
            key={frame}
            onClick={() => setActiveFrame(frame)}
            className={`w-full mb-2 px-4 py-2 rounded-md text-left transition
              ${
                activeFrame === frame
                  ? "bg-green-600 shadow-md"
                  : "bg-gray-700 hover:bg-gray-600 active:bg-gray-900"
              }`}
          >
            {frameNames[frame] || '=None='}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">

        {/* Frame 1 */}
        {activeFrame === "frame1" && (
          <div className="relative space-y-5 relative">
            <h2 className="text-2xl font-bold text-gray-200">COM Port Scanner</h2>

            {/* Select + Refresh */}
            <div className="flex items-center gap-3 mt-30">
              <select
                className="px-3 py-2 rounded border border-gray-300 bg-black text-green-300
                           focus:outline-none focus:ring-2 focus:ring-green-500 text-[14px]"
                value={selectedPort}
            onChange={async (e) => {
              const newPort = e.target.value;

              if (connected && selectedPort !== newPort) {
                try {
                  await disconnectPort(); // disconnect port เก่า
                  setConnected(false);
                } catch (err) {
                  console.error("Error disconnecting old port:", err);
                  return; // ถ้า disconnect ไม่ได้ หยุดไม่เปลี่ยน port
                }
              }

              setSelectedPort(newPort);
            }}
              >
                <option className="text-[14px]" value="">
                    -- Select COM Port --</option>
                {ports.map((p, i) => (
                  <option key={i} value={p.portName}>
                    {p.portName}
                  </option>
                ))}
              </select>

              <button
                onClick={scanComPort}
                className="px-4 py-2 bg-green-600 text-white rounded-md shadow
                           hover:bg-green-500 active:bg-green-700 transition"
              >
                Refresh
              </button>
            </div>

            {/* Connect / Disconnect */}
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
              // อยู่ใต้ parent ที่มี relative จะใช้ 
              // absolute top-45 left-8 แก้ตามต้องการ
                className={`absolute top-30 left-55 ml-4 font-bold flex justify-center mt-25
                  ${ connected ? "text-green-400" : "text-red-400"}`}
                  style={{ width : "120px"}}
              >
                {connected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
        )}

          {/* Frame 2 */}
          {activeFrame === "frame2" && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-200">Digital Test</h2>

            {/* Select + Refresh */}
              <div className="absolute top-3 left-95 flex items-center gap-3 mt-2">
                <select
                  className="w-25 px-3 py-2 rounded border border-gray-300 bg-black text-green-300
                            focus:outline-none focus:ring-2 focus:ring-green-500 text-[12px]"
                  value={selectedPort}
                  onChange={async (e) => {
                    const newPort = e.target.value;
                    if (connected && selectedPort !== newPort) {
                      try { await disconnectPort(); setConnected(false); } 
                      catch (err) { console.error(err); return; }
                    }
                    setSelectedPort(newPort);
                  }}
                >
                  <option className="text-[14px]" value="">-- Select COM Port --</option>
                  {ports.map((p, i) => (
                    <option key={i} value={p.portName}>{p.portName}</option>
                  ))}
                </select>

                <button
                  onClick={scanComPort}
                  className="w-15 px-1 py-2 bg-blue-700 text-white rounded-md shadow
                            hover:bg-blue-500 active:bg-blue-600 transition text-[12px]"
                >
                  Refresh
                </button>
              </div>

            {/* Connect / Disconnect buttons */}
            <div className="absolute top-6 left-140 flex gap-3 text-[12px]">
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
                className="w-full h-64 p-4 bg-black text-green-300 border border-gray-700 rounded-md overflow-auto text-sm"
                style={{ whiteSpace: "pre-wrap" }}
                ref={messageRef}
              >
                {statusMessage || "No messages yet..."}
              </div>

              {/* ปุ่มส่งคำสั่ง */}
                <button
                  onClick={async () => {
                    if (!connected) return alert("Please connect a COM port first.");
                    setSending(true);

                    try {
                      const command = ":info 99\r\n";
                      const response = await invoke("send_serial_async", {
                        portName: selectedPort,
                        command: command
                      });

                      setStatusMessage(prev => prev + "\n" + response);

                      if (messageRef.current) {
                        messageRef.current.scrollTop = messageRef.current.scrollHeight;
                      }
                    } catch (err) {
                      console.error("Error reading response:", err);
                      setStatusMessage(prev => prev + "\n" + (err && err.message ? err.message : JSON.stringify(err)));
                    } finally {
                      setSending(false);
                    }
                  }}
                  disabled={!connected || sending}
                  className={`px-4 py-2 rounded-md shadow 
                    ${!connected || sending 
                      ? "bg-gray-400 text-gray-200 opacity-70 cursor-not-allowed" 
                      : "bg-green-600 text-white hover:bg-green-500 active:bg-green-700"}`}
                >
                  {sending ? "Sending..." : "Device Info"}
                </button>
            </div>
          )}

        {/* Frame 3 */}
        {activeFrame === "frame3" && (
          <div>
            <h2 className="text-xl font-bold text-gray-200">Frame 3</h2>
            <p className="text-gray-400">Content for frame 3.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;





/* version 1.2 */

