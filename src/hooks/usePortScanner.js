// src/hooks/usePortScanner.js
import { useState, useEffect } from "react";
import { serialService } from "../services/serialService";

export const usePortScanner = () => {
  const [ports, setPorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState("");
  const [loading, setLoading] = useState(false);

  const scanPorts = async () => {
    setLoading(true);
    try {
      const result = await serialService.listPorts();
      setPorts(result);
      
      // Auto-select first port if none selected
      if (result.length > 0 && !selectedPort) {
        setSelectedPort(result[0].portName);
      }
    } catch (error) {
      console.error("Error scanning ports:", error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-scan on mount
  useEffect(() => {
    scanPorts();
  }, []);

  return {
    ports,
    selectedPort,
    setSelectedPort,
    scanPorts,
    loading,
  };
};