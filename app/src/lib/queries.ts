import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { configAPI, type HotkeyConfig, tauriAPI } from "./tauri";

export function useServerUrl() {
	return useQuery({
		queryKey: ["serverUrl"],
		queryFn: () => invoke<string>("get_server_url"),
		staleTime: Number.POSITIVE_INFINITY,
	});
}

export function useTypeText() {
	return useMutation({
		mutationFn: (text: string) => invoke("type_text", { text }),
	});
}

// Settings queries and mutations
export function useSettings() {
	return useQuery({
		queryKey: ["settings"],
		queryFn: () => tauriAPI.getSettings(),
		staleTime: Number.POSITIVE_INFINITY,
	});
}

export function useUpdateToggleHotkey() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (hotkey: HotkeyConfig) => tauriAPI.updateToggleHotkey(hotkey),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settings"] });
		},
	});
}

export function useUpdateHoldHotkey() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (hotkey: HotkeyConfig) => tauriAPI.updateHoldHotkey(hotkey),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settings"] });
		},
	});
}

export function useUpdateSelectedMic() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (micId: string | null) => tauriAPI.updateSelectedMic(micId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settings"] });
		},
	});
}

export function useUpdateSoundEnabled() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (enabled: boolean) => tauriAPI.updateSoundEnabled(enabled),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settings"] });
		},
	});
}

export function useUpdateCleanupPrompt() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (prompt: string | null) => tauriAPI.updateCleanupPrompt(prompt),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settings"] });
		},
	});
}

// History queries and mutations
export function useHistory(limit?: number) {
	return useQuery({
		queryKey: ["history", limit],
		queryFn: () => tauriAPI.getHistory(limit),
	});
}

export function useAddHistoryEntry() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (text: string) => tauriAPI.addHistoryEntry(text),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["history"] });
		},
	});
}

export function useDeleteHistoryEntry() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => tauriAPI.deleteHistoryEntry(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["history"] });
		},
	});
}

export function useClearHistory() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => tauriAPI.clearHistory(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["history"] });
		},
	});
}

// Config API queries and mutations (FastAPI server)
export function useDefaultPrompt() {
	return useQuery({
		queryKey: ["defaultPrompt"],
		queryFn: () => configAPI.getDefaultPrompt(),
		staleTime: Number.POSITIVE_INFINITY, // Default prompt never changes
		retry: false, // Don't retry if server not available
	});
}

export function useSetServerPrompt() {
	return useMutation({
		mutationFn: (prompt: string | null) => configAPI.setPrompt(prompt),
	});
}

// Provider queries and mutations

export function useAvailableProviders() {
	return useQuery({
		queryKey: ["availableProviders"],
		queryFn: () => configAPI.getAvailableProviders(),
		retry: false, // Don't retry if server not available
	});
}

export function useCurrentProviders() {
	return useQuery({
		queryKey: ["currentProviders"],
		queryFn: () => configAPI.getCurrentProviders(),
		retry: false,
	});
}

export function useUpdateSTTProvider() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (provider: string | null) =>
			tauriAPI.updateSTTProvider(provider),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settings"] });
		},
	});
}

export function useUpdateLLMProvider() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (provider: string | null) =>
			tauriAPI.updateLLMProvider(provider),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settings"] });
		},
	});
}

export function useSetServerSTTProvider() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (provider: string) => configAPI.setSTTProvider(provider),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["currentProviders"] });
		},
	});
}

export function useSetServerLLMProvider() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (provider: string) => configAPI.setLLMProvider(provider),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["currentProviders"] });
		},
	});
}
