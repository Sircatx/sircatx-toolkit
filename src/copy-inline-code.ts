import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from "@codemirror/view";
import { Notice } from "obsidian";
import { getTranslations } from "./i18n";
import type ViewModeLockPlugin from "./main";

function createCopyIcon(text: string): HTMLSpanElement {
	const icon = createSpan({ cls: "copy-to-clipboard-icon icon-margin-left" });
	icon.setText("\u00a0📋");
	icon.setAttribute("aria-label", getTranslations().copyInlineCodeName);
	icon.onclick = (event) => {
		event.preventDefault();
		event.stopPropagation();
		void navigator.clipboard.writeText(text).then(() => {
			new Notice(`${getTranslations().inlineCodeCopied}${text}`, 1400);
		});
	};
	return icon;
}

class CopyWidget extends WidgetType {
	constructor(
		private readonly text: string
	) {
		super();
	}

	toDOM(): HTMLElement {
		return createCopyIcon(this.text);
	}
}

class CopyInlineCodeView {
	decorations: DecorationSet;

	constructor(private readonly view: EditorView, private readonly plugin: ViewModeLockPlugin) {
		this.decorations = this.buildDecorations();
	}

	update(update: ViewUpdate): void {
		if (update.docChanged || update.viewportChanged) this.decorations = this.buildDecorations();
	}

	private buildDecorations(): DecorationSet {
		const builder = new RangeSetBuilder<Decoration>();
		const settings = this.plugin.settings;
		if (!settings.copyInlineCodeEnabled) return builder.finish();

		for (const { from, to } of this.view.visibleRanges) {
			syntaxTree(this.view.state).iterate({
				from,
				to,
				enter: (node) => {
					if (!node.type.name.startsWith("inline-code")) return;
					const text = this.view.state.doc.sliceString(node.from, node.to);
					if (!text) return;
					builder.add(node.to + 1, node.to + 1, Decoration.widget({
						widget: new CopyWidget(text)
					}));
				}
			});
		}
		return builder.finish();
	}
}

export function registerCopyInlineCode(plugin: ViewModeLockPlugin): void {
	plugin.registerEditorExtension(ViewPlugin.define(
		(view) => new CopyInlineCodeView(view, plugin),
		{ decorations: (value) => value.decorations }
	));

	plugin.registerMarkdownPostProcessor((element) => {
		if (!plugin.settings.copyInlineCodeEnabled) return;
		for (const code of Array.from(element.querySelectorAll("*:not(pre) > code"))) {
			if (code.querySelector(".copy-to-clipboard-icon")) continue;
			const text = code.textContent ?? "";
			if (!text) continue;
			code.appendChild(createCopyIcon(text));
		}
	});
}
