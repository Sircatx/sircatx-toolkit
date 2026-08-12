import {
	AbstractInputSuggest,
	App,
	FuzzySuggestModal,
	PluginSettingTab,
	Setting,
	TFile,
	type SettingDefinition,
	type SettingDefinitionItem
} from "obsidian";
import { getTranslations } from "./i18n";
import type ViewModeLockPlugin from "./main";

export interface ViewModeLockSettings {
	/** Platform-specific behavior evaluated before note and general rules. */
	devicePolicies: Record<DeviceKind, DevicePolicy>;
	/** Frontmatter field reserved for explicit per-note policy overrides. */
	overrideProperty: string;
	/** Ordered rules. The first matching rule determines the view mode. */
	rules: LockRule[];
	/** Copies inline code when it is clicked in a Markdown view. */
	copyInlineCodeEnabled: boolean;
	/** Maintains a last-updated property after the user stops editing. */
	noteUpdatedPropertyEnabled: boolean;
	/** Frontmatter property used for the last-updated timestamp. */
	noteUpdatedPropertyName: string;
	/** Adds the updated-time property when a Markdown note is created. */
	addUpdatedPropertyToNewNotes: boolean;
	/** Prevents editing the managed property through the Properties UI. */
	noteUpdatedPropertyReadonly: boolean;
	/** Startup note selected independently for desktop and mobile. */
	startupHomepagePaths: Record<DeviceKind, string>;
	/** Notes exposed as device-specific ribbon shortcuts. */
	quickPages: QuickPage[];
	/** Searches note titles and cached properties without reading note bodies. */
	quickSearchEnabled: boolean;
	/** Redirects the mobile navbar search action to Quick search. */
	quickSearchReplaceMobileNavbar: boolean;
	/** Enables bidirectional synchronization with Microsoft To Do. */
	microsoftTodoEnabled: boolean;
	microsoftTodoClientId: string;
	microsoftTodoTenant: string;
	microsoftTodoOutputPath: string;
	microsoftTodoSyncIntervalMinutes: number;
	microsoftTodoIncludeCompleted: boolean;
	microsoftTodoRefreshToken: string;
	microsoftTodoAccessToken: string;
	microsoftTodoAccessTokenExpiresAt: number;
	microsoftTodoLastSyncAt: number;
	microsoftTodoSnapshot: Record<string, MicrosoftTodoSnapshot>;
}

export interface MicrosoftTodoSnapshot {
	listId: string;
	title: string;
	status: string;
}

export type LockRuleKind = "folder" | "tag" | "property";
export type ViewModeLockMode = "reading" | "live-preview" | "source";
export type DeviceKind = "desktop" | "mobile";
export type DevicePolicy = "follow-rules" | "force-reading" | "disable-lock";

export interface QuickPage {
	id: string;
	path: string;
	/** Legacy field used only while migrating pre-1.8.1 settings. */
	device?: DeviceKind;
}

export interface LockRule {
	id: string;
	enabled: boolean;
	kind: LockRuleKind;
	/** Folder path, tag name, or frontmatter property name. */
	pattern: string;
	/** Required only by property rules. */
	value: string;
	/** View mode applied when this rule matches. */
	mode: ViewModeLockMode;
}

export interface SuggestionCatalog {
	folders: string[];
	tags: string[];
	properties: string[];
	propertyValues: Map<string, string[]>;
}

export const DEFAULT_SETTINGS: ViewModeLockSettings = {
	devicePolicies: {
		desktop: "follow-rules",
		mobile: "follow-rules"
	},
	overrideProperty: "阅读模式",
	rules: [],
	copyInlineCodeEnabled: true,
	noteUpdatedPropertyEnabled: true,
	noteUpdatedPropertyName: "更新时间",
	addUpdatedPropertyToNewNotes: true,
	noteUpdatedPropertyReadonly: true,
	startupHomepagePaths: {
		desktop: "",
		mobile: ""
	},
	quickPages: [],
	quickSearchEnabled: true,
	quickSearchReplaceMobileNavbar: false,
	microsoftTodoEnabled: false,
	microsoftTodoClientId: "595668c0-ff94-4974-a0ea-a43c377cf347",
	microsoftTodoTenant: "common",
	microsoftTodoOutputPath: "Microsoft To Do/Microsoft To Do.md",
	microsoftTodoSyncIntervalMinutes: 15,
	microsoftTodoIncludeCompleted: false,
	microsoftTodoRefreshToken: "",
	microsoftTodoAccessToken: "",
	microsoftTodoAccessTokenExpiresAt: 0,
	microsoftTodoLastSyncAt: 0,
	microsoftTodoSnapshot: {}
};

