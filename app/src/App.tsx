import {
	Accordion,
	Alert,
	Button,
	Kbd,
	Loader,
	NavLink,
	Select,
	Switch,
	Text,
	Textarea,
	Title,
	Tooltip,
} from "@mantine/core";
import { AlertCircle, Home, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { DeviceSelector } from "./components/DeviceSelector";
import { HistoryFeed } from "./components/HistoryFeed";
import { HotkeyInput } from "./components/HotkeyInput";
import { Logo } from "./components/Logo";
import {
	useAvailableProviders,
	useCurrentProviders,
	useDefaultPrompt,
	useIsAudioMuteSupported,
	useSetServerLLMProvider,
	useSetServerPrompt,
	useSetServerSTTProvider,
	useSettings,
	useUpdateAutoMuteAudio,
	useUpdateCleanupPrompt,
	useUpdateHoldHotkey,
	useUpdateLLMProvider,
	useUpdateSoundEnabled,
	useUpdateSTTProvider,
	useUpdateToggleHotkey,
} from "./lib/queries";
import { type HotkeyConfig, tauriAPI } from "./lib/tauri";
import { useRecordingStore } from "./stores/recordingStore";
import "./styles.css";

type View = "home" | "settings";

function ConnectionStatusIndicator() {
	const state = useRecordingStore((s) => s.state);
	const setState = useRecordingStore((s) => s.setState);

	// Listen for connection state changes from the overlay window
	useEffect(() => {
		let unlisten: (() => void) | undefined;

		tauriAPI
			.onConnectionStateChanged((newState) => {
				setState(newState);
			})
			.then((unlistenFn) => {
				unlisten = unlistenFn;
			});

		return () => {
			unlisten?.();
		};
	}, [setState]);

	const isConnected =
		state === "idle" || state === "recording" || state === "processing";
	const isConnecting = state === "connecting";

	const statusText = isConnecting
		? "Connecting..."
		: isConnected
			? "Connected"
			: "Disconnected";

	return (
		<Tooltip label={statusText} position="right" withArrow>
			<div className="connection-status">
				{isConnecting ? (
					<Loader size={10} color="gray" />
				) : (
					<span
						className={`connection-status-dot ${isConnected ? "connected" : "disconnected"}`}
					/>
				)}
			</div>
		</Tooltip>
	);
}

function Sidebar({
	activeView,
	onViewChange,
}: {
	activeView: View;
	onViewChange: (view: View) => void;
}) {
	return (
		<aside className="sidebar">
			<header className="sidebar-header">
				<div className="sidebar-logo">
					<div className="sidebar-logo-icon">
						<Logo size={16} />
					</div>
					<span className="sidebar-title">Voice</span>
				</div>
			</header>

			<nav className="sidebar-nav">
				<NavLink
					label="Home"
					leftSection={<Home size={18} />}
					active={activeView === "home"}
					onClick={() => onViewChange("home")}
					variant="filled"
					className="sidebar-nav-link"
				/>
				<NavLink
					label="Settings"
					leftSection={<Settings size={18} />}
					active={activeView === "settings"}
					onClick={() => onViewChange("settings")}
					variant="filled"
					className="sidebar-nav-link"
				/>
			</nav>

			<footer className="sidebar-footer">
				<ConnectionStatusIndicator />
				<p className="sidebar-footer-text">v1.0.0</p>
			</footer>
		</aside>
	);
}

function HotkeyDisplay({ config }: { config: HotkeyConfig }) {
	const parts = [
		...config.modifiers.map((m) => m.charAt(0).toUpperCase() + m.slice(1)),
		config.key,
	];

	return (
		<span className="kbd-combo">
			{parts.map((part, index) => (
				<span key={part}>
					<Kbd>{part}</Kbd>
					{index < parts.length - 1 && <span className="kbd-plus">+</span>}
				</span>
			))}
		</span>
	);
}

function InstructionsCard() {
	const { data: settings } = useSettings();

	const toggleHotkey = settings?.toggle_hotkey ?? {
		modifiers: ["ctrl", "alt"],
		key: "Space",
	};

	const holdHotkey = settings?.hold_hotkey ?? {
		modifiers: ["ctrl", "alt"],
		key: "Period",
	};

	return (
		<div className="instructions-card animate-in">
			<h2 className="instructions-card-title">
				<span className="highlight">Dictate</span> with your voice
			</h2>
			<div className="instructions-methods">
				<div className="instruction-method">
					<span className="instruction-label">Toggle:</span>
					<HotkeyDisplay config={toggleHotkey} />
					<span className="instruction-desc">Press to start/stop</span>
				</div>
				<div className="instruction-method">
					<span className="instruction-label">Hold:</span>
					<HotkeyDisplay config={holdHotkey} />
					<span className="instruction-desc">Hold to record</span>
				</div>
			</div>
			<p className="instructions-card-text">
				Speak clearly and your words will be typed wherever your cursor is. The
				overlay appears in the bottom-right corner of your screen.
			</p>
		</div>
	);
}

function HomeView() {
	return (
		<div className="main-content">
			<header className="animate-in" style={{ marginBottom: 32 }}>
				<Title order={1} mb={4}>
					Welcome back
				</Title>
				<Text c="dimmed" size="sm">
					Your Tambourine history
				</Text>
			</header>

			<InstructionsCard />

			<HistoryFeed />
		</div>
	);
}

function SettingsView() {
	const { data: settings, isLoading } = useSettings();
	const { data: defaultPromptData, isLoading: isLoadingDefaultPrompt } =
		useDefaultPrompt();
	const { data: availableProviders, isLoading: isLoadingProviders } =
		useAvailableProviders();
	const { data: currentProviders } = useCurrentProviders();
	const updateSoundEnabled = useUpdateSoundEnabled();
	const updateAutoMuteAudio = useUpdateAutoMuteAudio();
	const { data: isAudioMuteSupported } = useIsAudioMuteSupported();
	const updateToggleHotkey = useUpdateToggleHotkey();
	const updateHoldHotkey = useUpdateHoldHotkey();
	const updateCleanupPrompt = useUpdateCleanupPrompt();
	const setServerPrompt = useSetServerPrompt();
	const updateSTTProvider = useUpdateSTTProvider();
	const updateLLMProvider = useUpdateLLMProvider();
	const setServerSTTProvider = useSetServerSTTProvider();
	const setServerLLMProvider = useSetServerLLMProvider();

	// Local state for the prompt textarea
	const [promptValue, setPromptValue] = useState<string>("");
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

	// Determine if we're using a custom prompt
	const hasCustomPrompt = Boolean(settings?.cleanup_prompt);

	// Sync local state with settings or default prompt when loaded
	useEffect(() => {
		if (settings !== undefined) {
			// If user has a custom prompt, show it; otherwise show default
			if (settings.cleanup_prompt) {
				setPromptValue(settings.cleanup_prompt);
			} else if (defaultPromptData?.prompt) {
				setPromptValue(defaultPromptData.prompt);
			}
			setHasUnsavedChanges(false);
		}
	}, [settings?.cleanup_prompt, defaultPromptData?.prompt, settings]);

	const handleSoundToggle = (checked: boolean) => {
		updateSoundEnabled.mutate(checked);
	};

	const handleAutoMuteToggle = (checked: boolean) => {
		updateAutoMuteAudio.mutate(checked);
	};

	const handleToggleHotkeyChange = (config: HotkeyConfig) => {
		updateToggleHotkey.mutate(config);
	};

	const handleHoldHotkeyChange = (config: HotkeyConfig) => {
		updateHoldHotkey.mutate(config);
	};

	const handlePromptChange = (value: string) => {
		setPromptValue(value);
		setHasUnsavedChanges(true);
	};

	const handleSavePrompt = () => {
		// Determine if user is saving a custom prompt or resetting to default
		const trimmedValue = promptValue.trim();
		const isDefault = trimmedValue === defaultPromptData?.prompt;

		// If the value equals default, save as null (use default)
		const promptToSave = isDefault ? null : trimmedValue || null;

		// Save to Tauri (persistence) and server (runtime)
		updateCleanupPrompt.mutate(promptToSave, {
			onSuccess: () => {
				setServerPrompt.mutate(promptToSave);
				setHasUnsavedChanges(false);
			},
		});
	};

	const handleResetPrompt = () => {
		// Reset to default prompt value
		setPromptValue(defaultPromptData?.prompt ?? "");
		// Save null to both Tauri and server
		updateCleanupPrompt.mutate(null, {
			onSuccess: () => {
				setServerPrompt.mutate(null);
				setHasUnsavedChanges(false);
			},
		});
	};

	const handleSTTProviderChange = (value: string | null) => {
		if (!value) return;
		// Save to Tauri for persistence
		updateSTTProvider.mutate(value, {
			onSuccess: () => {
				// Switch on server immediately
				setServerSTTProvider.mutate(value);
			},
		});
	};

	const handleLLMProviderChange = (value: string | null) => {
		if (!value) return;
		// Save to Tauri for persistence
		updateLLMProvider.mutate(value, {
			onSuccess: () => {
				// Switch on server immediately
				setServerLLMProvider.mutate(value);
			},
		});
	};

	// Transform provider data for Select component
	const sttProviderOptions =
		availableProviders?.stt.map((p) => ({
			value: p.value,
			label: p.label,
		})) ?? [];

	const llmProviderOptions =
		availableProviders?.llm.map((p) => ({
			value: p.value,
			label: p.label,
		})) ?? [];

	const defaultToggleHotkey: HotkeyConfig = {
		modifiers: ["ctrl", "alt"],
		key: "Space",
	};

	const defaultHoldHotkey: HotkeyConfig = {
		modifiers: ["ctrl", "alt"],
		key: "Period",
	};

	return (
		<div className="main-content">
			<header className="animate-in" style={{ marginBottom: 32 }}>
				<Title order={1} mb={4}>
					Settings
				</Title>
				<Text c="dimmed" size="sm">
					Configure your Tambourine preferences
				</Text>
			</header>

			<div className="settings-section animate-in animate-in-delay-1">
				<h3 className="settings-section-title">Providers</h3>
				<div className="settings-card">
					<div className="settings-row">
						<div>
							<p className="settings-label">Speech-to-Text</p>
							<p className="settings-description">
								Service for transcribing audio
							</p>
						</div>
						{isLoadingProviders ? (
							<Loader size="sm" color="gray" />
						) : (
							<Select
								data={sttProviderOptions}
								value={currentProviders?.stt ?? settings?.stt_provider ?? null}
								onChange={handleSTTProviderChange}
								placeholder="Select provider"
								disabled={sttProviderOptions.length === 0}
								styles={{
									input: {
										backgroundColor: "var(--bg-elevated)",
										borderColor: "var(--border-default)",
										color: "var(--text-primary)",
									},
								}}
							/>
						)}
					</div>
					<div className="settings-row" style={{ marginTop: 16 }}>
						<div>
							<p className="settings-label">Language Model</p>
							<p className="settings-description">
								AI service for text cleanup
							</p>
						</div>
						{isLoadingProviders ? (
							<Loader size="sm" color="gray" />
						) : (
							<Select
								data={llmProviderOptions}
								value={currentProviders?.llm ?? settings?.llm_provider ?? null}
								onChange={handleLLMProviderChange}
								placeholder="Select provider"
								disabled={llmProviderOptions.length === 0}
								styles={{
									input: {
										backgroundColor: "var(--bg-elevated)",
										borderColor: "var(--border-default)",
										color: "var(--text-primary)",
									},
								}}
							/>
						)}
					</div>
				</div>
			</div>

			<div className="settings-section animate-in animate-in-delay-2">
				<h3 className="settings-section-title">Audio</h3>
				<div className="settings-card">
					<DeviceSelector />
					<div className="settings-row" style={{ marginTop: 16 }}>
						<div>
							<p className="settings-label">Sound feedback</p>
							<p className="settings-description">
								Play sounds when recording starts and stops
							</p>
						</div>
						<Switch
							checked={settings?.sound_enabled ?? true}
							onChange={(event) =>
								handleSoundToggle(event.currentTarget.checked)
							}
							disabled={isLoading}
							color="gray"
							size="md"
						/>
					</div>
					<div className="settings-row" style={{ marginTop: 16 }}>
						<div>
							<p className="settings-label">Mute audio during recording</p>
							<p className="settings-description">
								Automatically mute system audio while dictating
							</p>
						</div>
						<Tooltip
							label="Not supported on this platform"
							disabled={isAudioMuteSupported !== false}
							withArrow
						>
							<Switch
								checked={settings?.auto_mute_audio ?? false}
								onChange={(event) =>
									handleAutoMuteToggle(event.currentTarget.checked)
								}
								disabled={isLoading || isAudioMuteSupported === false}
								color="gray"
								size="md"
							/>
						</Tooltip>
					</div>
				</div>
			</div>

			<div className="settings-section animate-in animate-in-delay-3">
				<h3 className="settings-section-title">Hotkeys</h3>
				<div className="settings-card">
					<HotkeyInput
						label="Toggle Recording"
						description="Press once to start recording, press again to stop"
						value={settings?.toggle_hotkey ?? defaultToggleHotkey}
						onChange={handleToggleHotkeyChange}
						disabled={isLoading}
					/>

					<div style={{ marginTop: 20 }}>
						<HotkeyInput
							label="Hold to Record"
							description="Hold to record, release to stop"
							value={settings?.hold_hotkey ?? defaultHoldHotkey}
							onChange={handleHoldHotkeyChange}
							disabled={isLoading}
						/>
					</div>
				</div>

				<Alert
					icon={<AlertCircle size={16} />}
					color="gray"
					variant="light"
					mt="md"
				>
					Hotkey changes require app restart to take effect.
				</Alert>
			</div>

			<div className="settings-section animate-in animate-in-delay-4">
				<h3 className="settings-section-title">Advanced</h3>
				<div className="settings-card">
					<Accordion variant="separated" radius="md">
						<Accordion.Item value="cleanup-prompt">
							<Accordion.Control>
								<div>
									<p className="settings-label">LLM Cleanup Prompt</p>
									<p className="settings-description">
										Customize how the AI cleans up your dictated speech
									</p>
								</div>
							</Accordion.Control>
							<Accordion.Panel>
								{isLoadingDefaultPrompt ? (
									<div
										style={{
											display: "flex",
											justifyContent: "center",
											padding: "20px",
										}}
									>
										<Loader size="sm" color="gray" />
									</div>
								) : (
									<>
										<Textarea
											placeholder="Loading default prompt..."
											value={promptValue}
											onChange={(event) =>
												handlePromptChange(event.currentTarget.value)
											}
											minRows={8}
											maxRows={20}
											autosize
											disabled={isLoading || isLoadingDefaultPrompt}
											styles={{
												input: {
													backgroundColor: "var(--bg-elevated)",
													borderColor: "var(--border-default)",
													color: "var(--text-primary)",
													fontFamily: "monospace",
													fontSize: "13px",
												},
											}}
										/>
										<div
											style={{
												display: "flex",
												gap: 12,
												marginTop: 16,
												justifyContent: "flex-end",
											}}
										>
											<Button
												variant="subtle"
												color="gray"
												onClick={handleResetPrompt}
												disabled={isLoading || !hasCustomPrompt}
											>
												Reset to Default
											</Button>
											<Button
												color="gray"
												onClick={handleSavePrompt}
												disabled={isLoading || !hasUnsavedChanges}
												loading={updateCleanupPrompt.isPending}
											>
												Save Prompt
											</Button>
										</div>
										<Text size="xs" c="dimmed" mt="sm">
											{hasCustomPrompt
												? 'Using custom prompt. Click "Reset to Default" to use the built-in prompt.'
												: "Using default prompt. Edit above to customize."}
										</Text>
									</>
								)}
							</Accordion.Panel>
						</Accordion.Item>
					</Accordion>
				</div>
			</div>
		</div>
	);
}

export default function App() {
	const [activeView, setActiveView] = useState<View>("home");

	return (
		<div className="app-layout">
			<Sidebar activeView={activeView} onViewChange={setActiveView} />
			{activeView === "home" ? <HomeView /> : <SettingsView />}
		</div>
	);
}
