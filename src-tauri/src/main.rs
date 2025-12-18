#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serialport::available_ports;
use serialport::SerialPort;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::Read;
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, State};
use tokio::sync::Mutex;

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
        .map(|p| ComPortInfo {
            port_name: p.port_name,
        })
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
async fn connect_com_port(
    port_name: String,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<String, String> {
    let mut ports = state.ports.lock().await;

    if ports.contains_key(&port_name) {
        return Err(format!("Port {} already connected", port_name));
    }

    match serialport::new(&port_name, 9600)
        .timeout(Duration::from_millis(100))
        .open()
    {
        Ok(port) => {
            ports.insert(port_name.clone(), port);
            drop(ports); // ปล่อย lock ก่อน spawn task

            // สร้าง background task สำหรับอ่านข้อมูลตลอดเวลา
            tokio::spawn({
                let app_handle = app_handle.clone();
                let port_name = port_name.clone();
                let state = state.ports.clone();
                async move {
                    loop {
                        // ตรวจสอบว่า port ยังเชื่อมต่ออยู่หรือไม่
                        let port_exists = {
                            let ports = state.lock().await;
                            ports.contains_key(&port_name)
                        };

                        if !port_exists {
                            eprintln!("Port {} disconnected, stopping read loop", port_name);
                            break;
                        }

                        // อ่านข้อมูลจาก serial port
                        match read_from_port(&port_name, state.clone()).await {
                            Ok(data) => {
                                if !data.is_empty() {
                                    // ส่งข้อมูลไปที่ frontend ผ่าน event
                                    let _ = app_handle.emit("serial-data", data);
                                }
                            }
                            Err(e) => {
                                eprintln!("Error reading from {}: {}", port_name, e);
                            }
                        }

                        // หน่วงเวลาเล็กน้อยเพื่อไม่ให้ CPU ทำงานหนักเกินไป
                        tokio::time::sleep(Duration::from_millis(50)).await;
                    }
                }
            });

            Ok(format!("Connected to {}", port_name))
        }
        Err(e) => Err(format!("Failed to connect {}: {}", port_name, e)),
    }
}

// ฟังก์ชันสำหรับอ่านข้อมูลจาก port
async fn read_from_port(
    port_name: &str,
    state: Arc<Mutex<HashMap<String, Box<dyn SerialPort>>>>,
) -> Result<String, String> {
    let mut ports = state.lock().await;
    let port = ports
        .get_mut(port_name)
        .ok_or(format!("Port {} not found", port_name))?;

    let mut buf = [0u8; 1024];
    match port.read(&mut buf) {
        Ok(n) if n > 0 => {
            let data = String::from_utf8_lossy(&buf[..n]).to_string();
            Ok(data)
        }
        Ok(_) => Ok(String::new()), // ไม่มีข้อมูล
        Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => Ok(String::new()), // timeout ปกติ
        Err(e) => Err(format!("Read error: {}", e)),
    }
}

#[tauri::command]
async fn disconnect_com_port(
    port_name: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
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
    let mut ports = state.ports.lock().await;
    let port = ports
        .get_mut(&port_name)
        .ok_or(format!("Port {} not connected", port_name))?;

    let mut command = command;
    if !command.ends_with("\r\n") {
        command.push_str("\r\n");
    }

    port.write_all(command.as_bytes())
        .map_err(|e| format!("Write error: {}", e))?;
    port.flush()
        .map_err(|e| format!("Flush error: {}", e))?;

    Ok(format!("Command sent to {}", port_name))
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