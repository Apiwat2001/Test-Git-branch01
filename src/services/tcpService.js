// src/services/tcpService.js
import { invoke } from "@tauri-apps/api/core";

export const tcpService = {
  // Connect to TCP/IP
  async connect(ip, port) {
    try {
      await invoke("connect_tcp", {
        ip,
        port,
      });
      return { success: true };
    } catch (error) {
      console.error("Error connecting to TCP:", error);
      throw error;
    }
  },

  // Disconnect from TCP/IP
  async disconnect(ip, port) {
    try {
      await invoke("disconnect_tcp", {
        ip,
        port,
      });
      return { success: true };
    } catch (error) {
      console.error("Error disconnecting from TCP:", error);
      throw error;
    }
  },

  // Send data via TCP
  async sendData(ip, port, data) {
    try {
      await invoke("send_tcp", {
        ip,
        port,
        data: data + "\r\n",
      });
      return { success: true };
    } catch (error) {
      console.error("Error sending TCP data:", error);
      throw error;
    }
  },
};