import { getLanguage } from "obsidian";

export interface Translations {
	deviceBehaviorHeading: string;
	deviceBehaviorDesc: string;
	viewModeLockModuleHeading: string;
	desktop: string;
	desktopDesc: string;
	mobile: string;
	mobileDesc: string;
	followRules: string;
	forceReading: string;
	disableLock: string;
	overrideName: string;
	overrideDesc: string;
	rulesHeading: string;
	rulesDesc: string;
	rule: (number: number) => string;
	enabled: string;
	disabled: string;
	folder: string;
	tag: string;
	property: string;
	reading: string;
	livePreview: string;
	source: string;
	folderDesc: string;
	tagDesc: string;
	propertyName: string;
	propertyNameDesc: string;
	chooseFolder: string;
	chooseTag: string;
	chooseProperty: string;
	propertyValue: string;
	propertyValueDesc: string;
	chooseOrEnterValue: string;
	newRuleDesc: string;
	addRule: string;
	commandToggleCurrent: string;
	noteLockEnabled: string;
	noteLockDisabled: string;
	noteSettingSavedDeviceOverride: string;
	copyInlineCodeHeading: string;
	copyInlineCodeName: string;
	copyInlineCodeDesc: string;
	inlineCodeCopied: string;
	noteUpdatedHeading: string;
	noteUpdatedEnabled: string;
	noteUpdatedEnabledDesc: string;
	noteUpdatedPropertyName: string;
	noteUpdatedPropertyNameDesc: string;
	noteUpdatedNewNotes: string;
	noteUpdatedNewNotesDesc: string;
	noteUpdatedReadonly: string;
	noteUpdatedReadonlyDesc: string;
	startupHomepageHeading: string;
	desktopHomepage: string;
	desktopHomepageDesc: string;
	mobileHomepage: string;
	mobileHomepageDesc: string;
	chooseHomepage: string;
	openHomepageNow: string;
	myHomepage: string;
}

const EN: Translations = {
	deviceBehaviorHeading: "Device behavior",
	deviceBehaviorDesc: "Choose how View Mode Lock behaves on each device type. Device behavior takes priority over all rules.",
	viewModeLockModuleHeading: "View mode lock",
	desktop: "Desktop",
	desktopDesc: "Windows, macOS, and Linux desktop apps.",
	mobile: "Mobile",
	mobileDesc: "Obsidian mobile app on a phone or tablet.",
	followRules: "Follow existing rules",
	forceReading: "Always use Reading view",
	disableLock: "Disable locking",
	overrideName: "Note-level override property",
	overrideDesc: "Default: 阅读模式. Use 是 or reading to lock a note in Reading view.",
	rulesHeading: "Lock rules",
	rulesDesc: "A matching rule locks a note to its selected view mode. Note-level overrides remain higher priority.",
	rule: (number) => `Rule ${number}`,
	enabled: "Enabled",
	disabled: "Disabled",
	folder: "Folder",
	tag: "Tag",
	property: "Property",
	reading: "Reading",
	livePreview: "Live Preview",
	source: "Source",
	folderDesc: "Select an existing folder. Notes in subfolders are included.",
	tagDesc: "Select an existing tag or enter one with or without #.",
	propertyName: "Property name",
	propertyNameDesc: "Select an existing note property.",
	chooseFolder: "Choose a folder",
	chooseTag: "Choose a tag",
	chooseProperty: "Choose a property",
	propertyValue: "Property value",
	propertyValueDesc: "The rule matches when the property has this exact value.",
	chooseOrEnterValue: "Choose or enter a value",
	newRuleDesc: "Add another folder, tag, or property rule.",
	addRule: "Add rule",
	commandToggleCurrent: "Toggle lock for current note",
	noteLockEnabled: "Reading lock enabled for this note.",
	noteLockDisabled: "Reading lock disabled for this note.",
	noteSettingSavedDeviceOverride: "Note setting saved. The current device behavior takes priority.",
	copyInlineCodeHeading: "Inline code",
	copyInlineCodeName: "Click to copy inline code",
	copyInlineCodeDesc: "Show a 📋 icon after inline code in Reading view and Live Preview. Click it to copy; code blocks are not affected.",
	inlineCodeCopied: "Copied: ",
	noteUpdatedHeading: "Note updated time",
	noteUpdatedEnabled: "Maintain updated-time property",
	noteUpdatedEnabledDesc: "Write the current time after editing stops for 30 seconds.",
	noteUpdatedPropertyName: "Property name",
	noteUpdatedPropertyNameDesc: "Default: 更新时间. The value uses YYYY-MM-DD HH:mm.",
	noteUpdatedNewNotes: "Add to new notes",
	noteUpdatedNewNotesDesc: "Automatically add the updated-time property when a Markdown note is created.",
	noteUpdatedReadonly: "Prevent manual editing",
	noteUpdatedReadonlyDesc: "Make the managed value read-only in the Properties UI. Source mode can still edit YAML.",
	startupHomepageHeading: "Startup homepage",
	desktopHomepage: "Desktop homepage",
	desktopHomepageDesc: "Open this note when the desktop app starts. Leave empty to disable.",
	mobileHomepage: "Mobile homepage",
	mobileHomepageDesc: "Open this note when the mobile app starts. Leave empty to disable.",
	chooseHomepage: "Click to choose a homepage note",
	openHomepageNow: "Open now",
	myHomepage: "My homepage"
};

