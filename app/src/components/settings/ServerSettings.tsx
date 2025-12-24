import { Button, TextInput } from "@mantine/core";
import { useState } from "react";
import { useSettings, useUpdateServerUrl } from "../../lib/queries";
import { DEFAULT_SERVER_URL } from "../../lib/tauri";

export function ServerSettings() {
	const { data: settings, isLoading } = useSettings();
	const updateServerUrl = useUpdateServerUrl();
	const [localUrl, setLocalUrl] = useState<string | null>(null);

	// Use local state if user is editing, otherwise use saved value
	const displayUrl = localUrl ?? settings?.server_url ?? DEFAULT_SERVER_URL;
	const hasChanges = localUrl !== null && localUrl !== settings?.server_url;

	const handleSave = () => {
		if (localUrl) {
			updateServerUrl.mutate(localUrl, {
				onSuccess: () => {
					setLocalUrl(null);
				},
			});
		}
	};

	const handleReset = () => {
		updateServerUrl.mutate(DEFAULT_SERVER_URL, {
			onSuccess: () => {
				setLocalUrl(null);
			},
		});
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && hasChanges) {
			handleSave();
		}
	};

	return (
		<div className="settings-section animate-in animate-in-delay-4">
			<h3 className="settings-section-title">Server</h3>
			<div className="settings-card">
				<div
					className="settings-row"
					style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}
				>
					<div>
						<p className="settings-label">Server URL</p>
						<p className="settings-description">
							The URL of the Tambourine server to connect to
						</p>
					</div>
					<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
						<TextInput
							value={displayUrl}
							onChange={(e) => setLocalUrl(e.currentTarget.value)}
							onKeyDown={handleKeyDown}
							placeholder={DEFAULT_SERVER_URL}
							disabled={isLoading}
							style={{ flex: 1 }}
							styles={{
								input: {
									fontFamily: "monospace",
									fontSize: "13px",
								},
							}}
						/>
						{hasChanges && (
							<Button
								onClick={handleSave}
								loading={updateServerUrl.isPending}
								size="sm"
								color="gray"
							>
								Save
							</Button>
						)}
						{settings?.server_url !== DEFAULT_SERVER_URL && !hasChanges && (
							<Button
								onClick={handleReset}
								loading={updateServerUrl.isPending}
								size="sm"
								variant="subtle"
								color="gray"
							>
								Reset
							</Button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