class ValueSuggest extends AbstractInputSuggest<string> {
	constructor(
		app: App,
		inputEl: HTMLInputElement,
		private readonly candidates: string[] | (() => string[]),
		private readonly onChoose: (value: string) => void
	) {
		super(app, inputEl);
		this.limit = Number.POSITIVE_INFINITY;
	}

	getSuggestions(query: string): string[] {
		const normalized = query.trim().toLowerCase();
		const candidates = typeof this.candidates === "function" ? this.candidates() : this.candidates;
		return normalized
			? candidates.filter((candidate) => candidate.toLowerCase().includes(normalized))
			: candidates;
	}

	renderSuggestion(value: string, el: HTMLElement): void {
		el.setText(value);
	}

	selectSuggestion(value: string): void {
		this.setValue(value);
		this.onChoose(value);
		this.close();
	}
}

class HomepageNoteModal extends FuzzySuggestModal<TFile> {
	constructor(app: App, private readonly onChoose: (file: TFile) => void) {
		super(app);
		this.inputEl.placeholder = "搜索主页笔记";
	}

	getItems(): TFile[] {
		return this.app.vault.getMarkdownFiles();
	}

	getItemText(file: TFile): string {
		return file.path;
	}

	onChooseItem(file: TFile): void {
		this.onChoose(file);
	}
}

class OutputNoteModal extends FuzzySuggestModal<TFile> {
	constructor(app: App, private readonly onChoose: (file: TFile) => void) {
		super(app);
		this.inputEl.placeholder = "搜索同步笔记";
	}

	getItems(): TFile[] {
		return this.app.vault.getMarkdownFiles()
			.sort((a, b) => a.path.localeCompare(b.path));
	}

	getItemText(file: TFile): string {
		return file.path;
	}

	onChooseItem(file: TFile): void {
		this.onChoose(file);
	}
}

