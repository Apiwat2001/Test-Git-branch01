import React from "react";
import ReactDOM from "react-dom/client";
import App from './App.jsx';  // เพียงแค่ import App.jsx เท่านั้น
import './index.css';         // นำเข้าไฟล์ CSS ที่เกี่ยวข้อง

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
