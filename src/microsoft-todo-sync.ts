import {
	Modal,
	Notice,
	Setting,
	TFile,
	normalizePath,
	requestUrl,
	type App
} from "obsidian";
import type ViewModeLockPlugin from "./main";

const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";
const SCOPES = "offline_access https://graph.microsoft.com/Tasks.ReadWrite";

interface DeviceCodeResponse {
	device_code: string;
	user_code: string;
	verification_uri: string;
	expires_in: number;
	interval: number;
}

interface TokenResponse {
	access_token?: string;
	refresh_token?: string;
	expires_in?: number;
	error?: string;
	error_description?: string;
}

interface TodoList {
	id: string;
	displayName: string;
}

interface TodoTask {
	id: string;
	title: string;
	status: string;
	importance?: string;
	dueDateTime?: { dateTime: string };
}

interface LocalTask {
	listId: string;
	taskId?: string;
	title: string;
	status: string;
}

interface GraphPage<T> {
	value: T[];
	"@odata.nextLink"?: string;
}

class DeviceCodeModal extends Modal {
	cancelled = false;
	private statusEl?: HTMLElement;

	constructor(app: App, private readonly code: DeviceCodeResponse) {
		super(app);
	}

	onOpen(): void {
		this.titleEl.setText("登录 Microsoft To Do");
		this.contentEl.createEl("p", { text: "打开登录页，然后输入下方设备代码：" });
		this.contentEl.createEl("a", {
			text: this.code.verification_uri,
			href: this.code.verification_uri
		});
		this.contentEl.createEl("p", {
			text: this.code.user_code,
			cls: "sircatx-toolkit-device-code"
		});
		new Setting(this.contentEl)
			.addButton((button) => button
				.setButtonText("复制代码")
				.onClick(async () => {
					await navigator.clipboard.writeText(this.code.user_code);
					new Notice("设备代码已复制");
				}))
			.addButton((button) => button
				.setButtonText("打开登录页")
				.setCta()
				.onClick(() => window.open(this.code.verification_uri)));
		this.statusEl = this.contentEl.createEl("p", {
			text: "正在等待登录…",
			cls: "sircatx-toolkit-todo-status"
		});
	}

	setStatus(text: string): void {
		this.statusEl?.setText(text);
	}

	onClose(): void {
		this.cancelled = true;
		this.contentEl.empty();
	}
}

export class MicrosoftTodoSyncManager {
	private syncing = false;
	private timer?: number;

	constructor(private readonly plugin: ViewModeLockPlugin) {}

	register(): void {
		this.plugin.addCommand({
			id: "sync-microsoft-todo",
			name: "同步 Microsoft To Do",
			callback: () => void this.syncNow()
		});
		this.plugin.addCommand({
			id: "sign-in-microsoft-todo",
			name: "登录 Microsoft To Do",
			callback: () => void this.signIn()
		});
		this.refresh();
		if (this.plugin.settings.microsoftTodoEnabled && this.plugin.settings.microsoftTodoRefreshToken) {
			window.setTimeout(() => void this.syncNow(true), 1500);
		}
	}

	unregister(): void {
		if (this.timer !== undefined) window.clearInterval(this.timer);
		this.timer = undefined;
	}

	refresh(): void {
		this.unregister();
		if (!this.plugin.settings.microsoftTodoEnabled) return;
		const minutes = Math.max(1, this.plugin.settings.microsoftTodoSyncIntervalMinutes || 15);
		this.timer = window.setInterval(() => void this.syncNow(true), minutes * 60 * 1000);
	}

	isConnected(): boolean {
		return Boolean(this.plugin.settings.microsoftTodoRefreshToken);
	}

