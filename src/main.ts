import { getAllTags, MarkdownView, Notice, Platform, Plugin, TFile, type CachedMetadata } from "obsidian";
import { getTranslations } from "./i18n";
import { registerCopyInlineCode } from "./copy-inline-code";
import { NoteUpdatedPropertyManager } from "./note-updated-property";
import { UpdatedPropertyReadonlyManager } from "./updated-property-readonly";
import { StartupHomepageManager } from "./startup-homepage";
import {
	DEFAULT_SETTINGS,
	type DeviceKind,
	type DevicePolicy,
	type LockRule,
	type ViewModeLockMode,
	type ViewModeLockSettings,
	ViewModeLockSettingTab
} from "./settings";

type LockDecision = ViewModeLockMode | "none";

export default class ViewModeLockPlugin extends Plugin {
	settings: ViewModeLockSettings = DEFAULT_SETTINGS;
	readonly noteUpdatedProperty = new NoteUpdatedPropertyManager(this);
	readonly updatedPropertyReadonly = new UpdatedPropertyReadonlyManager(this);
	readonly startupHomepage = new StartupHomepageManager(this);
	private enforceQueued = false;
	private readonly metadataSuggestions = new Map<string, CachedMetadata>();
	private suggestionIndexReady = false;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new ViewModeLockSettingTab(this.app, this));
		registerCopyInlineCode(this);
		this.noteUpdatedProperty.register();
		this.updatedPropertyReadonly.register();
		this.startupHomepage.register();
		const translations = getTranslations();

		this.addCommand({
			id: "toggle-current-note-lock",
			name: translations.commandToggleCurrent,
			checkCallback: (checking) => {
				const file = this.getActiveMarkdownFile();
				if (!file) return false;
				if (!checking) void this.toggleCurrentNoteLock(file);
				return true;
			}
		});

		this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.queueEnforcement()));
		this.registerEvent(this.app.workspace.on("layout-change", () => this.queueEnforcement()));
		this.registerEvent(this.app.metadataCache.on("changed", (file, _data, cache) => {
			this.metadataSuggestions.set(file.path, cache);
			if (file === this.getActiveMarkdownFile()) this.queueEnforcement();
		}));
		this.registerEvent(this.app.metadataCache.on("deleted", (file) => {
			this.metadataSuggestions.delete(file.path);
		}));
		this.registerEvent(this.app.metadataCache.on("resolved", () => {
			if (this.suggestionIndexReady) this.rebuildSuggestionIndex();
		}));
		this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
			const cached = this.metadataSuggestions.get(oldPath);
			this.metadataSuggestions.delete(oldPath);
			if (cached && file instanceof TFile) this.metadataSuggestions.set(file.path, cached);
		}));

		this.app.workspace.onLayoutReady(() => this.queueEnforcement());
	}

	async loadSettings(): Promise<void> {
		const stored = await this.loadData() as Partial<ViewModeLockSettings> | null;
		this.settings = {
			...DEFAULT_SETTINGS,
			...stored,
			devicePolicies: {
				desktop: this.normalizeDevicePolicy(stored?.devicePolicies?.desktop),
				mobile: this.normalizeDevicePolicy(stored?.devicePolicies?.mobile)
			},
			startupHomepagePaths: {
				desktop: stored?.startupHomepagePaths?.desktop?.trim() ?? "",
				mobile: stored?.startupHomepagePaths?.mobile?.trim() ?? ""
			},
			overrideProperty: !stored?.overrideProperty?.trim() || stored.overrideProperty.trim() === "阅读模式锁定"
				? DEFAULT_SETTINGS.overrideProperty
				: stored.overrideProperty.trim(),
			noteUpdatedPropertyName: !stored?.noteUpdatedPropertyName?.trim() || stored.noteUpdatedPropertyName.trim() === "最后更新时间"
				? DEFAULT_SETTINGS.noteUpdatedPropertyName
				: stored.noteUpdatedPropertyName.trim(),
			rules: Array.isArray(stored?.rules) ? stored.rules.filter(this.isValidRule).map((rule) => ({
				...rule,
				mode: rule.mode ?? "reading"
			})) : []
		};
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	async enforceActiveView(): Promise<void> {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (view) await this.enforceView(view);
	}

	private queueEnforcement(): void {
		if (this.enforceQueued) return;
		this.enforceQueued = true;
		window.setTimeout(() => {
			this.enforceQueued = false;
			void this.enforceActiveView();
		}, 0);
	}

	private async enforceView(view: MarkdownView): Promise<void> {
		if (!view.file) return;

		const decision = this.getDecision(view.file);
		if (decision === "none" || this.isAlreadyInMode(view, decision)) return;

		const state = view.getState();
		await view.setState({ ...state, ...this.toViewState(decision) }, { history: false });
	}

	private isAlreadyInMode(view: MarkdownView, decision: ViewModeLockMode): boolean {
		if (decision === "reading") return view.getMode() === "preview";
		if (view.getMode() !== "source") return false;
		const state = view.getState();
		return decision === "source" ? state.source === true : state.source !== true;
	}

	private toViewState(mode: ViewModeLockMode): Record<string, unknown> {
		switch (mode) {
			case "reading":
				return { mode: "preview" };
			case "live-preview":
				return { mode: "source", source: false };
			case "source":
				return { mode: "source", source: true };
		}
	}

	private getDecision(file: TFile): LockDecision {
		const devicePolicy = this.settings.devicePolicies[this.getCurrentDeviceKind()];
		if (devicePolicy === "force-reading") return "reading";
		if (devicePolicy === "disable-lock") return "none";
		return this.getRulesDecision(file);
	}

	private getRulesDecision(file: TFile): LockDecision {
		const frontmatter = this.toRecord(this.app.metadataCache.getFileCache(file)?.frontmatter);
		const override = frontmatter?.[this.settings.overrideProperty];

		if (typeof override === "string") {
			const normalized = override.trim().toLowerCase();
			if (normalized === "是" || normalized === "reading") return "reading";
		}

		const matchingRule = this.settings.rules.find((rule) => this.ruleMatches(rule, file, frontmatter));
		if (matchingRule) return matchingRule.mode;
		return "none";
	}

	private isValidRule(this: void, rule: unknown): rule is LockRule {
		if (!rule || typeof rule !== "object") return false;
		const candidate = rule as Partial<LockRule>;
		return typeof candidate.id === "string"
			&& typeof candidate.enabled === "boolean"
			&& (candidate.kind === "folder" || candidate.kind === "tag" || candidate.kind === "property")
			&& typeof candidate.pattern === "string"
			&& typeof candidate.value === "string"
			&& (candidate.mode === undefined || candidate.mode === "reading" || candidate.mode === "live-preview" || candidate.mode === "source");
	}

	private ruleMatches(rule: LockRule, file: TFile, frontmatter: Record<string, unknown> | undefined): boolean {
		if (!rule.enabled || !rule.pattern.trim()) return false;
		const pattern = rule.pattern.trim();

		if (rule.kind === "folder") {
			const folder = pattern.replace(/^\/+|\/+$/g, "");
			return file.path.startsWith(`${folder}/`);
		}

		if (rule.kind === "tag") {
			const expected = `#${pattern.replace(/^#+/, "").toLowerCase()}`;
			const cache = this.app.metadataCache.getFileCache(file);
			return (cache ? getAllTags(cache) : null)?.some((tag) => tag.toLowerCase() === expected) ?? false;
		}

		const actual = frontmatter?.[pattern];
		if (actual === undefined || rule.value.trim() === "") return false;
		const expected = rule.value.trim().toLowerCase();
		const values = Array.isArray(actual) ? actual : [actual];
		return values.some((value) => String(value).trim().toLowerCase() === expected);
	}

	private getActiveMarkdownFile(): TFile | null {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		return view?.file ?? null;
	}

	private normalizeDevicePolicy(this: void, value: unknown): DevicePolicy {
		return value === "force-reading" || value === "disable-lock" || value === "follow-rules"
			? value
			: "follow-rules";
	}

	getCurrentDeviceKind(): DeviceKind {
		if (Platform.isMobileApp) return "mobile";
		return "desktop";
	}

	private toRecord(this: void, value: unknown): Record<string, unknown> | undefined {
		return value !== null && typeof value === "object"
			? value as Record<string, unknown>
			: undefined;
	}

	getSuggestionCatalog(): {
		folders: string[];
		markdownFiles: string[];
		tags: string[];
		properties: string[];
		propertyValues: Map<string, string[]>;
	} {
		this.ensureSuggestionIndex();
		const activeFile = this.getActiveMarkdownFile();
		if (activeFile) {
			const activeCache = this.app.metadataCache.getFileCache(activeFile);
			if (activeCache) this.metadataSuggestions.set(activeFile.path, activeCache);
		}

		const tags = new Set<string>();
		const properties = new Set<string>();
		const propertyValues = new Map<string, Set<string>>();
		for (const rule of this.settings.rules) {
			if (rule.kind === "tag" && rule.pattern) tags.add(rule.pattern.replace(/^#/, ""));
			if (rule.kind === "property" && rule.pattern) {
				properties.add(rule.pattern);
				if (rule.value) {
					const values = propertyValues.get(rule.pattern) ?? new Set<string>();
					values.add(rule.value);
					propertyValues.set(rule.pattern, values);
				}
			}
		}

		for (const cache of this.metadataSuggestions.values()) {
			for (const tag of getAllTags(cache) ?? []) tags.add(tag.replace(/^#/, ""));
			for (const [key, rawValue] of Object.entries(cache.frontmatter ?? {})) {
				if (key === "position") continue;
				properties.add(key);
				for (const value of Array.isArray(rawValue) ? rawValue : [rawValue]) {
					if (value === null || value === undefined || typeof value === "object") continue;
					const text = String(value).trim();
					if (!text) continue;
					const values = propertyValues.get(key) ?? new Set<string>();
					values.add(text);
					propertyValues.set(key, values);
				}
			}
		}

		return {
			folders: this.app.vault.getAllFolders().map((folder) => folder.path).filter(Boolean).sort(),
			markdownFiles: this.app.vault.getMarkdownFiles().map((file) => file.path).sort(),
			tags: [...tags].sort(),
			properties: [...properties].sort(),
			propertyValues: new Map([...propertyValues].map(([key, values]) => [key, [...values].sort()]))
		};
	}

	private ensureSuggestionIndex(): void {
		if (this.suggestionIndexReady) return;
		this.suggestionIndexReady = true;
		this.rebuildSuggestionIndex();
	}

	private rebuildSuggestionIndex(): void {
		// This runs only when suggestions are first requested (and once more if
		// Obsidian finishes resolving metadata afterward). Note contents are not read.
		this.metadataSuggestions.clear();
		for (const file of this.app.vault.getMarkdownFiles()) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (cache) this.metadataSuggestions.set(file.path, cache);
		}
	}

	private async toggleCurrentNoteLock(file: TFile): Promise<void> {
		const translations = getTranslations();
		const enable = this.getRulesDecision(file) !== "reading";
		await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
			const properties = this.toRecord(frontmatter);
			if (!properties) return;
			if (enable) properties[this.settings.overrideProperty] = "是";
			else delete properties[this.settings.overrideProperty];
		});

		const devicePolicy = this.settings.devicePolicies[this.getCurrentDeviceKind()];
		new Notice(devicePolicy === "follow-rules"
			? enable ? translations.noteLockEnabled : translations.noteLockDisabled
			: translations.noteSettingSavedDeviceOverride);
		await this.enforceActiveView();
	}

}
