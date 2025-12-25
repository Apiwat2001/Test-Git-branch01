// src/components/CommandInput.jsx
import React, { useState } from "react";

export const CommandInput = ({ 
  onSend, 
  onClear, 
  disabled = false,
  sending = false,
  placeholder = "Enter custom command",
  className = ""
}) => {
  const [command, setCommand] = useState("");

  const handleSend = () => {
    if (command.trim() && !disabled && !sending) {
      onSend(command);
      setCommand(""); // Clear after send
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !disabled && !sending) {
      handleSend();
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <input
        type="text"
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-[280px] px-3 py-2 rounded border border-gray-300
                  bg-black text-blue-300
                  text-[15px] font-mono
                  placeholder:text-[14px]
                  focus:outline-none focus:ring-1 focus:ring-green-500 cursor-write"
      />

      <button
        onClick={handleSend}
        disabled={disabled || sending}
        className={`w-16 px-2 py-2 text-[15px] rounded-md shadow ${
          disabled || sending
            ? "bg-gray-400 text-gray-200 opacity-70 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700 cursor-custom1"
        }`}
      >
        Send
      </button>

      <button
        onClick={onClear}
        className="px-4 py-2 text-[15px] bg-yellow-600 text-white rounded-md shadow
                  hover:bg-yellow-500 active:bg-yellow-700 cursor-custom1"
      >
        Clear
      </button>
    </div>
  );
};