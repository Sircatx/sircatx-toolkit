import { MarkdownView, TFile } from "obsidian";
import type ViewModeLockPlugin from "./main";

const UPDATE_DELAY_MS = 30_000;

export class NoteUpdatedPropertyManager {
	private readonly timers = new Map<string, number>();
	private readonly writing = new Set<string>();

	constructor(private readonly plugin: ViewModeLockPlugin) {}

	register(): void {
		this.plugin.registerEvent(this.plugin.app.workspace.on("editor-change", (_editor, info) => {
			const file = info.file;
			if (!(file instanceof TFile) || file.extension !== "md") return;
			if (!this.plugin.settings.noteUpdatedPropertyEnabled) return;
			if (this.writing.has(file.path)) return;
			this.schedule(file);
		}));
		this.plugin.register(() => this.clear());
	}

	refresh(): void {
		if (!this.plugin.settings.noteUpdatedPropertyEnabled) this.clearTimers();
	}

	private schedule(file: TFile): void {
		const existing = this.timers.get(file.path);
		if (existing !== undefined) window.clearTimeout(existing);
		const timer = window.setTimeout(() => {
			this.timers.delete(file.path);
			void this.writeTimestamp(file);
		}, UPDATE_DELAY_MS);
		this.timers.set(file.path, timer);
	}

	private async writeTimestamp(file: TFile): Promise<void> {
		if (!this.plugin.settings.noteUpdatedPropertyEnabled) return;
		const activeFile = this.plugin.app.workspace.getActiveViewOfType(MarkdownView)?.file;
		if (activeFile?.path !== file.path) return;

		const property = this.plugin.settings.noteUpdatedPropertyName.trim();
		if (!property) return;
		const value = this.formatLocalDate(new Date());
		this.writing.add(file.path);
		try {
			await this.plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
				const properties = frontmatter as Record<string, unknown>;
				if (properties[property] !== value) properties[property] = value;
			});
		} finally {
			window.setTimeout(() => this.writing.delete(file.path), 500);
		}
	}

	private formatLocalDate(this: void, date: Date): string {
		const pad = (value: number): string => String(value).padStart(2, "0");
		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
	}

	private clearTimers(): void {
		for (const timer of this.timers.values()) window.clearTimeout(timer);
		this.timers.clear();
	}

	private clear(): void {
		this.clearTimers();
		this.writing.clear();
	}
}
