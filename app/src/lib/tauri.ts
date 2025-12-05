import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

interface TypeTextResult {
	success: boolean;
	error?: string;
}

export interface HotkeyConfig {
	modifiers: string[];
	key: string;
}

interface HistoryEntry {
	id: string;
	timestamp: string;
	text: string;
}

interface AppSettings {
	toggle_hotkey: HotkeyConfig;
	hold_hotkey: HotkeyConfig;
	selected_mic_id: string | null;
	sound_enabled: boolean;
	cleanup_prompt: string | null;
	stt_provider: string | null;
	llm_provider: string | null;
}

export const tauriAPI = {
	async typeText(text: string): Promise<TypeTextResult> {
		try {
			await invoke("type_text", { text });
			return { success: true };
		} catch (error) {
			return { success: false, error: String(error) };
		}
	},

	async getServerUrl(): Promise<string> {
		return invoke("get_server_url");
	},

	async onStartRecording(callback: () => void): Promise<UnlistenFn> {
		return listen("recording-start", callback);
	},

	async onStopRecording(callback: () => void): Promise<UnlistenFn> {
		return listen("recording-stop", callback);
	},

	// Settings API
	async getSettings(): Promise<AppSettings> {
		return invoke("get_settings");
	},

	async saveSettings(settings: AppSettings): Promise<void> {
		return invoke("save_settings", { settings });
	},

	async updateToggleHotkey(hotkey: HotkeyConfig): Promise<void> {
		return invoke("update_toggle_hotkey", { hotkey });
	},

	async updateHoldHotkey(hotkey: HotkeyConfig): Promise<void> {
		return invoke("update_hold_hotkey", { hotkey });
	},

	async updateSelectedMic(micId: string | null): Promise<void> {
		return invoke("update_selected_mic", { micId });
	},

	async updateSoundEnabled(enabled: boolean): Promise<void> {
		return invoke("update_sound_enabled", { enabled });
	},

	async updateCleanupPrompt(prompt: string | null): Promise<void> {
		return invoke("update_cleanup_prompt", { prompt });
	},

	async updateSTTProvider(provider: string | null): Promise<void> {
		return invoke("update_stt_provider", { provider });
	},

	async updateLLMProvider(provider: string | null): Promise<void> {
		return invoke("update_llm_provider", { provider });
	},

	// History API
	async addHistoryEntry(text: string): Promise<HistoryEntry> {
		return invoke("add_history_entry", { text });
	},

	async getHistory(limit?: number): Promise<HistoryEntry[]> {
		return invoke("get_history", { limit });
	},

	async deleteHistoryEntry(id: string): Promise<boolean> {
		return invoke("delete_history_entry", { id });
	},

	async clearHistory(): Promise<void> {
		return invoke("clear_history");
	},

	// Overlay API
	async resizeOverlay(width: number, height: number): Promise<void> {
		return invoke("resize_overlay", { width, height });
	},
};

// Config API for server-side settings (FastAPI)
const CONFIG_API_URL = "http://127.0.0.1:8766";

interface DefaultPromptResponse {
	prompt: string;
}

interface CurrentPromptResponse {
	prompt: string;
	is_custom: boolean;
}

interface SetPromptResponse {
	success: boolean;
	error?: string;
}

interface ProviderInfo {
	value: string;
	label: string;
}

interface AvailableProvidersResponse {
	stt: ProviderInfo[];
	llm: ProviderInfo[];
}

interface CurrentProvidersResponse {
	stt: string | null;
	llm: string | null;
}

interface SwitchProviderResponse {
	success: boolean;
	provider?: string;
	error?: string;
}

export const configAPI = {
	async getDefaultPrompt(): Promise<DefaultPromptResponse> {
		const response = await fetch(`${CONFIG_API_URL}/api/prompt/default`);
		return response.json();
	},

	async getCurrentPrompt(): Promise<CurrentPromptResponse> {
		const response = await fetch(`${CONFIG_API_URL}/api/prompt/current`);
		return response.json();
	},

	async setPrompt(prompt: string | null): Promise<SetPromptResponse> {
		const response = await fetch(`${CONFIG_API_URL}/api/prompt`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ prompt }),
		});
		return response.json();
	},

	// Provider APIs
	async getAvailableProviders(): Promise<AvailableProvidersResponse> {
		const response = await fetch(`${CONFIG_API_URL}/api/providers/available`);
		return response.json();
	},

	async getCurrentProviders(): Promise<CurrentProvidersResponse> {
		const response = await fetch(`${CONFIG_API_URL}/api/providers/current`);
		return response.json();
	},

	async setSTTProvider(provider: string): Promise<SwitchProviderResponse> {
		const response = await fetch(`${CONFIG_API_URL}/api/providers/stt`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ provider }),
		});
		return response.json();
	},

	async setLLMProvider(provider: string): Promise<SwitchProviderResponse> {
		const response = await fetch(`${CONFIG_API_URL}/api/providers/llm`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ provider }),
		});
		return response.json();
	},
};