	async signIn(): Promise<void> {
		const clientId = this.plugin.settings.microsoftTodoClientId.trim();
		if (!clientId) {
			new Notice("请先填写 Microsoft 应用客户端 ID");
			return;
		}
		try {
			const response = await requestUrl({
				url: `${this.authBase()}/devicecode`,
				method: "POST",
				contentType: "application/x-www-form-urlencoded",
				body: new URLSearchParams({ client_id: clientId, scope: SCOPES }).toString()
			});
			const code = response.json as DeviceCodeResponse;
			const modal = new DeviceCodeModal(this.plugin.app, code);
			modal.open();
			const deadline = Date.now() + code.expires_in * 1000;
			let intervalSeconds = Math.max(5, code.interval || 5);
			while (!modal.cancelled && Date.now() < deadline) {
				await new Promise((resolve) => window.setTimeout(resolve, intervalSeconds * 1000));
				if (modal.cancelled) return;
				const token = await this.postToken({
					grant_type: "urn:ietf:params:oauth:grant-type:device_code",
					client_id: clientId,
					device_code: code.device_code
				});
				if (token.access_token) {
					await this.storeTokens(token);
					modal.setStatus("登录成功，正在同步…");
					modal.close();
					new Notice("Microsoft To Do 登录成功");
					await this.syncNow();
					return;
				}
				if (token.error === "authorization_pending") continue;
				if (token.error === "slow_down") {
					intervalSeconds += 5;
					continue;
				}
				throw new Error(token.error_description || token.error || "登录失败");
			}
			if (!modal.cancelled) modal.setStatus("设备代码已过期，请关闭窗口后重试。");
		} catch (error) {
			new Notice(`Microsoft To Do 登录失败：${this.errorMessage(error)}`, 8000);
		}
	}

	async signOut(): Promise<void> {
		this.plugin.settings.microsoftTodoAccessToken = "";
		this.plugin.settings.microsoftTodoRefreshToken = "";
		this.plugin.settings.microsoftTodoAccessTokenExpiresAt = 0;
		await this.plugin.saveSettings();
		new Notice("已清除本机 Microsoft 登录信息");
	}

	async syncNow(silent = false): Promise<void> {
		if (this.syncing) return;
		if (!this.plugin.settings.microsoftTodoEnabled) {
			if (!silent) new Notice("请先在 Sircatx Toolkit 设置中启用 Microsoft To Do 同步");
			return;
		}
		if (!this.plugin.settings.microsoftTodoClientId.trim() || !this.isConnected()) {
			if (!silent) new Notice("请先登录 Microsoft To Do");
			return;
		}
		this.syncing = true;
		try {
			const token = await this.accessToken();
			const lists = await this.graphAll<TodoList>("/me/todo/lists", token);
			const tasksByList = new Map<string, TodoTask[]>();
			for (const list of lists) {
				tasksByList.set(list.id, await this.graphAll<TodoTask>(
					`/me/todo/lists/${encodeURIComponent(list.id)}/tasks`,
					token
				));
			}
			const localTasks = await this.readLocalTasks();
			let pushedCount = 0;
			let conflictCount = 0;
			for (const local of localTasks) {
				const remoteTasks = tasksByList.get(local.listId);
				if (!remoteTasks) continue;
				if (!local.taskId) {
					const created = await this.graphWrite<TodoTask>(
						`/me/todo/lists/${encodeURIComponent(local.listId)}/tasks`,
						"POST",
						{ title: local.title, status: local.status },
						token
					);
					remoteTasks.push(created);
					pushedCount += 1;
					continue;
				}
				const remote = remoteTasks.find((task) => task.id === local.taskId);
				const snapshot = this.plugin.settings.microsoftTodoSnapshot[local.taskId];
				if (!remote || !snapshot) continue;
				const localChanged = local.title !== snapshot.title || local.status !== snapshot.status;
				if (!localChanged) continue;
				const remoteChanged = remote.title !== snapshot.title || remote.status !== snapshot.status;
				if (remoteChanged) conflictCount += 1;
				const updated = await this.graphWrite<TodoTask>(
					`/me/todo/lists/${encodeURIComponent(local.listId)}/tasks/${encodeURIComponent(local.taskId)}`,
					"PATCH",
					{ title: local.title, status: local.status },
					token
				);
				Object.assign(remote, updated);
				pushedCount += 1;
			}
			const sections: string[] = [];
			let taskCount = 0;
			for (const list of lists) {
				const tasks = tasksByList.get(list.id) ?? [];
				const visible = this.plugin.settings.microsoftTodoIncludeCompleted
					? tasks
					: tasks.filter((task) => task.status !== "completed");
				taskCount += visible.length;
				sections.push(this.renderList(list, visible));
			}
			const now = new Date();
			const markdown = [
				`> 最后同步：${now.toLocaleString()}  ·  清单 ${lists.length}  ·  任务 ${taskCount}`,
				"",
				"<!-- 可修改任务标题、勾选状态或在对应清单下新增任务；删除行不会删除 Microsoft To Do 任务。 -->",
				"",
				...sections
			].join("\n").trimEnd() + "\n";
			await this.writeOutput(markdown);
			this.plugin.settings.microsoftTodoLastSyncAt = now.getTime();
			this.plugin.settings.microsoftTodoSnapshot = this.createSnapshot(tasksByList);
			await this.plugin.saveSettings();
			if (!silent) {
				const pushed = pushedCount ? `，回写 ${pushedCount} 项` : "";
				const conflicts = conflictCount ? `，${conflictCount} 项冲突采用 Obsidian 版本` : "";
				new Notice(`Microsoft To Do 已同步：${taskCount} 个任务${pushed}${conflicts}`);
			}
		} catch (error) {
			new Notice(`Microsoft To Do 同步失败：${this.errorMessage(error)}`, 10000);
		} finally {
			this.syncing = false;
		}
	}

