use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::RwLock;

/// Configuration for a hotkey combination
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct HotkeyConfig {
    /// Modifier keys (e.g., ["ctrl", "alt"])
    pub modifiers: Vec<String>,
    /// The main key (e.g., "Space")
    pub key: String,
}

impl Default for HotkeyConfig {
    fn default() -> Self {
        Self {
            modifiers: vec!["ctrl".to_string(), "alt".to_string()],
            key: "Space".to_string(),
        }
    }
}

/// Application settings that are persisted to disk
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    /// Hotkey for toggle recording mode
    #[serde(default = "default_toggle_hotkey")]
    pub toggle_hotkey: HotkeyConfig,

    /// Hotkey for hold-to-record mode
    #[serde(default = "default_hold_hotkey")]
    pub hold_hotkey: HotkeyConfig,

    /// Selected microphone device ID (None = system default)
    #[serde(default)]
    pub selected_mic_id: Option<String>,

    /// Whether sound feedback is enabled
    #[serde(default = "default_sound_enabled")]
    pub sound_enabled: bool,

    /// Custom LLM cleanup prompt (None = use server default)
    #[serde(default)]
    pub cleanup_prompt: Option<String>,

    /// Selected STT provider (None = use server default)
    #[serde(default)]
    pub stt_provider: Option<String>,

    /// Selected LLM provider (None = use server default)
    #[serde(default)]
    pub llm_provider: Option<String>,

    /// Whether to automatically mute system audio during recording
    #[serde(default)]
    pub auto_mute_audio: bool,
}

fn default_toggle_hotkey() -> HotkeyConfig {
    HotkeyConfig {
        modifiers: vec!["ctrl".to_string(), "alt".to_string()],
        key: "Space".to_string(),
    }
}

fn default_hold_hotkey() -> HotkeyConfig {
    HotkeyConfig {
        modifiers: vec!["ctrl".to_string(), "alt".to_string()],
        key: "Period".to_string(),
    }
}

fn default_sound_enabled() -> bool {
    true
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            toggle_hotkey: default_toggle_hotkey(),
            hold_hotkey: default_hold_hotkey(),
            selected_mic_id: None,
            sound_enabled: true,
            cleanup_prompt: None,
            stt_provider: None,
            llm_provider: None,
            auto_mute_audio: false,
        }
    }
}

/// Manages loading and saving of application settings
pub struct SettingsManager {
    settings: RwLock<AppSettings>,
    file_path: PathBuf,
}

impl SettingsManager {
    /// Create a new settings manager with the given app data directory
    pub fn new(app_data_dir: PathBuf) -> Self {
        let file_path = app_data_dir.join("settings.json");

        // Ensure the directory exists
        if let Some(parent) = file_path.parent() {
            let _ = fs::create_dir_all(parent);
        }

        // Load existing settings or use defaults
        let settings = Self::load_from_file(&file_path).unwrap_or_default();

        Self {
            settings: RwLock::new(settings),
            file_path,
        }
    }

    /// Load settings from the JSON file
    fn load_from_file(file_path: &PathBuf) -> Option<AppSettings> {
        let content = fs::read_to_string(file_path).ok()?;
        serde_json::from_str(&content).ok()
    }

    /// Save current settings to disk
    pub fn save(&self) -> Result<(), String> {
        let settings = self
            .settings
            .read()
            .map_err(|e| format!("Failed to read settings: {}", e))?;

        let content = serde_json::to_string_pretty(&*settings)
            .map_err(|e| format!("Failed to serialize settings: {}", e))?;

        fs::write(&self.file_path, content)
            .map_err(|e| format!("Failed to write settings file: {}", e))?;

        Ok(())
    }

    /// Get a copy of the current settings
    pub fn get(&self) -> Result<AppSettings, String> {
        self.settings
            .read()
            .map(|s| s.clone())
            .map_err(|e| format!("Failed to read settings: {}", e))
    }

    /// Update settings and save to disk
    pub fn update(&self, new_settings: AppSettings) -> Result<(), String> {
        {
            let mut settings = self
                .settings
                .write()
                .map_err(|e| format!("Failed to write settings: {}", e))?;
            *settings = new_settings;
        }
        self.save()
    }

    /// Update the toggle hotkey
    pub fn update_toggle_hotkey(&self, hotkey: HotkeyConfig) -> Result<(), String> {
        {
            let mut settings = self
                .settings
                .write()
                .map_err(|e| format!("Failed to write settings: {}", e))?;
            settings.toggle_hotkey = hotkey;
        }
        self.save()
    }

    /// Update the hold hotkey
    pub fn update_hold_hotkey(&self, hotkey: HotkeyConfig) -> Result<(), String> {
        {
            let mut settings = self
                .settings
                .write()
                .map_err(|e| format!("Failed to write settings: {}", e))?;
            settings.hold_hotkey = hotkey;
        }
        self.save()
    }

    /// Update the selected microphone
    pub fn update_selected_mic(&self, mic_id: Option<String>) -> Result<(), String> {
        {
            let mut settings = self
                .settings
                .write()
                .map_err(|e| format!("Failed to write settings: {}", e))?;
            settings.selected_mic_id = mic_id;
        }
        self.save()
    }

    /// Update sound enabled setting
    pub fn update_sound_enabled(&self, enabled: bool) -> Result<(), String> {
        {
            let mut settings = self
                .settings
                .write()
                .map_err(|e| format!("Failed to write settings: {}", e))?;
            settings.sound_enabled = enabled;
        }
        self.save()
    }

    /// Update the cleanup prompt setting
    pub fn update_cleanup_prompt(&self, prompt: Option<String>) -> Result<(), String> {
        {
            let mut settings = self
                .settings
                .write()
                .map_err(|e| format!("Failed to write settings: {}", e))?;
            settings.cleanup_prompt = prompt;
        }
        self.save()
    }

    /// Update the STT provider setting
    pub fn update_stt_provider(&self, provider: Option<String>) -> Result<(), String> {
        {
            let mut settings = self
                .settings
                .write()
                .map_err(|e| format!("Failed to write settings: {}", e))?;
            settings.stt_provider = provider;
        }
        self.save()
    }

    /// Update the LLM provider setting
    pub fn update_llm_provider(&self, provider: Option<String>) -> Result<(), String> {
        {
            let mut settings = self
                .settings
                .write()
                .map_err(|e| format!("Failed to write settings: {}", e))?;
            settings.llm_provider = provider;
        }
        self.save()
    }

    /// Update the auto mute audio setting
    pub fn update_auto_mute_audio(&self, enabled: bool) -> Result<(), String> {
        {
            let mut settings = self
                .settings
                .write()
                .map_err(|e| format!("Failed to write settings: {}", e))?;
            settings.auto_mute_audio = enabled;
        }
        self.save()
    }
}
