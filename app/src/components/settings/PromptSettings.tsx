import { Accordion, Loader } from "@mantine/core";
import { useEffect, useState } from "react";
import {
	useDefaultSections,
	useSetServerPromptSections,
	useSettings,
	useUpdateCleanupPromptSections,
} from "../../lib/queries";
import type { CleanupPromptSections } from "../../lib/tauri";
import { PromptSectionEditor } from "./PromptSectionEditor";

const DEFAULT_SECTIONS: CleanupPromptSections = {
	main: { enabled: true, content: null },
	advanced: { enabled: true, content: null },
	dictionary: { enabled: false, content: null },
};

export function PromptSettings() {
	const { data: settings } = useSettings();
	const { data: defaultSections, isLoading: isLoadingDefaultSections } =
		useDefaultSections();
	const updateCleanupPromptSections = useUpdateCleanupPromptSections();
	const setServerPromptSections = useSetServerPromptSections();

	// Local state for enabled flags (content is managed by PromptSectionEditor)
	const [mainEnabled, setMainEnabled] = useState(true);
	const [advancedEnabled, setAdvancedEnabled] = useState(true);
	const [dictionaryEnabled, setDictionaryEnabled] = useState(false);

	// Content state for initializing editors (synced from settings)
	const [mainContent, setMainContent] = useState<string>("");
	const [advancedContent, setAdvancedContent] = useState<string>("");
	const [dictionaryContent, setDictionaryContent] = useState<string>("");

	// Track if each section has custom content
	const mainHasCustom = Boolean(
		settings?.cleanup_prompt_sections?.main?.content,
	);
	const advancedHasCustom = Boolean(
		settings?.cleanup_prompt_sections?.advanced?.content,
	);
	const dictionaryHasCustom = Boolean(
		settings?.cleanup_prompt_sections?.dictionary?.content,
	);

	// Sync local state with settings when loaded
	useEffect(() => {
		if (settings !== undefined && defaultSections !== undefined) {
			const sections = settings.cleanup_prompt_sections ?? DEFAULT_SECTIONS;

			setMainEnabled(sections.main.enabled);
			setMainContent(sections.main.content ?? defaultSections.main);

			setAdvancedEnabled(sections.advanced.enabled);
			setAdvancedContent(sections.advanced.content ?? defaultSections.advanced);

			setDictionaryEnabled(sections.dictionary.enabled);
			setDictionaryContent(
				sections.dictionary.content ?? defaultSections.dictionary,
			);
		}
	}, [settings, defaultSections]);

	// Helper to build sections object from current state
	const buildSections = (overrides?: {
		mainEnabled?: boolean;
		mainContent?: string | null;
		advancedEnabled?: boolean;
		advancedContent?: string | null;
		dictionaryEnabled?: boolean;
		dictionaryContent?: string | null;
	}): CleanupPromptSections => {
		const currentMainContent = overrides?.mainContent ?? mainContent;
		const currentAdvancedContent =
			overrides?.advancedContent ?? advancedContent;
		const currentDictionaryContent =
			overrides?.dictionaryContent ?? dictionaryContent;

		return {
			main: {
				enabled: overrides?.mainEnabled ?? mainEnabled,
				content:
					currentMainContent === defaultSections?.main
						? null
						: currentMainContent || null,
			},
			advanced: {
				enabled: overrides?.advancedEnabled ?? advancedEnabled,
				content:
					currentAdvancedContent === defaultSections?.advanced
						? null
						: currentAdvancedContent || null,
			},
			dictionary: {
				enabled: overrides?.dictionaryEnabled ?? dictionaryEnabled,
				content:
					currentDictionaryContent === defaultSections?.dictionary
						? null
						: currentDictionaryContent || null,
			},
		};
	};

	// Save all sections to both Tauri and server
	const saveAllSections = (sections: CleanupPromptSections) => {
		updateCleanupPromptSections.mutate(sections, {
			onSuccess: () => {
				setServerPromptSections.mutate(sections);
			},
		});
	};

	// Toggle handlers - save immediately when toggling
	const handleMainToggle = (checked: boolean) => {
		setMainEnabled(checked);
		saveAllSections(buildSections({ mainEnabled: checked }));
	};

	const handleAdvancedToggle = (checked: boolean) => {
		setAdvancedEnabled(checked);
		saveAllSections(buildSections({ advancedEnabled: checked }));
	};

	const handleDictionaryToggle = (checked: boolean) => {
		setDictionaryEnabled(checked);
		saveAllSections(buildSections({ dictionaryEnabled: checked }));
	};

	// Save handlers
	const handleSaveMain = (content: string) => {
		setMainContent(content);
		saveAllSections(buildSections({ mainContent: content }));
	};

	const handleSaveAdvanced = (content: string) => {
		setAdvancedContent(content);
		saveAllSections(buildSections({ advancedContent: content }));
	};

	const handleSaveDictionary = (content: string) => {
		setDictionaryContent(content);
		saveAllSections(buildSections({ dictionaryContent: content }));
	};

	// Reset handlers
	const handleResetMain = () => {
		const defaultContent = defaultSections?.main ?? "";
		setMainContent(defaultContent);
		saveAllSections(buildSections({ mainContent: null }));
	};

	const handleResetAdvanced = () => {
		const defaultContent = defaultSections?.advanced ?? "";
		setAdvancedContent(defaultContent);
		saveAllSections(buildSections({ advancedContent: null }));
	};

	const handleResetDictionary = () => {
		const defaultContent = defaultSections?.dictionary ?? "";
		setDictionaryContent(defaultContent);
		saveAllSections(buildSections({ dictionaryContent: null }));
	};

	return (
		<div className="settings-section animate-in animate-in-delay-4">
			<h3 className="settings-section-title">LLM Cleanup Prompt</h3>
			<div className="settings-card">
				{isLoadingDefaultSections ? (
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
					<Accordion variant="separated" radius="md">
						<PromptSectionEditor
							sectionKey="main-prompt"
							title="Core Cleanup Rules"
							description="Filler word removal, grammar, punctuation commands"
							enabled={mainEnabled}
							initialContent={mainContent}
							defaultContent={defaultSections?.main ?? ""}
							hasCustom={mainHasCustom}
							onToggle={handleMainToggle}
							onSave={handleSaveMain}
							onReset={handleResetMain}
							isSaving={updateCleanupPromptSections.isPending}
						/>

						<PromptSectionEditor
							sectionKey="advanced-prompt"
							title="Advanced Features"
							description='Backtrack corrections ("scratch that") and list formatting'
							enabled={advancedEnabled}
							initialContent={advancedContent}
							defaultContent={defaultSections?.advanced ?? ""}
							hasCustom={advancedHasCustom}
							onToggle={handleAdvancedToggle}
							onSave={handleSaveAdvanced}
							onReset={handleResetAdvanced}
							isSaving={updateCleanupPromptSections.isPending}
						/>

						<PromptSectionEditor
							sectionKey="dictionary-prompt"
							title="Personal Dictionary"
							description="Custom word mappings for technical terms"
							enabled={dictionaryEnabled}
							initialContent={dictionaryContent}
							defaultContent={defaultSections?.dictionary ?? ""}
							hasCustom={dictionaryHasCustom}
							onToggle={handleDictionaryToggle}
							onSave={handleSaveDictionary}
							onReset={handleResetDictionary}
							isSaving={updateCleanupPromptSections.isPending}
						/>
					</Accordion>
				)}
			</div>
		</div>
	);
}
