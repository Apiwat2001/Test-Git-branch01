// src/utils/formatters.js

/**
 * Format timestamp for logging
 * @param {Date} date - Date object
 * @returns {string} Formatted time string
 */
export const formatTimestamp = (date = new Date()) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

/**
 * Format message with timestamp
 * @param {string} message - Message text
 * @param {boolean} addTimestamp - Whether to add timestamp
 * @returns {string} Formatted message
 */
export const formatMessage = (message, addTimestamp = false) => {
  if (addTimestamp) {
    return `[${formatTimestamp()}] ${message}`;
  }
  return message;
};

/**
 * Format port name for display
 * @param {string} portName - COM port name
 * @returns {string} Formatted port name
 */
export const formatPortName = (portName) => {
  if (!portName) return "-- Select COM Port --";
  return portName;
};

/**
 * Parse command response
 * @param {string} response - Raw response from device
 * @returns {object} Parsed response
 */
export const parseCommandResponse = (response) => {
  try {
    // Try to parse as JSON first
    if (response.trim().startsWith('{')) {
      return JSON.parse(response);
    }
    
    // Otherwise return as text
    return {
      type: 'text',
      data: response.trim()
    };
  } catch (error) {
    return {
      type: 'text',
      data: response
    };
  }
};

/**
 * Validate IP address format
 * @param {string} ip - IP address
 * @returns {boolean} Is valid
 */
export const isValidIP = (ip) => {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) return false;
  
  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
};

/**
 * Validate port number
 * @param {number} port - Port number
 * @returns {boolean} Is valid
 */
export const isValidPort = (port) => {
  return Number.isInteger(port) && port > 0 && port <= 65535;
};

/**
 * Format connection info for display
 * @param {string} mode - Connection mode ('serial' or 'tcp')
 * @param {object} config - Connection config
 * @returns {string} Formatted connection info
 */
export const formatConnectionInfo = (mode, config) => {
  if (mode === 'serial') {
    return `${config.portName} @ ${config.baudRate} baud`;
  }
  return `${config.ip}:${config.port}`;
};

/**
 * Sanitize command string
 * @param {string} command - Command string
 * @returns {string} Sanitized command
 */
export const sanitizeCommand = (command) => {
  return command.trim().replace(/[\r\n]+$/, '');
};

/**
 * Add newline if needed
 * @param {string} text - Text string
 * @returns {string} Text with newline
 */
export const ensureNewline = (text) => {
  return text.endsWith('\n') ? text : text + '\n';
};