	private authBase(): string {
		const tenant = this.plugin.settings.microsoftTodoTenant.trim() || "common";
		return `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0`;
	}

	private async postToken(fields: Record<string, string>): Promise<TokenResponse> {
		const response = await requestUrl({
			url: `${this.authBase()}/token`,
			method: "POST",
			contentType: "application/x-www-form-urlencoded",
			body: new URLSearchParams(fields).toString(),
			throw: false
		});
		return response.json as TokenResponse;
	}

	private async storeTokens(token: TokenResponse): Promise<void> {
		if (!token.access_token) throw new Error("登录响应缺少访问令牌");
		this.plugin.settings.microsoftTodoAccessToken = token.access_token;
		if (token.refresh_token) this.plugin.settings.microsoftTodoRefreshToken = token.refresh_token;
		this.plugin.settings.microsoftTodoAccessTokenExpiresAt = Date.now()
			+ Math.max(60, token.expires_in || 3600) * 1000;
		await this.plugin.saveSettings();
	}

	private async accessToken(): Promise<string> {
		const settings = this.plugin.settings;
		if (settings.microsoftTodoAccessToken
			&& Date.now() < settings.microsoftTodoAccessTokenExpiresAt - 60_000) {
			return settings.microsoftTodoAccessToken;
		}
		if (!settings.microsoftTodoRefreshToken) throw new Error("尚未登录 Microsoft To Do");
		const token = await this.postToken({
			client_id: settings.microsoftTodoClientId.trim(),
			grant_type: "refresh_token",
			refresh_token: settings.microsoftTodoRefreshToken,
			scope: SCOPES
		});
		if (!token.access_token) {
			throw new Error(token.error_description || token.error || "刷新登录状态失败，请重新登录");
		}
		await this.storeTokens(token);
		return token.access_token;
	}

	private async graphAll<T>(pathOrUrl: string, token: string): Promise<T[]> {
		const all: T[] = [];
		let next: string | undefined = pathOrUrl.startsWith("https://")
			? pathOrUrl
			: `${GRAPH_ROOT}${pathOrUrl}`;
		while (next) {
			const response = await requestUrl({
				url: next,
				headers: { Authorization: `Bearer ${token}` }
			});
			const page = response.json as GraphPage<T>;
			all.push(...page.value);
			next = page["@odata.nextLink"];
		}
		return all;
	}

	private async graphWrite<T>(
		path: string,
		method: "POST" | "PATCH",
		body: Record<string, string>,
		token: string
	): Promise<T> {
		const response = await requestUrl({
			url: `${GRAPH_ROOT}${path}`,
			method,
			contentType: "application/json",
			headers: { Authorization: `Bearer ${token}` },
			body: JSON.stringify(body)
		});
		return response.json as T;
	}

