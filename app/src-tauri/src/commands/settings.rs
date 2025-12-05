use crate::settings::{AppSettings, HotkeyConfig, SettingsManager};
use tauri::State;

/// Get the current application settings
#[tauri::command]
pub async fn get_settings(
    settings_manager: State<'_, SettingsManager>,
) -> Result<AppSettings, String> {
    settings_manager.get()
}

/// Update all settings at once
#[tauri::command]
pub async fn save_settings(
    settings: AppSettings,
    settings_manager: State<'_, SettingsManager>,
) -> Result<(), String> {
    settings_manager.update(settings)
}

/// Update just the toggle hotkey
#[tauri::command]
pub async fn update_toggle_hotkey(
    hotkey: HotkeyConfig,
    settings_manager: State<'_, SettingsManager>,
) -> Result<(), String> {
    settings_manager.update_toggle_hotkey(hotkey)
}

/// Update just the hold hotkey
#[tauri::command]
pub async fn update_hold_hotkey(
    hotkey: HotkeyConfig,
    settings_manager: State<'_, SettingsManager>,
) -> Result<(), String> {
    settings_manager.update_hold_hotkey(hotkey)
}

/// Update the selected microphone device
#[tauri::command]
pub async fn update_selected_mic(
    mic_id: Option<String>,
    settings_manager: State<'_, SettingsManager>,
) -> Result<(), String> {
    settings_manager.update_selected_mic(mic_id)
}

/// Update the sound enabled setting
#[tauri::command]
pub async fn update_sound_enabled(
    enabled: bool,
    settings_manager: State<'_, SettingsManager>,
) -> Result<(), String> {
    settings_manager.update_sound_enabled(enabled)
}

/// Update the cleanup prompt setting
#[tauri::command]
pub async fn update_cleanup_prompt(
    prompt: Option<String>,
    settings_manager: State<'_, SettingsManager>,
) -> Result<(), String> {
    settings_manager.update_cleanup_prompt(prompt)
}

/// Update the STT provider setting
#[tauri::command]
pub async fn update_stt_provider(
    provider: Option<String>,
    settings_manager: State<'_, SettingsManager>,
) -> Result<(), String> {
    settings_manager.update_stt_provider(provider)
}

/// Update the LLM provider setting
#[tauri::command]
pub async fn update_llm_provider(
    provider: Option<String>,
    settings_manager: State<'_, SettingsManager>,
) -> Result<(), String> {
    settings_manager.update_llm_provider(provider)
}
