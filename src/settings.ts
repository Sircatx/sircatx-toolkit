import {
	AbstractInputSuggest,
	App,
	PluginSettingTab,
	Setting,
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
}

export type LockRuleKind = "folder" | "tag" | "property";
export type ViewModeLockMode = "reading" | "live-preview" | "source";
export type DeviceKind = "desktop" | "mobile";
export type DevicePolicy = "follow-rules" | "force-reading" | "disable-lock";

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
	overrideProperty: "阅读模式锁定",
	rules: [],
	copyInlineCodeEnabled: true
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