export class ViewModeLockSettingTab extends PluginSettingTab {
	constructor(app: App, private readonly plugin: ViewModeLockPlugin) {
		super(app, plugin);
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		const translations = getTranslations();
		const catalog = this.plugin.getSuggestionCatalog();
		const ruleItems: SettingDefinition[] = this.plugin.settings.rules.map((rule, index) => ({
			name: translations.rule(index + 1),
			desc: rule.enabled ? translations.enabled : translations.disabled,
			aliases: [translations.folder, translations.tag, translations.property],
			render: (setting) => {
				this.renderRule(setting, rule, catalog);
				setting.addExtraButton((button) => button
					.setIcon("trash-2")
					.setTooltip(translations.disabled)
					.onClick(() => void this.deleteRule(index)));
			}
		}));
		const displayedRuleItems: SettingDefinition[] = [
			...ruleItems,
			{
				name: translations.newRuleDesc,
				searchable: false,
				render: (setting) => {
					setting.addExtraButton((button) => button
						.setIcon("plus")
						.setTooltip(translations.addRule)
						.onClick(() => void this.addRule()));
				}
			}
		];

		return [
			{
				type: "group",
				heading: "Microsoft To Do 同步",
				cls: "sircatx-toolkit-module-group",
				items: [{
					name: "启用 Microsoft To Do 同步",
					desc: "同步任务状态、标题和新增任务；从 Markdown 删除任务不会删除云端任务。",
					render: (setting) => setting.addToggle((toggle) => toggle
						.setValue(this.plugin.settings.microsoftTodoEnabled)
						.onChange(async (value) => {
							this.plugin.settings.microsoftTodoEnabled = value;
							await this.plugin.saveSettings();
							this.plugin.microsoftTodoSync.refresh();
							if (value) void this.plugin.microsoftTodoSync.syncNow(true);
							this.refreshSettings();
						}))
				}, {
					name: "输出文件",
					desc: "可手动输入路径，或点击笔记按钮选择已有 Markdown 文件。同步会整体重写所选文件。",
					render: (setting) => {
						setting.addText((text) => text
							.setValue(this.plugin.settings.microsoftTodoOutputPath)
							.setDisabled(!this.plugin.settings.microsoftTodoEnabled)
							.onChange(async (value) => {
								this.plugin.settings.microsoftTodoOutputPath = value;
								await this.plugin.saveSettings();
							}));
						setting.addExtraButton((button) => button
							.setIcon("file-search")
							.setTooltip("选择同步笔记")
							.setDisabled(!this.plugin.settings.microsoftTodoEnabled)
							.onClick(() => new OutputNoteModal(this.app, (file) => {
								this.plugin.settings.microsoftTodoOutputPath = file.path;
								void this.plugin.saveSettings().then(() => this.refreshSettings());
							}).open()));
				}
				}, {
					name: "同步间隔（分钟）",
					desc: "最小 1 分钟，修改后立即生效。",
					render: (setting) => setting.addText((text) => text
						.setValue(String(this.plugin.settings.microsoftTodoSyncIntervalMinutes))
						.setDisabled(!this.plugin.settings.microsoftTodoEnabled)
						.onChange(async (value) => {
							const parsed = Number.parseInt(value, 10);
							if (!Number.isFinite(parsed)) return;
							this.plugin.settings.microsoftTodoSyncIntervalMinutes = Math.max(1, parsed);
							await this.plugin.saveSettings();
							this.plugin.microsoftTodoSync.refresh();
						}))
				}, {
					name: "显示已完成任务",
					desc: "默认关闭；开启后会同时显示 Microsoft To Do 中已完成的任务。",
					render: (setting) => setting.addToggle((toggle) => toggle
						.setValue(this.plugin.settings.microsoftTodoIncludeCompleted)
						.setDisabled(!this.plugin.settings.microsoftTodoEnabled)
						.onChange(async (value) => {
							this.plugin.settings.microsoftTodoIncludeCompleted = value;
							await this.plugin.saveSettings();
							if (this.plugin.microsoftTodoSync.isConnected()) {
								await this.plugin.microsoftTodoSync.syncNow(true);
							}
						}))
				}, {
					name: this.plugin.microsoftTodoSync.isConnected() ? "Microsoft 账户已连接" : "连接 Microsoft 账户",
					desc: this.plugin.settings.microsoftTodoLastSyncAt
						? `上次成功同步：${new Date(this.plugin.settings.microsoftTodoLastSyncAt).toLocaleString()}`
						: "点击登录并按提示授权即可；令牌保存在本机插件数据中。",
					render: (setting) => {
						setting.addButton((button) => button
							.setButtonText(this.plugin.microsoftTodoSync.isConnected() ? "重新登录" : "登录")
							.setDisabled(!this.plugin.settings.microsoftTodoEnabled)
							.setCta()
							.onClick(() => void this.plugin.microsoftTodoSync.signIn()));
						setting.addButton((button) => button
							.setButtonText("退出")
							.setDisabled(!this.plugin.microsoftTodoSync.isConnected())
							.onClick(async () => {
								await this.plugin.microsoftTodoSync.signOut();
								this.refreshSettings();
							}));
					}
				}, {
					name: "立即同步",
					desc: "先回写 Obsidian 中的修改，再读取 Microsoft To Do 的当前状态。",
					render: (setting) => setting.addButton((button) => button
						.setButtonText("同步")
						.setDisabled(!this.plugin.settings.microsoftTodoEnabled || !this.plugin.microsoftTodoSync.isConnected())
						.onClick(() => void this.plugin.microsoftTodoSync.syncNow()))
				}]
			},
			{
				type: "group",
				heading: translations.quickSearchHeading,
				cls: "sircatx-toolkit-module-group",
				items: [{
					name: translations.quickSearchEnabled,
					desc: translations.quickSearchEnabledDesc,
					render: (setting) => {
						setting.addToggle((toggle) => toggle
							.setValue(this.plugin.settings.quickSearchEnabled)
							.onChange(async (value) => {
								this.plugin.settings.quickSearchEnabled = value;
								await this.plugin.saveSettings();
							}));
					}
				}, {
					name: translations.quickSearchReplaceMobileNavbar,
					desc: translations.quickSearchReplaceMobileNavbarDesc,
					render: (setting) => {
						setting.addToggle((toggle) => toggle
							.setValue(this.plugin.settings.quickSearchReplaceMobileNavbar)
							.setDisabled(!this.plugin.settings.quickSearchEnabled)
							.onChange(async (value) => {
								this.plugin.settings.quickSearchReplaceMobileNavbar = value;
								await this.plugin.saveSettings();
							}));
					}
				}]
			},
			{
				type: "group",
				heading: translations.startupHomepageHeading,
				cls: "sircatx-toolkit-module-group",
				items: (["desktop", "mobile"] as const).map((device): SettingDefinition => ({
					name: translations[`${device}Homepage`],
					desc: translations[`${device}HomepageDesc`],
					render: (setting) => {
						setting.addText((input) => {
							input
								.setPlaceholder(translations.chooseHomepage)
								.setValue(this.plugin.settings.startupHomepagePaths[device])
								.onChange(async (value) => {
									this.plugin.settings.startupHomepagePaths[device] = value.trim();
									await this.plugin.saveSettings();
								});
							input.inputEl.addEventListener("click", () => {
								new HomepageNoteModal(this.app, (file) => {
									input.setValue(file.path);
									this.plugin.settings.startupHomepagePaths[device] = file.path;
									void this.plugin.saveSettings();
								}).open();
							});
						});
						setting.addExtraButton((button) => button
							.setIcon("home")
							.setTooltip(translations.openHomepageNow)
							.onClick(() => void this.plugin.startupHomepage.open(device)));
					}
				}))
			},
			{
				type: "group",
				heading: translations.quickPagesHeading,
				cls: "sircatx-toolkit-module-group",
				items: [
				{
					name: translations.quickPagesName,
					desc: translations.quickPagesDesc
				},
				...this.plugin.settings.quickPages.map((page, index): SettingDefinition => ({
					name: page.path
						? page.path.replace(/\.md$/i, "").split("/").pop() ?? translations.quickPage(index + 1)
						: translations.quickPage(index + 1),
					desc: page.path || translations.chooseQuickPage,
					render: (setting) => {
						setting.settingEl.addClass("view-mode-lock-rule-card");
						setting.addText((input) => {
							input.setPlaceholder(translations.chooseQuickPage).setValue(page.path);
							input.inputEl.readOnly = true;
							input.inputEl.addEventListener("click", () => {
								new HomepageNoteModal(this.app, (file) => {
									page.path = file.path;
									input.setValue(file.path);
									void this.plugin.saveSettings().then(() => {
										this.plugin.quickPages.refresh();
										this.refreshSettings();
									});
								}).open();
							});
						});
						setting.addExtraButton((button) => button
							.setIcon("trash-2")
							.setTooltip(translations.deleteQuickPage)
							.onClick(() => void this.deleteQuickPage(index)));
					}
				})),
				{
					name: translations.addQuickPageDesc,
					searchable: false,
					render: (setting) => {
						setting.addExtraButton((button) => button
							.setIcon("plus")
							.setTooltip(translations.addQuickPage)
							.onClick(() => void this.addQuickPage()));
					}
				}
				]
			},
			{
				type: "group",
				heading: translations.copyInlineCodeHeading,
				cls: "sircatx-toolkit-module-group",
				items: [{
					name: translations.copyInlineCodeName,
					desc: translations.copyInlineCodeDesc,
					render: (setting) => {
						setting.addToggle((toggle) =>
							toggle.setValue(this.plugin.settings.copyInlineCodeEnabled).onChange(async (value) => {
								this.plugin.settings.copyInlineCodeEnabled = value;
								await this.plugin.saveSettings();
							})
						);
					}
				}]
			},
			{
				type: "group",
				heading: translations.noteUpdatedHeading,
				cls: "sircatx-toolkit-module-group",
				items: [{
					name: translations.noteUpdatedEnabled,
					desc: translations.noteUpdatedEnabledDesc,
					render: (setting) => {
						setting.addToggle((toggle) => toggle
							.setValue(this.plugin.settings.noteUpdatedPropertyEnabled)
							.onChange(async (value) => {
								this.plugin.settings.noteUpdatedPropertyEnabled = value;
								await this.plugin.saveSettings();
								this.plugin.noteUpdatedProperty.refresh();
							}));
					}
				}, {
					name: translations.noteUpdatedNewNotes,
					desc: translations.noteUpdatedNewNotesDesc,
					render: (setting) => {
						setting.addToggle((toggle) => toggle
							.setValue(this.plugin.settings.addUpdatedPropertyToNewNotes)
							.onChange(async (value) => {
								this.plugin.settings.addUpdatedPropertyToNewNotes = value;
								await this.plugin.saveSettings();
							}));
					}
				}, {
					name: translations.noteUpdatedReadonly,
					desc: translations.noteUpdatedReadonlyDesc,
					render: (setting) => {
						setting.addToggle((toggle) => toggle
							.setValue(this.plugin.settings.noteUpdatedPropertyReadonly)
							.onChange(async (value) => {
								this.plugin.settings.noteUpdatedPropertyReadonly = value;
								await this.plugin.saveSettings();
								this.plugin.updatedPropertyReadonly.refresh();
							}));
					}
				}, {
					name: translations.noteUpdatedPropertyName,
					desc: translations.noteUpdatedPropertyNameDesc,
					render: (setting) => {
						setting.addText((text) => text
							.setPlaceholder(DEFAULT_SETTINGS.noteUpdatedPropertyName)
							.setValue(this.plugin.settings.noteUpdatedPropertyName)
							.onChange(async (value) => {
								this.plugin.settings.noteUpdatedPropertyName = value.trim() || DEFAULT_SETTINGS.noteUpdatedPropertyName;
								await this.plugin.saveSettings();
								this.plugin.updatedPropertyReadonly.refresh();
							}));
					}
				}]
			},
			{
				type: "group",
				heading: translations.viewModeLockModuleHeading,
				cls: "sircatx-toolkit-module-group",
				items: [{
				name: translations.deviceBehaviorHeading,
				desc: translations.deviceBehaviorDesc,
				render: (setting) => {
					setting.setHeading();
				}
			},
			...(["desktop", "mobile"] as const).map((device): SettingDefinition => ({
				name: translations[device],
				desc: translations[`${device}Desc`],
				render: (setting) => this.addDevicePolicyControl(setting, device)
			})),
			{
				name: translations.overrideName,
				desc: translations.overrideDesc,
				render: (setting) => {
					setting.settingEl.addClass("view-mode-lock-override-property");
					setting.addText((text) =>
						text
							.setPlaceholder(DEFAULT_SETTINGS.overrideProperty)
							.setValue(this.plugin.settings.overrideProperty)
							.onChange(async (value) => {
								const property = value.trim();
								this.plugin.settings.overrideProperty = property || DEFAULT_SETTINGS.overrideProperty;
								await this.plugin.saveSettings();
								await this.plugin.enforceActiveView();
							})
					);
				}
			},
			{
				name: translations.rulesHeading,
				desc: translations.rulesDesc,
				render: (setting) => {
					setting.setHeading();
				}
			},
			...displayedRuleItems]
			}
		];
	}

