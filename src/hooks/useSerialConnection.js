// src/hooks/useSerialConnection.js
import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { serialService } from "../services/serialService";

export const useSerialConnection = () => {
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Listen to serial data events
  useEffect(() => {
    let unlisten;

    const setup = async () => {
      unlisten = await listen("serial-data", (event) => {
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

  const connect = async (portName, baudRate) => {
    try {
      if (!portName) throw new Error("Please select a COM port");
      
      await serialService.connect(portName, baudRate);
      setConnected(true);
      setStatusMessage("");
      return { success: true };
    } catch (error) {
      console.error("Serial connection error:", error);
      setConnected(false);
      throw error;
    }
  };

  const disconnect = async (portName) => {
    try {
      await serialService.disconnect(portName);
      setConnected(false);
      return { success: true };
    } catch (error) {
      console.error("Serial disconnect error:", error);
      throw error;
    }
  };

  const sendCommand = async (portName, command) => {
    if (!connected) return;

    setSending(true);
    try {
      await serialService.sendCommand(portName, command);
      setStatusMessage((prev) => prev + `> ${command}\n`);
      return { success: true };
    } catch (error) {
      console.error("Send command error:", error);
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
    sendCommand,
    clearMessage,
  };
};