const KO: Translations = {
	deviceBehaviorHeading: "기기별 동작",
	deviceBehaviorDesc: "기기 종류에 따라 View Mode Lock의 동작을 선택합니다. 기기별 동작은 모든 잠금 규칙보다 우선합니다.",
	viewModeLockModuleHeading: "보기 모드 잠금",
	desktop: "PC",
	desktopDesc: "Windows, macOS 및 Linux 데스크톱 앱에 적용합니다.",
	mobile: "모바일",
	mobileDesc: "휴대폰 또는 태블릿의 Obsidian 모바일 앱에 적용합니다.",
	followRules: "기존 규칙 따르기",
	forceReading: "항상 읽기 모드",
	disableLock: "잠금 사용 안 함",
	overrideName: "노트별 재정의 속성",
	overrideDesc: "기본값: 阅读模式. 是 또는 reading으로 노트를 읽기 모드에 고정합니다.",
	rulesHeading: "잠금 규칙",
	rulesDesc: "조건에 맞는 노트를 선택한 보기 모드로 고정합니다. 노트별 설정이 더 높은 우선순위를 가집니다.",
	rule: (number) => `규칙 ${number}`,
	enabled: "사용",
	disabled: "사용 안 함",
	folder: "폴더",
	tag: "태그",
	property: "속성",
	reading: "읽기 모드",
	livePreview: "라이브 프리뷰",
	source: "소스 모드",
	folderDesc: "기존 폴더를 선택합니다. 하위 폴더의 노트도 포함됩니다.",
	tagDesc: "기존 태그를 선택하거나 # 포함 여부와 관계없이 직접 입력합니다.",
	propertyName: "속성 이름",
	propertyNameDesc: "기존 노트 속성을 선택합니다.",
	chooseFolder: "폴더 선택",
	chooseTag: "태그 선택",
	chooseProperty: "속성 선택",
	propertyValue: "속성값",
	propertyValueDesc: "속성값이 정확히 일치할 때 규칙을 적용합니다.",
	chooseOrEnterValue: "값을 선택하거나 입력",
	newRuleDesc: "폴더, 태그 또는 속성 규칙을 추가합니다.",
	addRule: "규칙 추가",
	commandToggleCurrent: "현재 노트 잠금 전환",
	noteLockEnabled: "현재 노트의 읽기 모드 잠금을 켰습니다.",
	noteLockDisabled: "현재 노트의 읽기 모드 잠금을 해제했습니다.",
	noteSettingSavedDeviceOverride: "노트 설정을 저장했습니다. 현재 기기의 동작 설정이 우선합니다.",
	copyInlineCodeHeading: "인라인 코드",
	copyInlineCodeName: "클릭하여 인라인 코드 복사",
	copyInlineCodeDesc: "읽기 모드와 라이브 프리뷰의 인라인 코드 뒤에 📋 아이콘을 표시합니다. 아이콘을 클릭하면 복사되며 코드 블록은 제외됩니다.",
	inlineCodeCopied: "복사됨: ",
	noteUpdatedHeading: "노트 수정 시간",
	noteUpdatedEnabled: "수정 시간 속성 유지",
	noteUpdatedEnabledDesc: "편집을 멈춘 뒤 30초 후 현재 시간을 기록합니다.",
	noteUpdatedPropertyName: "속성 이름",
	noteUpdatedPropertyNameDesc: "기본값: 更新时间. 값 형식은 YYYY-MM-DD HH:mm입니다.",
	noteUpdatedNewNotes: "새 노트에 추가",
	noteUpdatedNewNotesDesc: "Markdown 노트를 만들 때 수정 시간 속성을 자동으로 추가합니다.",
	noteUpdatedReadonly: "수동 편집 방지",
	noteUpdatedReadonlyDesc: "속성 UI에서 관리되는 값을 읽기 전용으로 설정합니다. 소스 모드에서는 YAML을 계속 편집할 수 있습니다.",
	startupHomepageHeading: "시작 홈페이지",
	desktopHomepage: "데스크톱 홈페이지",
	desktopHomepageDesc: "데스크톱 앱 시작 시 이 노트를 엽니다. 비워 두면 사용하지 않습니다.",
	mobileHomepage: "모바일 홈페이지",
	mobileHomepageDesc: "모바일 앱 시작 시 이 노트를 엽니다. 비워 두면 사용하지 않습니다.",
	chooseHomepage: "클릭하여 홈페이지 노트 선택",
	openHomepageNow: "지금 열기",
	myHomepage: "내 홈페이지"
};

