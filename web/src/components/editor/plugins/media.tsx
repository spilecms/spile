import type {
	API,
	BlockTool,
	BlockToolConstructable,
	BlockToolConstructorOptions,
	BlockToolData,
	PasteConfig,
	PasteEvent,
	ToolboxConfig,
} from "@editorjs/editorjs";

interface MediaData extends BlockToolData {
	url: string;
	name?: string;
}

interface UploadResult {
	url: string;
	name?: string;
}

interface MediaConfig {
	mediaType?: "video" | "audio";
	/** Label inside the empty placeholder row. */
	placeholder?: string;
	/**
	 * Same pattern as the Editor.js image tool. Resolve with the final public
	 * URL (or { url, name }). Without it, the tool falls back to a temporary
	 * object URL that previews fine but does not survive a reload.
	 */
	uploader?: {
		uploadByFile(file: File): Promise<string | UploadResult>;
	};
}

type Tab = "upload" | "embed";

interface SettingsItem {
	icon: string;
	title: string;
	onActivate: () => void;
}

const VIDEO_EXTENSIONS = [
	"mp4",
	"m4v",
	"webm",
	"ogv",
	"mov",
	"mkv",
	"avi",
	"3gp",
	"mpeg",
	"mpg",
];

const AUDIO_EXTENSIONS = [
	"mp3",
	"m4a",
	"wav",
	"ogg",
	"oga",
	"flac",
	"aac",
	"opus",
];

function extensionsFor(mediaType: "video" | "audio"): string[] {
	return mediaType === "video" ? VIDEO_EXTENSIONS : AUDIO_EXTENSIONS;
}

function matchesMediaFile(file: File, mediaType: "video" | "audio"): boolean {
	if (file.type.startsWith(`${mediaType}/`)) return true;
	const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
	return extensionsFor(mediaType).includes(extension);
}

function isSameFile(a: File, b: File): boolean {
	return (
		a.name === b.name && a.size === b.size && a.lastModified === b.lastModified
	);
}

/**
 * The file a media dropzone is taking for itself, waiting for Editor.js to
 * insert the extra block it creates for the same drop so that block can be
 * discarded instead of rendered as a duplicate.
 */
let dropTaken: { file: File; wrapper: HTMLElement } | null = null;

const VIDEO_ICON =
	'<svg class="popover_block_icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>';
const AUDIO_ICON =
	'<svg class="popover_block_icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
const REPLACE_ICON =
	'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M8 16H3v5"/></svg>';

/**
 * Class names only. All styling lives in media-tool.css, which reads your
 * shadcn CSS variables, so there is no Tailwind scanning involved.
 */
const cls = {
	wrapper: "ce-media",
	placeholder: "ce-media__placeholder",
	placeholderIcon: "ce-media__placeholder-icon",
	player: "ce-media__player",
	videoPlayer: "ce-media__player--video",
	error: "ce-media__error",
	outlineButton: "ce-media__btn ce-media__btn--outline",
	popover: "ce-media__popover",
	tabs: "ce-media__tabs",
	tab: "ce-media__tab",
	tabActive: "is-active",
	input: "ce-media__input",
	primary: "ce-media__btn ce-media__btn--primary",
	primaryBlock: "ce-media__btn--block",
	dropzone: "ce-media__dropzone",
	dropzoneOver: "is-over",
	dropzoneBusy: "is-busy",
	hint: "ce-media__hint",
	message: "ce-media__message",
	fileInput: "ce-media__file-input",
};

function el<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	className: string,
	text?: string,
): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);
	node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
}

function toggle(node: HTMLElement, classes: string, on: boolean): void {
	for (const c of classes.split(" ")) node.classList.toggle(c, on);
}

function fileNameFromUrl(url: URL): string {
	const last = url.pathname.split("/").filter(Boolean).pop();
	return last ? decodeURIComponent(last) : "";
}

/**
 * Shared Video/Audio block tool (Plate.js style).
 *
 * Three states, all derived from the saved data:
 *  - empty:  a single placeholder row. Clicking it opens a floating popover
 *            with an Upload tab and an Embed link tab.
 *  - ready:  the block is just a native <video>/<audio> player.
 *  - error:  the source failed to load; shows a message with a Replace action.
 *
 * Replace lives in the block settings menu and reopens the popover.
 * Embed supports direct media file URLs only (.mp4, .mp3 and so on).
 */
