import type ViewModeLockPlugin from "./main";

const LOCKED_CLASS = "sircatx-toolkit-readonly-updated-property";
const MANAGED_ATTRIBUTE = "data-sircatx-readonly";

export class UpdatedPropertyReadonlyManager {
	private observer: MutationObserver | null = null;
	private refreshQueued = false;

	constructor(private readonly plugin: ViewModeLockPlugin) {}

	register(): void {
		this.observer = new MutationObserver(() => this.queueRefresh());
		this.observer.observe(document.body, { childList: true, subtree: true });
		this.plugin.register(() => {
			this.observer?.disconnect();
			this.observer = null;
			this.unlockManagedElements();
		});
		this.refresh();
	}

	refresh(): void {
		this.refreshQueued = false;
		this.unlockManagedElements();
		if (!this.plugin.settings.noteUpdatedPropertyReadonly) return;

		const propertyName = this.plugin.settings.noteUpdatedPropertyName.trim();
		if (!propertyName) return;
		for (const row of Array.from(document.querySelectorAll<HTMLElement>(".metadata-property"))) {
			if (this.getPropertyKey(row) !== propertyName) continue;
			row.addClass(LOCKED_CLASS);
			const value = row.querySelector(".metadata-property-value");
			if (!value?.instanceOf(HTMLElement)) continue;
			value.setAttribute("aria-readonly", "true");
			value.setAttribute("title", "此属性由插件自动维护");
			for (const element of Array.from(value.querySelectorAll("input, textarea, [contenteditable]"))) {
				element.setAttribute(MANAGED_ATTRIBUTE, "true");
				if (element.instanceOf(HTMLInputElement) || element.instanceOf(HTMLTextAreaElement)) {
					element.readOnly = true;
				} else {
					element.setAttribute("contenteditable", "false");
				}
			}
		}
	}

	private queueRefresh(): void {
		if (this.refreshQueued) return;
		this.refreshQueued = true;
		window.requestAnimationFrame(() => this.refresh());
	}

	private getPropertyKey(this: void, row: HTMLElement): string {
		const dataKey = row.dataset.propertyKey ?? row.getAttribute("data-property-key");
		if (dataKey) return dataKey.trim();
		const keyInput = row.querySelector(".metadata-property-key-input");
		return keyInput?.instanceOf(HTMLInputElement) ? keyInput.value.trim() : "";
	}

	private unlockManagedElements(): void {
		for (const row of Array.from(document.querySelectorAll<HTMLElement>(`.${LOCKED_CLASS}`))) {
			row.removeClass(LOCKED_CLASS);
			const value = row.querySelector(".metadata-property-value");
			if (value?.instanceOf(HTMLElement)) {
				value.removeAttribute("aria-readonly");
				value.removeAttribute("title");
			}
		}
		for (const element of Array.from(document.querySelectorAll<HTMLElement>(`[${MANAGED_ATTRIBUTE}]`))) {
			element.removeAttribute(MANAGED_ATTRIBUTE);
			if (element.instanceOf(HTMLInputElement) || element.instanceOf(HTMLTextAreaElement)) {
				element.readOnly = false;
			} else {
				element.removeAttribute("contenteditable");
			}
		}
	}
}
