export type MediaType = "image" | "video" | "audio" | "document";

export interface MediaItem {
	id: string;
	name: string;
	title?: string;
	altText?: string;
	caption?: string;
	mimeType: string;
	size: number; // in bytes
	url: string;
	thumbnailUrl?: string;
	dimensions?: {
		width: number;
		height: number;
	};
	duration?: number; // in seconds (for audio/video)
	uploadedBy: {
		id: string;
		name: string;
		avatar?: string;
	};
	createdAt: number;
	updatedAt: number;
	tags?: string[];
}

export type MediaListParams = {
	type?: MediaType | "all";
	query?: string;
	tag?: string;
	sortBy?: "createdAt" | "name" | "size";
	sortOrder?: "asc" | "desc";
};

export type MediaUploadPayload = {
	name: string;
	mimeType: string;
	size: number;
	url: string;
	thumbnailUrl?: string;
	dimensions?: { width: number; height: number };
	altText?: string;
	caption?: string;
	tags?: string[];
};

export type MediaUpdatePayload = Partial<
	Pick<MediaItem, "name" | "title" | "altText" | "caption" | "tags">
>;
