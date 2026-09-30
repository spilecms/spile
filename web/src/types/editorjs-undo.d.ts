declare module "editorjs-undo" {
	import type EditorJS from "@editorjs/editorjs";

	interface UndoConfig {
		shortcuts?: {
			undo?: string;
			redo?: string;
		};
		debounceTimer?: number;
		maxLength?: number;
		onUpdate?: () => void;
	}

	interface UndoOptions {
		editor: EditorJS;
		config?: UndoConfig;
	}

	export default class Undo {
		constructor(options: UndoOptions);
		undo(): void;
		redo(): void;
		clear(): void;
		initialize(initialData: unknown): void;
	}
}
