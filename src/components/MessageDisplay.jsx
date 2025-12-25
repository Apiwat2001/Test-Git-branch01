// src/components/MessageDisplay.jsx
import React, { useEffect, useRef } from "react";

export const MessageDisplay = ({ message, className = "" }) => {
  const messageRef = useRef(null);

  // Auto-scroll when new message arrives
  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollTop = messageRef.current.scrollHeight;
    }
  }, [message]);

  return (
    <div
      ref={messageRef}
      className={`w-full h-64 p-4 bg-black border border-gray-700 rounded-md 
                  overflow-auto text-sm font-mono ${className}`}
      style={{ whiteSpace: "pre-wrap" }}
    >
      {message || "Waiting for data..."}
    </div>
  );
};