#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

use serialport::{available_ports, SerialPort};
use serde::{Serialize, Deserialize};
use tauri::{PhysicalPosition, Manager, State, AppHandle, Emitter}; // นำเข้า Emitter
use std::collections::HashMap;
use tokio::sync::Mutex;
use std::time::Duration;
use std::sync::Arc;
use std::io::{Write, Read}; // สำหรับการอ่านและเขียนข้อมูลจาก serial port

/// ส่งข้อมูล COM port กลับไปให้ React
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ComPortInfo {
    port_name: String,
}

#[tauri::command]
fn list_com_ports() -> Vec<ComPortInfo> {
    let ports = available_ports().unwrap_or_default();
    ports
        .into_iter()
        .map(|p| ComPortInfo { port_name: p.port_name })
        .collect()
}

struct AppState {
    ports: Arc<Mutex<HashMap<String, Box<dyn SerialPort>>>>,
}

impl Default for AppState {
    fn default() -> Self {
        AppState {
            ports: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

#[tauri::command]
async fn connect_com_port(port_name: String, state: State<'_, AppState>, app_handle: AppHandle) -> Result<String, String> {
    let mut ports = state.ports.lock().await;

    if ports.contains_key(&port_name) {
        return Err(format!("Port {} already connected", port_name));
    }

    // ปรับปรุง timeout ให้มากขึ้น
    match serialport::new(&port_name, 9600)
        .timeout(Duration::from_secs(5)) // เพิ่มเวลา timeout เป็น 5 วินาที
        .open()
    {
        Ok(port) => {
            ports.insert(port_name.clone(), port);

            // เริ่มต้นการอ่านข้อมูลจาก Serial Port หลังจากเชื่อมต่อ
            tokio::spawn({
                let app_handle = app_handle.clone();
                let port_name = port_name.clone();
                let state = state.ports.clone();
                async move {
                    if let Err(e) = read_serial_async(port_name, app_handle, state).await {
                        eprintln!("Error reading from serial port: {}", e);
                    }
                }
            });

            Ok(format!("Connected to {}", port_name))
        }
        Err(e) => Err(format!("Failed to connect {}: {}", port_name, e)),
    }
}

#[tauri::command]
async fn disconnect_com_port(port_name: String, state: State<'_, AppState>) -> Result<String, String> {
    let mut ports = state.ports.lock().await;
    if ports.remove(&port_name).is_some() {
        Ok(format!("Disconnected from {}", port_name))
    } else {
        Err(format!("Port {} not connected", port_name))
    }
}

#[tauri::command]
async fn send_serial_async(
    port_name: String,
    command: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let ports_mutex = state.ports.clone();
    let command = command.clone();

    let mut ports = ports_mutex.lock().await;
    let port = ports.get_mut(&port_name)
        .ok_or(format!("Port {} not connected", port_name))?;

    let command_bytes = command.as_bytes();
    println!("Sending command: {}", command);

    match port.write_all(command_bytes) {
        Ok(_) => {
            println!("Command sent successfully to {}", port_name);
            // เพิ่มการเรียกใช้ flush() เพื่อให้มั่นใจว่า data ถูกส่ง
            port.flush().map_err(|e| format!("Error flushing to port: {}", e))?;
            Ok(format!("Sent command to {}", port_name))
        }
        Err(e) => {
            eprintln!("Error sending command to {}: {}", port_name, e);
            Err(format!("Error sending command to {}: {}", port_name, e))
        }
    }
}

async fn read_serial_async(port_name: String, app_handle: AppHandle, state: Arc<Mutex<HashMap<String, Box<dyn SerialPort>>>>) -> Result<(), String> {
    loop {
        // ดึง Serial Port จาก state
        let mut port = match get_serial_port(&port_name, state.clone()).await {
            Some(port) => port,
            None => return Err(format!("Port {} not found", port_name)),
        };

        let mut buf = vec![];
        let mut tmp = [0u8; 1024];

        // พิมพ์ข้อความการอ่านข้อมูลสำหรับดีบัก
        eprintln!("Attempting to read from serial port...");

        match port.read(&mut tmp) {
            Ok(n) if n > 0 => {
                buf.extend_from_slice(&tmp[..n]);
                let data = String::from_utf8_lossy(&buf).to_string();
                if !data.is_empty() {
                    // ส่งข้อมูลที่อ่านได้ให้ UI
                    app_handle.emit("serial-data", data.clone()).map_err(|e| format!("Failed to emit event: {}", e))?;
                    println!("Received data: {}", data);  // ดีบักแสดงข้อมูลที่รับ
                }
                buf.clear();
            }
            Ok(_) => {
                // ถ้าไม่มีข้อมูล
                println!("No data read from the port.");
            }
            Err(e) => {
                // จัดการข้อผิดพลาดจากการอ่าน
                eprintln!("Error reading from port: {:?}", e);
                if e.kind() == std::io::ErrorKind::TimedOut {
                    eprintln!("Timeout reached while reading from port.");
                }
                return Err(format!("Error reading from port: {}", e));
            }
        }

        // Polling ทุก 500ms
        tokio::time::sleep(Duration::from_millis(500)).await;
    }
}

async fn get_serial_port(port_name: &str, state: Arc<Mutex<HashMap<String, Box<dyn SerialPort>>>>) -> Option<Box<dyn SerialPort>> {
    let ports = state.lock().await;
    ports.get(port_name).map(|port| port.try_clone().ok()).flatten()
}

fn main() {
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            list_com_ports,
            connect_com_port,
            disconnect_com_port,
            send_serial_async
        ])
        .setup(|app| {
            // ตั้งตำแหน่งหน้าต่างตอนเปิดโปรแกรม
            if let Some(window) = app.get_webview_window("main") {
                window
                    .set_position(PhysicalPosition { x: 50, y: 350 })
                    .unwrap_or_else(|e| eprintln!("Failed to set window position: {}", e));
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
