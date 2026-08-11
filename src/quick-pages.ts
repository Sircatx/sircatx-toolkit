import { Notice, TFile } from "obsidian";
import type ViewModeLockPlugin from "./main";

export class QuickPagesManager {
	private readonly commandIds = new Set<string>();
	private readonly ribbonElements = new Set<HTMLElement>();

	constructor(private readonly plugin: ViewModeLockPlugin) {}

	register(): void {
		this.refresh();
	}

	refresh(): void {
		const hadRegisteredEntries = this.commandIds.size > 0 || this.ribbonElements.size > 0;
		for (const commandId of this.commandIds) this.plugin.removeCommand(commandId);
		for (const ribbonElement of this.ribbonElements) ribbonElement.remove();
		this.commandIds.clear();
		this.ribbonElements.clear();

		if (this.plugin.getCurrentDeviceKind() !== "mobile") return;
		for (const page of this.plugin.settings.quickPages) {
			if (!page.path.trim()) continue;
			const label = page.path.replace(/\.md$/i, "").split("/").pop() ?? page.path;
			const commandId = `open-quick-page-${page.id}`;
			this.plugin.addCommand({
				id: commandId,
				name: `打开快捷页面：${label}`,
				callback: () => void this.openConfigured(page.id)
			});
			this.commandIds.add(commandId);

			const ribbonElement = this.plugin.addRibbonIcon("file-text", label, () => void this.openConfigured(page.id));
			this.ribbonElements.add(ribbonElement);
		}

		if (hadRegisteredEntries) this.plugin.app.workspace.trigger("layout-change");
	}

	private async openConfigured(id: string): Promise<void> {
		const page = this.plugin.settings.quickPages.find((candidate) => candidate.id === id);
		if (!page?.path.trim()) return;
		await this.open(page.path);
	}

	private async open(path: string): Promise<void> {
		const normalizedPath = path.endsWith(".md") ? path : `${path}.md`;
		const file = this.plugin.app.vault.getFileByPath(normalizedPath);
		if (!(file instanceof TFile)) {
			new Notice(`找不到快捷页面：${path}`);
			return;
		}
		await this.plugin.app.workspace.getLeaf(false).openFile(file, { active: true });
	}
}
