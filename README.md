# Sircatx Toolkit

English | [简体中文](#简体中文)

A modular Obsidian toolkit for startup and quick pages, quick search, inline code copying, updated-time properties, and reading mode locks. Every feature is independently configurable on desktop and mobile where applicable.

## Features

### Startup homepage

- Selects separate startup notes for desktop and mobile devices.
- Opens the configured note once after the workspace is ready.
- Clicking the input opens a searchable note picker. A My homepage ribbon action is available on desktop and in the mobile shortcuts menu.
- Leaving a device path empty disables the feature on that device.
- Adds any number of Quick pages to the mobile function area. Desktop shortcuts are not created.
- My homepage continues to open the configured startup homepage directly.
- Exposes offline filename search keys for Chinese full-pinyin and pinyin-initial matching, powered by `pinyin-pro`. Note contents are never scanned.

### Quick search

- Searches note titles and cached note properties across the vault without reading note bodies.
- Supports ordinary fuzzy matching; titles and aliases also support Chinese full pinyin and pinyin initials.
- Opens from the command palette or the search ribbon action and can be disabled in settings.
- An optional, disabled-by-default setting redirects the mobile bottom search button to Quick search; turning it off restores Obsidian's native full-text search.
- Ignores Obsidian's internal `position` metadata and limits each indexed property value to 200 characters.

### Microsoft To Do sync

- Bidirectionally syncs task completion, titles, and newly added Markdown tasks.
- Uses Microsoft device-code login and the delegated `Tasks.ReadWrite` permission.
- The shared public-client application is built in; users only need to click Login and authorize their Microsoft account.
- Completed tasks are hidden by default and can be shown again from the plugin settings.
- Deleting a Markdown task does not delete its Microsoft To Do counterpart.
- The Azure free-account 30-day credit period does not require a plugin or client-ID update. The integration uses no paid Azure resources and has no client secret to renew.
- Access tokens are refreshed automatically. If Microsoft revokes the authorization or the refresh token is inactive for about 90 days, click Login again.

To start syncing, open **Settings → Sircatx Toolkit**, enable Microsoft To Do sync, and click **Login**. The plugin writes the synchronized lists to `Microsoft To Do/Microsoft To Do.md` by default. The file name provides the page title, so the generated Markdown does not repeat it as a heading.

The output path can be typed manually or selected from existing Markdown notes with the note button in settings. The selected note is completely rewritten during synchronization.

Embed all synchronized tasks in another note with `![[Microsoft To Do/Microsoft To Do]]`. To embed only one To Do list, use its generated heading, for example `![[Microsoft To Do/Microsoft To Do#Tasks]]`.

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

Add the `阅读模式` property to a note:

```yaml
阅读模式: reading
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

MIT. The reading-mode lock implementation is derived from GOODJINC's View Mode Lock and retains the original license attribution. Third-party dependency notices are listed in `THIRD_PARTY_NOTICES.md`.

## 简体中文

一款模块化的 Obsidian 增强工具箱，提供启动主页与快捷页面、快捷搜索、行内代码复制、笔记更新时间维护和阅读模式锁定。各项功能可独立配置，并在适用时支持桌面端和移动端。

### 功能

- 分别设置桌面端和移动端的启动主页，打开应用后自动进入指定笔记。
- 可添加任意数量的移动端快捷页面，每篇笔记会显示为移动端功能区的独立快捷按钮；不创建桌面端快捷按钮，“我的主页”仍直接打开启动主页。
- 使用 `pinyin-pro` 在本地生成中文全拼和拼音首字母搜索键，支持移动端和离线使用；只转换文件名，不扫描笔记正文。
- 新增“快捷搜索”模块：全库搜索笔记标题和 Obsidian 已缓存的笔记属性，不读取正文。
- 标题和别名支持中文、模糊匹配、全拼和拼音首字母；可从命令面板或搜索快捷按钮打开。
- 可选将移动端底部的放大镜按钮改为打开快捷搜索，该选项默认关闭；关闭后恢复 Obsidian 原生全文搜索。
- 在阅读视图和实时预览的行内代码后显示 📋，点击即可复制，代码块不受影响。
- 分别设置桌面端和移动端的阅读模式锁定行为。
- 按文件夹、标签或属性值建立锁定规则。
- 使用 `阅读模式: 是` 或 `阅读模式: reading` 为单篇笔记启用阅读模式锁定。
- 输入规则时自动提示现有文件夹、标签、属性及属性值。
- 停止编辑 30 秒后，自动维护当前笔记的 `更新时间` 属性，格式为 `YYYY-MM-DD HH:mm`。
- 新建 Markdown 笔记时自动添加该属性，可在设置中关闭。
- 可禁止在笔记属性界面中手动修改更新时间；源码模式仍可编辑 YAML。
- 可双向同步 Microsoft To Do：支持完成状态、标题和新增任务；删除 Markdown 行不会删除云端任务。公共客户端应用已内置，用户只需点击登录并授权 Microsoft 账户。
- 默认不显示已完成任务；如有需要，可在插件设置中重新开启。
- Azure 免费账户的 30 天额度到期后不需要更新插件或客户端 ID；该功能不使用付费 Azure 资源，也没有需要续期的客户端密钥。
- 访问令牌由插件自动刷新。若微软撤销授权，或刷新令牌约 90 天未使用而失效，只需在设置中重新点击“登录”。

安装后打开 **设置 → Sircatx Toolkit** 进行配置。开启 Microsoft To Do 同步并点击“登录”即可开始使用，默认同步文件为 `Microsoft To Do/Microsoft To Do.md`。文件名已作为页面标题，正文不会再重复生成同名标题。请勿同时启用功能重复的独立插件。

同步路径既可以手动输入，也可以点击设置项右侧的笔记按钮，从仓库内已有 Markdown 笔记中选择。同步会整体重写所选笔记，请勿选择包含其它重要内容的笔记。

若要在其他笔记嵌入全部同步任务，输入 `![[Microsoft To Do/Microsoft To Do]]`；只嵌入某个清单时，加上对应的二级标题，例如 `![[Microsoft To Do/Microsoft To Do#任务]]`。
