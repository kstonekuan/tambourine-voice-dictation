import { ActionIcon, Button } from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import { Copy, MessageSquare, Trash2 } from "lucide-react";
import {
	useClearHistory,
	useDeleteHistoryEntry,
	useHistory,
} from "../lib/queries";

function formatTime(timestamp: string): string {
	const date = new Date(timestamp);
	return date.toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: true,
	});
}

function formatDate(timestamp: string): string {
	const date = new Date(timestamp);
	const today = new Date();
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);

	if (date.toDateString() === today.toDateString()) {
		return "Today";
	}
	if (date.toDateString() === yesterday.toDateString()) {
		return "Yesterday";
	}
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

interface GroupedHistory {
	date: string;
	items: Array<{
		id: string;
		text: string;
		timestamp: string;
	}>;
}

function groupHistoryByDate(
	history: Array<{ id: string; text: string; timestamp: string }>,
): GroupedHistory[] {
	const groups: Record<string, GroupedHistory> = {};

	for (const item of history) {
		const dateKey = formatDate(item.timestamp);
		if (!groups[dateKey]) {
			groups[dateKey] = { date: dateKey, items: [] };
		}
		groups[dateKey].items.push(item);
	}

	return Object.values(groups);
}

export function HistoryFeed() {
	const { data: history, isLoading, error } = useHistory(100);
	const deleteEntry = useDeleteHistoryEntry();
	const clearHistory = useClearHistory();
	const clipboard = useClipboard();

	const handleDelete = (id: string) => {
		deleteEntry.mutate(id);
	};

	const handleClearAll = () => {
		if (window.confirm("Are you sure you want to clear all history?")) {
			clearHistory.mutate();
		}
	};

	if (isLoading) {
		return (
			<div className="animate-in animate-in-delay-2">
				<div className="section-header">
					<span className="section-title">History</span>
				</div>
				<div className="empty-state">
					<p className="empty-state-text">Loading history...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="animate-in animate-in-delay-2">
				<div className="section-header">
					<span className="section-title">History</span>
				</div>
				<div className="empty-state">
					<p className="empty-state-text" style={{ color: "#ef4444" }}>
						Failed to load history
					</p>
				</div>
			</div>
		);
	}

	if (!history || history.length === 0) {
		return (
			<div className="animate-in animate-in-delay-2">
				<div className="section-header">
					<span className="section-title">History</span>
				</div>
				<div className="empty-state">
					<MessageSquare className="empty-state-icon" />
					<h4 className="empty-state-title">No dictation history yet</h4>
					<p className="empty-state-text">
						Your transcribed text will appear here after you use voice
						dictation.
					</p>
				</div>
			</div>
		);
	}

	const groupedHistory = groupHistoryByDate(history);

	return (
		<div className="animate-in animate-in-delay-2">
			<div className="section-header">
				<span className="section-title">History</span>
				<Button
					variant="subtle"
					size="compact-sm"
					color="gray"
					onClick={handleClearAll}
					disabled={clearHistory.isPending}
				>
					Clear All
				</Button>
			</div>

			{groupedHistory.map((group) => (
				<div key={group.date} style={{ marginBottom: 24 }}>
					<p
						className="section-title"
						style={{ marginBottom: 12, fontSize: 11 }}
					>
						{group.date}
					</p>
					<div className="history-feed">
						{group.items.map((entry) => (
							<div key={entry.id} className="history-item">
								<span className="history-time">
									{formatTime(entry.timestamp)}
								</span>
								<p className="history-text">{entry.text}</p>
								<div className="history-actions">
									<ActionIcon
										variant="subtle"
										size="sm"
										color="gray"
										onClick={() => clipboard.copy(entry.text)}
										title="Copy to clipboard"
									>
										<Copy size={14} />
									</ActionIcon>
									<ActionIcon
										variant="subtle"
										size="sm"
										color="red"
										onClick={() => handleDelete(entry.id)}
										title="Delete"
										disabled={deleteEntry.isPending}
									>
										<Trash2 size={14} />
									</ActionIcon>
								</div>
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
}
