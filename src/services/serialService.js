// src/services/serialService.js
import { invoke } from "@tauri-apps/api/core";

export const serialService = {
  // List available COM ports
  async listPorts() {
    try {
      return await invoke("list_com_ports");
    } catch (error) {
      console.error("Error listing COM ports:", error);
      throw error;
    }
  },

  // Connect to COM port
  async connect(portName, baudRate) {
    try {
      await invoke("connect_com_port", {
        portName,
        baudRate,
      });
      return { success: true };
    } catch (error) {
      console.error("Error connecting to port:", error);
      throw error;
    }
  },

  // Disconnect from COM port
  async disconnect(portName) {
    try {
      await invoke("disconnect_com_port", {
        portName,
      });
      return { success: true };
    } catch (error) {
      console.error("Error disconnecting from port:", error);
      throw error;
    }
  },

  // Send command via serial
  async sendCommand(portName, command) {
    try {
      await invoke("send_serial_async", {
        portName,
        command,
      });
      return { success: true };
    } catch (error) {
      console.error("Error sending serial command:", error);
      throw error;
    }
  },
};