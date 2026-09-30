import type {
	BlockTool,
	BlockToolConstructable,
	BlockToolConstructorOptions,
	BlockToolData,
	ToolboxConfig,
} from "@editorjs/editorjs";

interface MediaData extends BlockToolData {
	url: string;
	name?: string;
}

interface MediaConfig {
	mediaType: "video" | "audio";
	placeholder?: string;
}

const VIDEO_ICON =
	'<svg class="popover_block_icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>';
const AUDIO_ICON =
	'<svg class="popover_block_icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';

/**
 * Shared Video/Audio block tool.
 *
 * Authors paste a media URL, or pick a local file (previewed via an ephemeral
 * object URL — persisted uploads come later with the backend). The tool renders
 * a native <video>/<audio> player with controls, plus an Edit view to swap the
 * source.
 */
export function createMediaTool(
	mediaType: "video" | "audio",
): BlockToolConstructable {
	const title = mediaType === "video" ? "Video" : "Audio";
	const icon = mediaType === "video" ? VIDEO_ICON : AUDIO_ICON;
	const accept = mediaType === "video" ? "video/*" : "audio/*";

	return class MediaTool implements BlockTool {
		static toolbox: ToolboxConfig = { title, icon };

		static get isReadOnlySupported(): boolean {
			return true;
		}

		private readonly mediaType = mediaType;
		private readonly accept = accept;
		private readonly placeholder: string;
		private data: MediaData;

		private wrapper!: HTMLElement;
		private header!: HTMLElement;
		private editToggle!: HTMLButtonElement;
		private previewToggle!: HTMLButtonElement;
		private editPanel!: HTMLElement;
		private urlInput!: HTMLInputElement;
		private fileInput!: HTMLInputElement;
		private previewPanel!: HTMLElement;

		constructor({
			data,
			config,
		}: BlockToolConstructorOptions<MediaData, MediaConfig>) {
			this.placeholder =
				config?.placeholder ??
				(mediaType === "video" ? "Paste a video URL…" : "Paste an audio URL…");
			this.data = { url: data.url ?? "", name: data.name ?? "" };
		}

		render(): HTMLElement {
			this.wrapper = document.createElement("div");
			this.wrapper.className = "ce-media";

			this.header = document.createElement("div");
			this.header.className = "ce-media__header";

			this.editToggle = document.createElement("button");
			this.editToggle.type = "button";
			this.editToggle.className = "ce-media__toggle";
			this.editToggle.textContent = "Edit";
			this.editToggle.addEventListener("click", () => this.setMode("edit"));

			this.previewToggle = document.createElement("button");
			this.previewToggle.type = "button";
			this.previewToggle.className = "ce-media__toggle";
			this.previewToggle.textContent = "Preview";
			this.previewToggle.addEventListener("click", () =>
				this.setMode("preview"),
			);

			const label = document.createElement("span");
			label.className = "ce-media__label";
			label.textContent = title;

			const spacer = document.createElement("span");
			spacer.className = "ce-media__spacer";

			this.header.append(label, spacer, this.editToggle, this.previewToggle);

			this.editPanel = document.createElement("div");
			this.editPanel.className = "ce-media__editor";

			this.urlInput = document.createElement("input");
			this.urlInput.type = "url";
			this.urlInput.className = "ce-media__input";
			this.urlInput.placeholder = this.placeholder;
			this.urlInput.spellcheck = false;
			this.urlInput.value = this.data.url;
			this.urlInput.addEventListener("input", () => {
				this.data.url = this.urlInput.value.trim();
			});

			const browse = document.createElement("button");
			browse.type = "button";
			browse.className = "ce-media__browse";
			browse.textContent = "Browse file";
			this.fileInput = document.createElement("input");
			this.fileInput.type = "file";
			this.fileInput.accept = this.accept;
			this.fileInput.className = "ce-media__file-input";
			this.fileInput.addEventListener("change", () => {
				const file = this.fileInput.files?.[0];
				if (!file) return;
				this.data.url = URL.createObjectURL(file);
				this.data.name = file.name;
				this.urlInput.value = file.name;
				this.setMode("preview");
			});
			browse.addEventListener("click", () => this.fileInput.click());

			this.editPanel.append(this.urlInput, browse, this.fileInput);

			this.previewPanel = document.createElement("div");
			this.previewPanel.className = "ce-media__preview";
			this.previewPanel.hidden = true;

			this.wrapper.append(this.header, this.editPanel, this.previewPanel);

			this.setMode(this.data.url ? "preview" : "edit");
			return this.wrapper;
		}

		private setMode(mode: "edit" | "preview"): void {
			this.editPanel.hidden = mode === "preview";
			this.previewPanel.hidden = mode === "edit";
			this.header.dataset.mode = mode;
			if (mode === "preview") this.renderPreview();
		}

		private renderPreview(): void {
			this.previewPanel.replaceChildren();
			const url = this.data.url;
			if (!url) {
				this.previewPanel.append(this.emptyHint("No source set."));
				return;
			}

			const el =
				this.mediaType === "video"
					? document.createElement("video")
					: document.createElement("audio");
			el.className = "ce-media__player";
			el.setAttribute("controls", "");
			el.src = url;
			if (this.mediaType === "video") {
				el.setAttribute("playsinline", "");
				el.setAttribute("preload", "metadata");
			}
			this.previewPanel.append(el);
		}

		private emptyHint(text: string): HTMLElement {
			const el = document.createElement("div");
			el.className = "ce-media__empty";
			el.textContent = text;
			return el;
		}

		save(): MediaData {
			return { url: this.data.url, name: this.data.name };
		}

		static get sanitize() {
			return { url: true, name: true };
		}

		validate(savedData: MediaData): boolean {
			return typeof savedData.url === "string" && savedData.url.length > 0;
		}
	};
}