export function createMediaTool(
	mediaType: "video" | "audio",
): BlockToolConstructable {
	const isVideo = mediaType === "video";
	const title = isVideo ? "Video" : "Audio";
	const icon = isVideo ? VIDEO_ICON : AUDIO_ICON;
	const accept = isVideo ? "video/*" : "audio/*";
	const noun = isVideo ? "video" : "audio file";

	return class MediaTool implements BlockTool {
		static toolbox: ToolboxConfig = { title, icon };

		static get isReadOnlySupported(): boolean {
			return true;
		}

		static get sanitize() {
			return { url: true, name: true };
		}

		static get pasteConfig(): PasteConfig {
			const extensions = extensionsFor(mediaType);
			return {
				tags: [
					{
						video: { src: true, controls: true, poster: true },
						audio: { src: true, controls: true },
					},
				],
				patterns: {
					[mediaType]: new RegExp(
						`^https?:\\/\\/\\S+\\.(?:${extensions.join("|")})(?:[?#]\\S*)?$`,
						"i",
					),
				},
				files: {
					mimeTypes: [`${mediaType}/*`],
					extensions,
				},
			};
		}

		static get conversionConfig() {
			return {
				export: (data: MediaData) => data.url ?? "",
				import: (content: string) => ({
					url: String(content ?? "").trim(),
					name: "",
				}),
			};
		}

		private data: MediaData;
		private readonly readOnly: boolean;
		private readonly config: MediaConfig;
		private readonly api: API;
		private readonly placeholderText: string;

		private wrapper!: HTMLElement;
		private stage!: HTMLElement;
		private popover: HTMLElement | null = null;
		private tabButtons = new Map<Tab, HTMLButtonElement>();
		private tabPanels = new Map<Tab, HTMLElement>();
		private urlInput!: HTMLInputElement;
		private fileInput!: HTMLInputElement;
		private dropzone!: HTMLElement;
		private message!: HTMLElement;
		private uploading = false;
		private teardownOutside: (() => void) | null = null;

		constructor({
			data,
			config,
			readOnly,
			api,
		}: BlockToolConstructorOptions<MediaData, MediaConfig>) {
			this.config = config ?? {};
			this.readOnly = Boolean(readOnly);
			this.api = api;
			this.placeholderText =
				this.config.placeholder ?? `Add ${isVideo ? "a" : "an"} ${noun}`;
			this.data = { url: data?.url ?? "", name: data?.name ?? "" };
		}

		render(): HTMLElement {
			this.wrapper = el("div", cls.wrapper);
			this.stage = el("div", "ce-media__stage");
			this.wrapper.append(this.stage);

			if (!this.readOnly) this.buildPopover();
			this.renderStage();
			return this.wrapper;
		}

		/* ------------------------------ stage ------------------------------ */

		private renderStage(): void {
			this.stage.replaceChildren();

			if (!this.data.url) {
				if (this.readOnly) return;
				this.stage.append(this.buildPlaceholder());
				return;
			}
			this.stage.append(this.buildPlayer());
		}

		private buildPlaceholder(): HTMLElement {
			const row = el("button", cls.placeholder);
			row.type = "button";
			const iconBox = el("span", cls.placeholderIcon);
			iconBox.innerHTML = icon;
			row.append(iconBox, el("span", "", this.placeholderText));
			row.addEventListener("click", () => this.openPopover());
			return row;
		}

		private buildPlayer(): HTMLElement {
			const media = document.createElement(isVideo ? "video" : "audio");
			media.className = isVideo
				? `${cls.player} ${cls.videoPlayer}`
				: cls.player;
			media.setAttribute("controls", "");
			media.setAttribute("preload", "metadata");
			if (isVideo) media.setAttribute("playsinline", "");
			media.src = this.data.url;

			media.addEventListener("error", () => {
				this.stage.replaceChildren(this.buildError());
			});
			return media;
		}

		private buildError(): HTMLElement {
			const box = el("div", cls.error);
			box.append(
				el(
					"span",
					"",
					`Couldn't load this ${noun}. Make sure the link points directly to a media file.`,
				),
			);
			if (!this.readOnly) {
				const replace = el("button", cls.outlineButton, "Replace");
				replace.type = "button";
				replace.addEventListener("click", () => this.openPopover());
				box.append(replace);
			}
			return box;
		}

		/* ----------------------------- popover ----------------------------- */

		private buildPopover(): void {
			const popover = el("div", cls.popover);
			popover.hidden = true;

			const tabs = el("div", cls.tabs);
			const tabDefs: Array<[Tab, string]> = [
				["upload", "Upload"],
				["embed", "Embed link"],
			];
			for (const [id, label] of tabDefs) {
				const btn = el("button", cls.tab, label);
				btn.type = "button";
				btn.addEventListener("click", () => this.setTab(id));
				this.tabButtons.set(id, btn);
				tabs.append(btn);
			}

			/* Upload panel */
			const uploadPanel = el("div", "");
			this.dropzone = el("div", cls.dropzone);
			const choose = el("button", cls.primary, `Choose ${noun}`);
			choose.type = "button";
			this.fileInput = el("input", cls.fileInput);
			this.fileInput.type = "file";
			this.fileInput.accept = accept;
			this.fileInput.addEventListener("change", () => {
				const file = this.fileInput.files?.[0];
				this.fileInput.value = "";
				if (file) void this.handleFile(file);
			});
			choose.addEventListener("click", () => this.fileInput.click());
			this.dropzone.append(
				choose,
				el(
					"span",
					cls.hint,
					`or drag and drop ${isVideo ? "a" : "an"} ${noun} here`,
				),
				this.fileInput,
			);
			this.dropzone.addEventListener("dragover", (e) => {
				e.preventDefault();
				const types = e.dataTransfer?.types;
				const isFileDrag = types ? Array.from(types).includes("Files") : false;
				toggle(this.dropzone, cls.dropzoneOver, isFileDrag);
			});
			this.dropzone.addEventListener("dragleave", () =>
				toggle(this.dropzone, cls.dropzoneOver, false),
			);
			this.dropzone.addEventListener("drop", (e) => {
				e.preventDefault();
				toggle(this.dropzone, cls.dropzoneOver, false);
				const file = e.dataTransfer?.files?.[0];
				if (!file) return;
				if (matchesMediaFile(file, mediaType)) {
					dropTaken = { file, wrapper: this.wrapper };
				}
				void this.handleFile(file);
			});
			uploadPanel.append(this.dropzone);

			/* Embed panel */
			const embedPanel = el("div", "");
			this.urlInput = el("input", cls.input);
			this.urlInput.type = "url";
			this.urlInput.placeholder = "Paste the link...";
			this.urlInput.spellcheck = false;
			this.urlInput.addEventListener("keydown", (e) => {
				if (e.key === "Enter") {
					e.preventDefault();
					this.embedFromInput();
				}
			});
			const embed = el(
				"button",
				`${cls.primary} ${cls.primaryBlock}`,
				`Embed ${isVideo ? "video" : "audio"}`,
			);
			embed.type = "button";
			embed.addEventListener("click", () => this.embedFromInput());
			embedPanel.append(this.urlInput, embed);

			this.tabPanels.set("upload", uploadPanel);
			this.tabPanels.set("embed", embedPanel);

			this.message = el("div", cls.message);
			this.message.hidden = true;

			popover.append(tabs, uploadPanel, embedPanel, this.message);
			popover.addEventListener("keydown", (e) => {
				if (e.key === "Escape") {
					e.stopPropagation();
					this.closePopover();
				}
			});

			this.popover = popover;
			this.wrapper.append(popover);
			this.setTab("upload");
		}

		private setTab(tab: Tab): void {
			for (const [id, btn] of this.tabButtons) {
				const active = id === tab;
				toggle(btn, cls.tabActive, active);
			}
			for (const [id, panel] of this.tabPanels) {
				panel.hidden = id !== tab;
			}
			this.showMessage("");
			if (tab === "embed") this.urlInput.focus();
		}

		private openPopover(): void {
			if (!this.popover?.hidden) return;
			this.popover.hidden = false;
			this.urlInput.value = "";
			this.setTab("upload");

			const onPointerDown = (e: PointerEvent) => {
				if (this.uploading) return;
				if (!this.wrapper.contains(e.target as Node)) this.closePopover();
			};
			// Defer so the click that opened the popover (including the click on
			// the block settings menu item) does not immediately close it.
			const timer = window.setTimeout(() => {
				document.addEventListener("pointerdown", onPointerDown, true);
			}, 0);
			this.teardownOutside = () => {
				window.clearTimeout(timer);
				document.removeEventListener("pointerdown", onPointerDown, true);
			};
		}

		private closePopover(): void {
			if (!this.popover || this.popover.hidden) return;
			this.popover.hidden = true;
			this.teardownOutside?.();
			this.teardownOutside = null;
			this.showMessage("");
		}

		private showMessage(text: string): void {
			this.message.textContent = text;
			this.message.hidden = text === "";
		}

		/* ------------------------------ sources ---------------------------- */

		private embedFromInput(): void {
			const raw = this.urlInput.value.trim();
			let parsed: URL;
			try {
				parsed = new URL(raw);
			} catch {
				this.showMessage("Enter a valid link.");
				return;
			}
			if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
				this.showMessage("Only http and https links are supported.");
				return;
			}
			this.applySource(parsed.href, fileNameFromUrl(parsed));
		}

		private async handleFile(file: File): Promise<void> {
			if (this.uploading) return;
			if (!matchesMediaFile(file, mediaType)) {
				this.showMessage(`Please choose ${isVideo ? "a" : "an"} ${noun}.`);
				return;
			}

			const uploader = this.config.uploader;
			if (!uploader) {
				// Temporary preview only. Replace with a real uploader once the
				// backend exists.
				this.applySource(URL.createObjectURL(file), file.name);
				return;
			}

			this.setUploading(true);
			try {
				const result = await uploader.uploadByFile(file);
				const url = typeof result === "string" ? result : result.url;
				const name =
					typeof result === "string" ? file.name : (result.name ?? file.name);
				if (!url) throw new Error("Uploader returned no URL");
				this.applySource(url, name);
			} catch {
				this.showMessage("Upload failed. Try again.");
			} finally {
				this.setUploading(false);
			}
		}

		private setUploading(value: boolean): void {
			this.uploading = value;
			toggle(this.dropzone, cls.dropzoneBusy, value);
			this.dropzone.setAttribute("aria-busy", String(value));
			if (value) this.showMessage("Uploading…");
			else if (this.message.textContent === "Uploading…") this.showMessage("");
		}

		private applySource(url: string, name: string): void {
			const previous = this.data.url;
			if (previous && previous !== url && previous.startsWith("blob:")) {
				URL.revokeObjectURL(previous);
			}
			this.data = { url, name };
			this.closePopover();
			this.renderStage();
		}

		/* --------------------------- block settings ------------------------ */

		renderSettings(): SettingsItem[] {
			return [
				{
					icon: REPLACE_ICON,
					title: "Replace",
					onActivate: () => this.openPopover(),
				},
			];
		}

		/* ------------------------------ lifecycle -------------------------- */

		destroy(): void {
			this.teardownOutside?.();
			this.teardownOutside = null;
		}

		save(): MediaData {
			return { url: this.data.url, name: this.data.name };
		}

		validate(savedData: MediaData): boolean {
			return typeof savedData.url === "string" && savedData.url.length > 0;
		}

		onPaste(event: PasteEvent): void {
			const detail = event.detail;

			if ("file" in detail) {
				const file = detail.file;
				if (dropTaken && isSameFile(dropTaken.file, file)) {
					dropTaken = null;
					this.removeSelf();
					return;
				}
				void this.handleFile(file);
				return;
			}

			const data = detail.data;
			const url =
				data instanceof HTMLElement
					? (data.getAttribute("src") ??
						data.querySelector("source")?.getAttribute("src") ??
						"")
					: String(data ?? "").trim();
			if (!url) return;

			let name = "";
			try {
				name = fileNameFromUrl(new URL(url));
			} catch {
				name = "";
			}
			this.applySource(url, name);
		}

		private removeSelf(): void {
			const block = this.api.blocks.getBlockByElement(this.wrapper);
			if (!block) return;
			const index = this.api.blocks.getBlockIndex(block.id);
			if (typeof index !== "number" || index < 0) return;
			this.api.blocks.delete(index);
		}
	};
}
