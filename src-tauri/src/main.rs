#![cfg_attr( all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows" )]

use serialport::available_ports; // สำหรับ list COM ports
use serialport::SerialPort; // สำหรับ trait ของ serial port
use serde::{Serialize, Deserialize}; // สำหรับ serialize และ deserialize ข้อมูล
use tauri::{PhysicalPosition, Manager, State}; // สำหรับ Tauri app
use std::collections::HashMap; // สำหรับเก็บ ports state
use tokio::sync::Mutex;
use std::time::Duration; // สำหรับตั้ง timeout serial port
use std::sync::Arc; // เพิ่ม Arc สำหรับแชร์ state

/// ส่งข้อมูล COM port กลับไปให้ React
#[derive(Serialize, Deserialize)] 
#[serde(rename_all = "camelCase")] // แปลงชื่อเป็น camelCase
struct ComPortInfo {
    port_name: String, // Rust ใช้ snake_case, แต่ React ใช้ camelCase (portName)
}

/// คำสั่งสำหรับ React เพื่อสแกนหา COM port
#[tauri::command]
fn list_com_ports() -> Vec<ComPortInfo> {
    let ports = available_ports().unwrap_or_default();
    ports
        .into_iter()
        .map(|p| ComPortInfo { port_name: p.port_name })
        .collect()
}

/// เก็บ state ของ COM port ที่ถูกเชื่อมต่อ
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

/// คำสั่ง Connect จาก React
#[tauri::command]
async fn connect_com_port(port_name: String, state: State<'_, AppState>) -> Result<String, String> {
    let mut ports = state.ports.lock().await; // ใช้ .lock().await แทน .lock().unwrap()
    if ports.contains_key(&port_name) {
        return Err(format!("Port {} already connected", port_name));
    }
    match serialport::new(&port_name, 9600)
        .timeout(Duration::from_millis(1000))
        .open()
    {
        Ok(port) => {
            ports.insert(port_name.clone(), port);
            Ok(format!("Connected to {}", port_name))
        }
        Err(e) => Err(format!("Failed to connect {}: {}", port_name, e)),
    }
}

/// คำสั่ง Disconnect จาก React
#[tauri::command]
async fn disconnect_com_port(port_name: String, state: State<'_, AppState>) -> Result<String, String> {
    let mut ports = state.ports.lock().await; // ใช้ .lock().await แทน .lock().unwrap()
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
    let port_name = port_name.clone();
    let command = command.clone();

    let mut ports = ports_mutex.lock().await;
    let port = ports.get_mut(&port_name)
        .ok_or(format!("Port {} not connected", port_name))?;

    let command_bytes = command.as_bytes();
    println!("Sending command: {}", command); // เพิ่มข้อความ log ก่อนการส่งคำสั่ง

    match port.write_all(command_bytes) {
        Ok(_) => {
            println!("Command sent successfully to {}", port_name); // เพิ่มข้อความ log หลังส่งคำสั่ง
            port.flush().map_err(|e| format!("Error flushing to port: {}", e))?;
            Ok(format!("Sent command to {}", port_name))
        }
        Err(e) => {
            eprintln!("Error sending command to {}: {}", port_name, e); // log ข้อผิดพลาดที่เกิดขึ้น
            Err(format!("Error sending command to {}: {}", port_name, e))
        }
    }
}

#[tauri::command]
async fn read_serial_continuous(port_name: String, state: State<'_, AppState>) -> Result<String, String> {
    let mut ports = state.ports.lock().await;
    let port = ports.get_mut(&port_name)
        .ok_or(format!("Port {} not connected", port_name))?;

    let mut buf = Vec::new();
    let mut tmp = [0u8; 1024];

    println!("Reading from port: {}", port_name); // เพิ่มข้อความ log ก่อนการอ่านข้อมูลจาก port

    // ลองอ่านข้อมูลจาก port
    match port.read(&mut tmp) {
        Ok(n) if n > 0 => {
            println!("Read {} bytes from port {}", n, port_name); // log ข้อมูลที่ได้
            buf.extend_from_slice(&tmp[..n]);
            let data = String::from_utf8_lossy(&buf).to_string();
            Ok(data)
        }
        Ok(_) => {
            println!("No data read from port: {}", port_name); // log เมื่อไม่มีข้อมูล
            Ok("No data read".to_string()) // ส่งข้อความว่าไม่สามารถอ่านข้อมูลได้
        }
        Err(e) => {
            eprintln!("Error reading from port {}: {}", port_name, e); // log ข้อผิดพลาดในการอ่านข้อมูล
            Err(format!("Error reading from port {}: {}", port_name, e)) // ส่งข้อความข้อผิดพลาดกลับ
        }
    }
}


fn main() {
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            list_com_ports,
            connect_com_port,
            disconnect_com_port,
            read_serial_continuous,         
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