	private renderRule(
		setting: Setting,
		rule: LockRule,
		catalog: SuggestionCatalog
	): () => void {
		const translations = getTranslations();
		const suggestions: ValueSuggest[] = [];
		setting.settingEl.addClass("view-mode-lock-rule-card");

		setting.addToggle((toggle) =>
			toggle.setValue(rule.enabled).onChange(async (value) => {
				rule.enabled = value;
				await this.saveRules();
				this.refreshSettings();
			})
		);
		setting.addDropdown((dropdown) =>
			dropdown
				.addOption("folder", translations.folder)
				.addOption("tag", translations.tag)
				.addOption("property", translations.property)
				.setValue(rule.kind)
				.onChange(async (value) => {
					rule.kind = value as LockRuleKind;
					await this.saveRules();
					this.refreshSettings();
				})
		);
		setting.addDropdown((dropdown) =>
			dropdown
				.addOption("reading", translations.reading)
				.addOption("live-preview", translations.livePreview)
				.addOption("source", translations.source)
				.setValue(rule.mode)
				.onChange(async (value) => {
					rule.mode = value as ViewModeLockMode;
					await this.saveRules();
				})
		);

		const fields = setting.settingEl.createDiv({ cls: "view-mode-lock-rule-fields" });
		const patternLabels = {
			folder: [translations.folder, translations.folderDesc],
			tag: [translations.tag, translations.tagDesc],
			property: [translations.propertyName, translations.propertyNameDesc]
		} as const;
		const patternSetting = new Setting(fields)
			.setName(patternLabels[rule.kind][0])
			.setDesc(patternLabels[rule.kind][1]);
		patternSetting.addText((text) => {
			text
				.setPlaceholder(rule.kind === "folder"
					? translations.chooseFolder
					: rule.kind === "tag" ? translations.chooseTag : translations.chooseProperty)
				.setValue(rule.pattern)
				.onChange(async (value) => {
					rule.pattern = value.trim();
					await this.saveRules();
				});
			const candidates = rule.kind === "folder"
				? catalog.folders
				: rule.kind === "tag" ? catalog.tags : catalog.properties;
			suggestions.push(new ValueSuggest(this.app, text.inputEl, candidates, (value) => {
				rule.pattern = value;
				void this.saveRules();
			}));
		});

		if (rule.kind === "property") {
			const valueSetting = new Setting(fields)
				.setName(translations.propertyValue)
				.setDesc(translations.propertyValueDesc);
			valueSetting.addText((text) => {
				text
					.setPlaceholder(translations.chooseOrEnterValue)
					.setValue(rule.value)
					.onChange(async (value) => {
						rule.value = value.trim();
						await this.saveRules();
					});
				suggestions.push(new ValueSuggest(
					this.app,
					text.inputEl,
					() => catalog.propertyValues.get(rule.pattern) ?? [],
					(value) => {
						rule.value = value;
						void this.saveRules();
					}
				));
			});
		}

		return () => {
			for (const suggestion of suggestions) suggestion.close();
		};
	}

