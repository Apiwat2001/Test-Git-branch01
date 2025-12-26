// src/hooks/useSerialConnection.js
import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { serialService } from "../services/serialService";

export const useSerialConnection = () => {
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [checking, setChecking] = useState(false);

  // ===== Listen serial data =====
  useEffect(() => {
    let unlisten;

    const setup = async () => {
      unlisten = await listen("serial-data", (event) => {
        const text = event.payload;
        setStatusMessage((prev) =>
          prev + (text.endsWith("\n") ? text : text + "\n")
        );
      });
    };

    setup();
    return () => {
      unlisten?.();
    };
  }, []);

  // ===== CONNECT =====
  const connect = async (portName, baudRate) => {
    if (connected) return;
    if (!portName) throw new Error("Please select a COM port");

    await serialService.connect(portName, baudRate);
    setConnected(true);
    setStatusMessage("");
    return { success: true };
  };

  // ===== DISCONNECT =====
  const disconnect = async (portName) => {
    await serialService.disconnect(portName);
    setConnected(false);
    return { success: true };
  };

  // ===== SEND =====
  const sendCommand = async (portName, command) => {
    if (!connected) return;

    setSending(true);
    try {
      await serialService.sendCommand(portName, command);
      setStatusMessage((prev) => prev + `> ${command}\n`);
    } finally {
      setSending(false);
    }
  };

  // ===== CLEAR =====
  const clearMessage = () => {
    setStatusMessage("");
  };

  // ===== CHECK CONNECTED (สำคัญที่สุด) =====
  const checkConnected = async (portName) => {
    if (!portName) {
      setConnected(false);
      setChecking(false);
      return;
    }

    try {
      setChecking(true);

      const result = await invoke("is_serial_connected", {
        portName,
      });

      setConnected(result);
    } catch (err) {
      console.error("checkConnected error:", err);
      setConnected(false);
    } finally {
      setChecking(false);
    }
  };

  return {
    connected,
    checking,
    sending,
    statusMessage,
    connect,
    disconnect,
    sendCommand,
    clearMessage,
    checkConnected,
  };
};
