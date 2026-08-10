import { FuzzySuggestModal, Notice, TFile } from "obsidian";
import { getTranslations } from "./i18n";
import type ViewModeLockPlugin from "./main";

interface QuickSearchItem {
	file: TFile;
	searchText: string;
}

const MAX_PROPERTY_VALUE_LENGTH = 200;

class QuickSearchModal extends FuzzySuggestModal<QuickSearchItem> {
	constructor(private readonly plugin: ViewModeLockPlugin) {
		super(plugin.app);
		this.inputEl.placeholder = getTranslations().quickSearchPlaceholder;
	}

	getItems(): QuickSearchItem[] {
		return this.plugin.app.vault.getMarkdownFiles().map((file) => {
			const frontmatter = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
			const propertyParts: string[] = [];
			const aliases: string[] = [];

			for (const [key, rawValue] of Object.entries(frontmatter)) {
				if (key === "position" || rawValue === null || rawValue === undefined) continue;
				propertyParts.push(key);
				const values = Array.isArray(rawValue) ? rawValue : [rawValue];
				for (const value of values) {
					if (typeof value === "object") continue;
					const text = String(value).trim().slice(0, MAX_PROPERTY_VALUE_LENGTH);
					if (!text) continue;
					propertyParts.push(text);
					if (key === "aliases" || key === "alias") aliases.push(text);
				}
			}

			const pinyinSource = [file.basename, ...aliases].join(" ");
			const keys = this.plugin.getPinyinSearchKeys(pinyinSource);
			return {
				file,
				searchText: [file.basename, ...propertyParts, keys.fullPinyin, keys.initials]
					.join(" ")
					.toLowerCase()
			};
		});
	}

	getItemText(item: QuickSearchItem): string {
		return item.searchText;
	}

	renderSuggestion(match: { item: QuickSearchItem }, el: HTMLElement): void {
		el.createDiv({ cls: "suggestion-title", text: match.item.file.basename });
		el.createDiv({ cls: "suggestion-note", text: match.item.file.path });
	}

	onChooseItem(item: QuickSearchItem): void {
		void this.plugin.app.workspace.getLeaf(false).openFile(item.file, { active: true });
	}
}

export class QuickSearchManager {
	constructor(private readonly plugin: ViewModeLockPlugin) {}

	open(): void {
		if (!this.plugin.settings.quickSearchEnabled) {
			new Notice(getTranslations().quickSearchDisabledNotice);
			return;
		}
		new QuickSearchModal(this.plugin).open();
	}
}