	private refreshSettings(): void {
		this.update();
	}


	private addDevicePolicyControl(setting: Setting, device: DeviceKind): void {
		const translations = getTranslations();
		setting.addDropdown((dropdown) =>
			dropdown
				.addOption("follow-rules", translations.followRules)
				.addOption("force-reading", translations.forceReading)
				.addOption("disable-lock", translations.disableLock)
				.setValue(this.plugin.settings.devicePolicies[device])
				.onChange(async (value) => {
					this.plugin.settings.devicePolicies[device] = value as DevicePolicy;
					await this.plugin.saveSettings();
					await this.plugin.enforceActiveView();
				})
		);
	}

	private async addRule(): Promise<void> {
		this.plugin.settings.rules.push({
			id: crypto.randomUUID(),
			enabled: true,
			kind: "folder",
			pattern: "",
			value: "",
			mode: "reading"
		});
		await this.saveRules();
		this.refreshSettings();
	}

	private async addQuickPage(): Promise<void> {
		this.plugin.settings.quickPages.push({
			id: crypto.randomUUID(),
			path: ""
		});
		await this.plugin.saveSettings();
		this.refreshSettings();
	}

	private async deleteQuickPage(index: number): Promise<void> {
		this.plugin.settings.quickPages.splice(index, 1);
		await this.plugin.saveSettings();
		this.plugin.quickPages.refresh();
		this.refreshSettings();
	}

	private async deleteRule(index: number): Promise<void> {
		this.plugin.settings.rules.splice(index, 1);
		await this.saveRules();
		this.refreshSettings();
	}

	private async saveRules(): Promise<void> {
		await this.plugin.saveSettings();
		await this.plugin.enforceActiveView();
	}
}
