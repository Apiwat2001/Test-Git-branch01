// src/components/Sidebar.jsx
import React from "react";

export const Sidebar = ({ activeFrame, onFrameChange, frameNames }) => {
  const frames = ["frame1", "frame2", "frame3", "frame4"];

  return (
    <div className="flex flex-col w-52 bg-gray-800 text-white p-4 shadow-lg">
      {frames.map((frame) => (
        <button
          key={frame}
          onClick={() => onFrameChange(frame)}
          className={`cursor-custom1 w-full mb-2 px-4 py-2 rounded-md text-left transition ${
            activeFrame === frame
              ? "bg-green-600 shadow-md"
              : "bg-gray-700 hover:bg-gray-600 active:bg-gray-900"
          }`}
        >
          {frameNames[frame] || "-- None --"}
        </button>
      ))}
    </div>
  );
};