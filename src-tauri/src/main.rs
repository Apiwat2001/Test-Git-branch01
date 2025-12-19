#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serialport::available_ports;
use serialport::SerialPort;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, State};
use tokio::sync::Mutex;
use std::io::{Read, Write};


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
    buffers: Arc<Mutex<HashMap<String, String>>>,
}

impl Default for AppState {
    fn default() -> Self {
        AppState {
            ports: Arc::new(Mutex::new(HashMap::new())),
            buffers: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

#[tauri::command]
async fn connect_com_port(
    port_name: String,
    baud_rate: u32, // 👈 รับ baudrate จาก frontend
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<String, String> {
    let mut ports = state.ports.lock().await;

    if ports.contains_key(&port_name) {
        return Err(format!("Port {} already connected", port_name));
    }

    match serialport::new(&port_name, baud_rate) // 👈 ใช้ baudrate ที่ส่งมา
        .timeout(Duration::from_millis(100))
        .open()
    {
        Ok(port) => {
            ports.insert(port_name.clone(), port);
            state
                .buffers
                .lock()
                .await
                .insert(port_name.clone(), String::new());

            drop(ports); // ปล่อย lock ก่อน spawn task

            let buffers = state.buffers.clone();
            tokio::spawn({
                let app_handle = app_handle.clone();
                let port_name = port_name.clone();
                let state = state.ports.clone();

                async move {
                    loop {
                        let port_exists = {
                            let ports = state.lock().await;
                            ports.contains_key(&port_name)
                        };

                        if !port_exists {
                            eprintln!("Port {} disconnected, stopping read loop", port_name);
                            break;
                        }

                        match read_from_port(&port_name, state.clone(), buffers.clone()).await {
                            Ok(lines) => {
                                for line in lines {
                                    app_handle.emit("serial-data", line).ok();
                                }
                            }
                            Err(_) => break,
                        }

                        tokio::time::sleep(Duration::from_millis(50)).await;
                    }
                }
            });

            Ok(format!(
                "Connected to {} @ {} baud",
                port_name, baud_rate
            ))
        }
        Err(e) => Err(format!(
            "Failed to connect {} @ {} baud: {}",
            port_name, baud_rate, e
        )),
    }
}

async fn read_from_port(
    port_name: &str,
    ports: Arc<Mutex<HashMap<String, Box<dyn SerialPort>>>>,
    buffers: Arc<Mutex<HashMap<String, String>>>,
) -> Result<Vec<String>, String> {
    let mut ports = ports.lock().await;
    let port = ports
        .get_mut(port_name)
        .ok_or(format!("Port {} not found", port_name))?;

    let mut buf = [0u8; 256];
    let n = match port.read(&mut buf) {
        Ok(n) if n > 0 => n,
        Ok(_) => return Ok(vec![]),
        Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => return Ok(vec![]),
        Err(e) => return Err(e.to_string()),
    };

    let chunk = String::from_utf8_lossy(&buf[..n]);

    let mut buffers = buffers.lock().await;
    let line_buf = buffers.entry(port_name.to_string()).or_default();
    line_buf.push_str(&chunk);

    let mut lines = Vec::new();

    loop {
        // หา CR หรือ LF
        let pos = line_buf
            .find('\r')
            .or_else(|| line_buf.find('\n'));

        let Some(pos) = pos else { break };

        let mut line = line_buf[..pos].to_string();

        // ตัด CRLF / CR / LF
        let mut cut = pos + 1;
        if line_buf.as_bytes().get(pos) == Some(&b'\r')
            && line_buf.as_bytes().get(pos + 1) == Some(&b'\n')
        {
            cut += 1;
        }

        *line_buf = line_buf[cut..].to_string();

        line = line.trim().to_string();
        if !line.is_empty() {
            lines.push(line); 
        }
    }

    Ok(lines)
}

#[tauri::command]
async fn disconnect_com_port(
    port_name: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let mut ports = state.ports.lock().await;
    let mut buffers = state.buffers.lock().await;

    let removed = ports.remove(&port_name);
    buffers.remove(&port_name);

    if removed.is_some() {
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

    let mut command = command.trim_end_matches(&['\r', '\n'][..]).to_string();
    command.push('\r'); 

    port.write_all(command.as_bytes())
        .map_err(|e| format!("Write error: {}", e))?;
    port.flush()
        .map_err(|e| format!("Flush error: {}", e))?;

    Ok("Command sent".into())
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