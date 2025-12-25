// src/hooks/useTcpConnection.js
import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { tcpService } from "../services/tcpService";

export const useTcpConnection = () => {
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Listen to TCP data events
  useEffect(() => {
    let unlisten;

    const setup = async () => {
      unlisten = await listen("tcp-data", (event) => {
        setStatusMessage((prev) => {
          const text = event.payload;
          return prev + (text.endsWith("\n") ? text : text + "\n");
        });
      });
    };

    setup();

    return () => {
      unlisten?.();
    };
  }, []);

  const connect = async (ip, port) => {
    try {
      if (!ip || !port) throw new Error("Please enter IP address and port");
      
      await tcpService.connect(ip, port);
      setConnected(true);
      setStatusMessage("");
      return { success: true };
    } catch (error) {
      console.error("TCP connection error:", error);
      setConnected(false);
      throw error;
    }
  };

  const disconnect = async (ip, port) => {
    try {
      await tcpService.disconnect(ip, port);
      setConnected(false);
      return { success: true };
    } catch (error) {
      console.error("TCP disconnect error:", error);
      throw error;
    }
  };

  const sendData = async (ip, port, data) => {
    if (!connected) return;

    setSending(true);
    try {
      await tcpService.sendData(ip, port, data);
      setStatusMessage((prev) => prev + `> ${data}\n`);
      return { success: true };
    } catch (error) {
      console.error("Send data error:", error);
      throw error;
    } finally {
      setSending(false);
    }
  };

  const clearMessage = () => {
    setStatusMessage("");
  };

  return {
    connected,
    sending,
    statusMessage,
    connect,
    disconnect,
    sendData,
    clearMessage,
  };
};