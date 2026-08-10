import { Notice, TFile } from "obsidian";
import type ViewModeLockPlugin from "./main";
import type { DeviceKind } from "./settings";

export class StartupHomepageManager {
	constructor(private readonly plugin: ViewModeLockPlugin) {}

	register(): void {
		this.plugin.app.workspace.onLayoutReady(() => void this.openForStartup());
	}

	async open(device: DeviceKind, showMissingNotice = true): Promise<void> {
		const path = this.plugin.settings.startupHomepagePaths[device].trim();
		if (!path) return;
		const normalizedPath = path.endsWith(".md") ? path : `${path}.md`;
		const file = this.plugin.app.vault.getFileByPath(normalizedPath);
		if (!(file instanceof TFile)) {
			if (showMissingNotice) new Notice(`找不到主页笔记：${path}`);
			return;
		}
		await this.plugin.app.workspace.getLeaf(false).openFile(file, { active: true });
	}

	async openCurrent(): Promise<void> {
		const device = this.plugin.getCurrentDeviceKind();
		if (!this.plugin.settings.startupHomepagePaths[device].trim()) {
			new Notice("请先在插件设置中选择主页笔记");
			return;
		}
		await this.open(device);
	}

	private async openForStartup(): Promise<void> {
		const device = this.plugin.getCurrentDeviceKind();
		const path = this.plugin.settings.startupHomepagePaths[device].trim();
		if (!path) return;

		const sessionKey = `sircatx-toolkit-startup-homepage:${this.plugin.app.vault.getName()}:${device}`;
		if (window.sessionStorage.getItem(sessionKey) === "opened") return;
		window.sessionStorage.setItem(sessionKey, "opened");
		await this.open(device, false);
	}
}
