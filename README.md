# Sircatx Toolkit

English | [简体中文](#简体中文)

A modular toolkit that combines small, independently configurable note enhancements.

## Features

### Inline code copy

- Shows a 📋 icon after inline code in Reading view and Live Preview.
- Copies the inline code text when the icon is clicked.
- Does not affect fenced code blocks.

### Reading mode lock

- Configures separate behavior for desktop and mobile devices.
- Locks notes by folder, tag, or property rules.
- Enables Reading view lock for an individual note with a configurable property.
- Suggests existing folders, tags, properties, and property values while editing rules.

### Note updated time

- Maintains an `更新时间` property for the active Markdown note.
- Adds the property automatically when a Markdown note is created, with a setting to disable this behavior.
- Can make the managed value read-only in the Properties UI while still allowing source-mode YAML editing.
- Writes the local time 30 seconds after editing stops.
- Uses the `YYYY-MM-DD HH:mm` format without scanning the vault.
- Can be disabled and the property name can be changed in settings.

## Usage

Open **Settings → Sircatx Toolkit** after installing and enabling the plugin.

Device behavior has the highest priority:

- **Follow existing rules** applies the note-level override and matching rules.
- **Always use Reading view** forces every note into Reading view on that device.
- **Disable locking** allows view modes to be changed freely on that device.

### Note-level override

Add the `阅读模式锁定` property to a note:

```yaml
阅读模式锁定: reading
```

Supported values are `是` and `reading`. Both lock the note in Reading view. The property name can be changed in plugin settings.

### Rule priority

1. Device behavior
2. Note-level override
3. Folder, tag, or property rule

## Manual installation

Copy `main.js`, `manifest.json`, and `styles.css` into `.obsidian/plugins/sircatx-toolkit/`. Reload the app, then enable **Sircatx Toolkit** under Community plugins.

## Development

```bash
npm install
npm run build
npm run lint
```

## License

MIT. The reading-mode lock implementation is derived from GOODJINC's View Mode Lock and retains the original license attribution.

## 简体中文

一款原生中文、可持续扩展的工具箱，各项功能可独立配置。

### 功能

- 在阅读视图和实时预览的行内代码后显示 📋，点击即可复制，代码块不受影响。
- 分别设置桌面端和移动端的阅读模式锁定行为。
- 按文件夹、标签或属性值建立锁定规则。
- 使用 `阅读模式锁定: 是` 或 `阅读模式锁定: reading` 为单篇笔记启用阅读模式锁定。
- 输入规则时自动提示现有文件夹、标签、属性及属性值。
- 停止编辑 30 秒后，自动维护当前笔记的 `更新时间` 属性，格式为 `YYYY-MM-DD HH:mm`。
- 新建 Markdown 笔记时自动添加该属性，可在设置中关闭。
- 可禁止在笔记属性界面中手动修改更新时间；源码模式仍可编辑 YAML。

安装后打开 **设置 → Sircatx Toolkit** 进行配置。请勿同时启用功能重复的独立插件。
