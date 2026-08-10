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
				callback: () => void this.open(page.path)
			});
			this.commandIds.add(commandId);

			const ribbonElement = this.plugin.addRibbonIcon("file-text", label, () => void this.open(page.path));
			this.ribbonElements.add(ribbonElement);
		}
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
