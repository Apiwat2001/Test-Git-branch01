// src/constants/commands.js
export const COMMANDS = {
  info: ":info 99",
  // เพิ่ม commands อื่นๆ ตามต้องการ
};

export const FRAME_NAMES = {
  frame1: "Connect Device",
  frame2: "Digital Test",
  frame3: "SD Script",
  frame4: "Frame 4",
};

export const DEFAULT_CONFIG = {
  baudRate: 9600,
  ipAddress: "192.168.",
  ipPort: 5555,
  connectionMode: "serial", // "serial" | "tcp"
};