	private async readLocalTasks(): Promise<LocalTask[]> {
		if (!this.plugin.settings.microsoftTodoLastSyncAt) return [];
		const path = this.outputPath();
		const file = this.plugin.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) return [];
		const content = await this.plugin.app.vault.read(file);
		const tasks: LocalTask[] = [];
		let listId: string | undefined;
		for (const line of content.split(/\r?\n/)) {
			const listMatch = line.match(/^<!-- ms-todo-list:(.+) -->$/);
			if (listMatch?.[1]) {
				listId = decodeURIComponent(listMatch[1]);
				continue;
			}
			if (!listId) continue;
			const mapped = line.match(/^- \[([ xX])\]\s+(.*?)\s+<!-- ms-todo-task:(.+?) -->(?:\s|$)/);
			if (mapped?.[2] && mapped[3]) {
				const taskId = decodeURIComponent(mapped[3]);
				const previousStatus = this.plugin.settings.microsoftTodoSnapshot[taskId]?.status;
				tasks.push({
					listId,
					taskId,
					title: this.unescapeMarkdown(mapped[2].trim()),
					status: mapped[1].toLowerCase() === "x"
						? "completed"
						: previousStatus && previousStatus !== "completed" ? previousStatus : "notStarted"
				});
				continue;
			}
			const added = line.match(/^- \[([ xX])\]\s+(.+?)\s*$/);
			if (added?.[2] && !line.includes("ms-todo-task:")) {
				tasks.push({
					listId,
					title: added[2].trim(),
					status: added[1].toLowerCase() === "x" ? "completed" : "notStarted"
				});
			}
		}
		return tasks;
	}

	private createSnapshot(tasksByList: Map<string, TodoTask[]>): Record<string, {
		listId: string;
		title: string;
		status: string;
	}> {
		const snapshot: Record<string, { listId: string; title: string; status: string }> = {};
		for (const [listId, tasks] of tasksByList) {
			for (const task of tasks) {
				snapshot[task.id] = { listId, title: task.title, status: task.status };
			}
		}
		return snapshot;
	}

	private renderList(list: TodoList, tasks: TodoTask[]): string {
		const lines = [
			`## ${this.escapeMarkdown(list.displayName)}`,
			`<!-- ms-todo-list:${encodeURIComponent(list.id)} -->`,
			""
		];
		if (!tasks.length) return [...lines, "_暂无任务_", ""].join("\n");
		const sorted = [...tasks].sort((a, b) => {
			if (a.status === "completed" && b.status !== "completed") return 1;
			if (a.status !== "completed" && b.status === "completed") return -1;
			return (a.dueDateTime?.dateTime || "9999").localeCompare(b.dueDateTime?.dateTime || "9999");
		});
		for (const task of sorted) {
			const checkbox = task.status === "completed" ? "x" : " ";
			const due = task.dueDateTime?.dateTime ? ` 📅 ${task.dueDateTime.dateTime.slice(0, 10)}` : "";
			const important = task.importance === "high" ? " ❗" : "";
			lines.push(`- [${checkbox}] ${this.escapeMarkdown(task.title)} <!-- ms-todo-task:${encodeURIComponent(task.id)} -->${important}${due}`);
		}
		return [...lines, ""].join("\n");
	}

	private escapeMarkdown(text: string): string {
		return text.replace(/[\\`*_[\]<>]/g, "\\$&").replace(/\r?\n/g, " ");
	}

	private unescapeMarkdown(text: string): string {
		return text.replace(/\\([\\`*_[\]<>])/g, "$1");
	}

	private async writeOutput(content: string): Promise<void> {
		const path = this.outputPath();
		const segments = path.split("/");
		segments.pop();
		let current = "";
		for (const segment of segments) {
			current = current ? `${current}/${segment}` : segment;
			if (!this.plugin.app.vault.getAbstractFileByPath(current)) {
				await this.plugin.app.vault.createFolder(current);
			}
		}
		const existing = this.plugin.app.vault.getAbstractFileByPath(path);
		if (existing instanceof TFile) await this.plugin.app.vault.modify(existing, content);
		else if (existing) throw new Error(`输出路径不是 Markdown 文件：${path}`);
		else await this.plugin.app.vault.create(path, content);
	}

	private outputPath(): string {
		let path = normalizePath(this.plugin.settings.microsoftTodoOutputPath.trim() || "Microsoft To Do/Microsoft To Do.md");
		if (!path.toLowerCase().endsWith(".md")) path += ".md";
		return path;
	}

	private errorMessage(error: unknown): string {
		return error instanceof Error ? error.message : String(error);
	}
}