const ZH_CN: Translations = {
	deviceBehaviorHeading: "设备行为",
	deviceBehaviorDesc: "选择阅读模式锁定在不同设备上的行为。设备行为的优先级高于所有锁定规则。",
	viewModeLockModuleHeading: "阅读模式锁定",
	desktop: "桌面端",
	desktopDesc: "适用于 Windows、macOS 和 Linux 桌面应用。",
	mobile: "移动端",
	mobileDesc: "适用于手机和平板电脑上的 Obsidian 移动应用。",
	followRules: "遵循现有规则",
	forceReading: "始终使用阅读视图",
	disableLock: "禁用锁定",
	overrideName: "单篇笔记覆盖属性",
	overrideDesc: "默认属性名：阅读模式。使用 是 或 reading 将笔记锁定为阅读模式。",
	rulesHeading: "锁定规则",
	rulesDesc: "匹配规则的笔记将锁定为所选视图模式。单篇笔记的覆盖设置始终具有更高优先级。",
	rule: (number) => `规则 ${number}`,
	enabled: "已启用",
	disabled: "已禁用",
	folder: "文件夹",
	tag: "标签",
	property: "属性",
	reading: "阅读视图",
	livePreview: "实时预览",
	source: "源码模式",
	folderDesc: "选择现有文件夹，同时包含其子文件夹中的笔记。",
	tagDesc: "选择现有标签，或直接输入标签（可带或不带 #）。",
	propertyName: "属性名称",
	propertyNameDesc: "选择现有的笔记属性。",
	chooseFolder: "选择文件夹",
	chooseTag: "选择标签",
	chooseProperty: "选择属性",
	propertyValue: "属性值",
	propertyValueDesc: "仅当属性值完全一致时才匹配此规则。",
	chooseOrEnterValue: "选择或输入值",
	newRuleDesc: "添加文件夹、标签或属性规则。",
	addRule: "添加规则",
	commandToggleCurrent: "切换当前笔记的视图锁定",
	noteLockEnabled: "已为当前笔记启用阅读视图锁定。",
	noteLockDisabled: "已为当前笔记禁用阅读视图锁定。",
	noteSettingSavedDeviceOverride: "笔记设置已保存，但当前设备的行为设置具有更高优先级。",
	copyInlineCodeHeading: "行内代码",
	copyInlineCodeName: "点击复制行内代码",
	copyInlineCodeDesc: "在阅读视图和实时预览的行内代码后显示 📋 图标；点击图标即可复制，代码块不受影响。",
	inlineCodeCopied: "已复制：",
	noteUpdatedHeading: "笔记更新时间",
	noteUpdatedEnabled: "自动维护更新时间属性",
	noteUpdatedEnabledDesc: "停止编辑 30 秒后，将当前时间写入笔记属性。",
	noteUpdatedPropertyName: "属性名称",
	noteUpdatedPropertyNameDesc: "默认属性名：更新时间。时间格式为 YYYY-MM-DD HH:mm。",
	noteUpdatedNewNotes: "新建笔记时添加属性",
	noteUpdatedNewNotesDesc: "新建 Markdown 笔记时，自动添加更新时间属性。",
	noteUpdatedReadonly: "禁止手动修改",
	noteUpdatedReadonlyDesc: "在笔记属性界面中将更新时间设为只读；源码模式仍可直接修改 YAML。",
	startupHomepageHeading: "启动主页",
	desktopHomepage: "桌面端主页",
	desktopHomepageDesc: "桌面端启动时自动打开这篇笔记；留空则关闭。",
	mobileHomepage: "移动端主页",
	mobileHomepageDesc: "手机或平板启动时自动打开这篇笔记；留空则关闭。",
	chooseHomepage: "点击选择主页笔记",
	openHomepageNow: "立即打开",
	myHomepage: "我的主页"
};

export function getTranslations(): Translations {
	const language = getLanguage().toLowerCase();
	if (language.startsWith("zh")) return ZH_CN;
	if (language.startsWith("ko")) return KO;
	return EN;
}
