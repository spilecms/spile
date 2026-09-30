declare module "@editorjs/marker" {
	import type { InlineToolConstructable } from "@editorjs/editorjs";
	const Marker: InlineToolConstructable;
	export default Marker;
}

declare module "@editorjs/checklist" {
	import type { BlockToolConstructable } from "@editorjs/editorjs";
	const Checklist: BlockToolConstructable;
	export default Checklist;
}

declare module "@editorjs/attaches" {
	import type { BlockToolConstructable } from "@editorjs/editorjs";
	const Attaches: BlockToolConstructable;
	export default Attaches;
}
