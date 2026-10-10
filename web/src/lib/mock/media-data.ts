import type { MediaItem } from "@/types/media";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

export const seedMediaItems: MediaItem[] = [
	{
		id: "media-1",
		name: "hero-nebula-landscape.jpg",
		title: "Hero Nebula Landscape",
		altText: "Vibrant cosmic nebula glowing in deep purple and blue stars",
		caption: "Main cover asset used in the launch campaign.",
		mimeType: "image/jpeg",
		size: 2450320, // ~2.45 MB
		url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1600&q=80",
		thumbnailUrl:
			"https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=400&q=80",
		dimensions: {
			width: 3840,
			height: 2160,
		},
		uploadedBy: {
			id: "u1",
			name: "Mara Lindqvist",
		},
		createdAt: now - 2 * DAY,
		updatedAt: now - 2 * DAY,
		tags: ["banner", "marketing", "cosmic"],
	},
	{
		id: "media-2",
		name: "architecture-diagram-v2.png",
		title: "Spile Architecture Overview",
		altText:
			"Technical architectural diagram of Spile microservices and edge cache",
		caption: "Used in developer docs for infrastructure setup.",
		mimeType: "image/png",
		size: 890120, // ~890 KB
		url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1400&q=80",
		thumbnailUrl:
			"https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80",
		dimensions: {
			width: 1920,
			height: 1080,
		},
		uploadedBy: {
			id: "u2",
			name: "Jonas Okafor",
		},
		createdAt: now - 4 * DAY,
		updatedAt: now - 4 * DAY,
		tags: ["docs", "architecture", "technical"],
	},
	{
		id: "media-3",
		name: "product-walkthrough-preview.mp4",
		title: "Editor 2.0 Product Tour",
		altText: "Video teaser of block drag and drop interactions in editor",
		caption: "High quality MP4 demo video for blog post and changelog.",
		mimeType: "video/mp4",
		size: 14890200, // ~14.8 MB
		url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
		duration: 48,
		uploadedBy: {
			id: "u1",
			name: "Mara Lindqvist",
		},
		createdAt: now - 7 * DAY,
		updatedAt: now - 5 * DAY,
		tags: ["video", "changelog", "demo"],
	},
	{
		id: "media-4",
		name: "spile-brand-guidelines-2026.pdf",
		title: "Official Spile Brand Guidelines",
		altText: "PDF containing typography, logo usage, and brand identity specs",
		caption: "Brand assets and design guidelines PDF for partners.",
		mimeType: "application/pdf",
		size: 4210050, // ~4.2 MB
		url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
		uploadedBy: {
			id: "u3",
			name: "Priya Raman",
		},
		createdAt: now - 9 * DAY,
		updatedAt: now - 9 * DAY,
		tags: ["brand", "pdf", "guidelines"],
	},
	{
		id: "media-5",
		name: "podcast-episode-12-audio.mp3",
		title: "Episode 12: Building Modern Publishing Workflows",
		altText: "Full audio track for developer podcast season 2",
		caption: "Embedded audio player file for the podcast release.",
		mimeType: "audio/mpeg",
		size: 32400900, // ~32.4 MB
		url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
		duration: 372,
		uploadedBy: {
			id: "u2",
			name: "Jonas Okafor",
		},
		createdAt: now - 12 * DAY,
		updatedAt: now - 12 * DAY,
		tags: ["audio", "podcast", "interview"],
	},
	{
		id: "media-6",
		name: "team-retreat-alps.jpg",
		title: "Engineering Retreat 2026",
		altText: "Spile core team group photo in the Alps mountains",
		caption: "Company culture page photo.",
		mimeType: "image/jpeg",
		size: 3410200, // ~3.4 MB
		url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80",
		thumbnailUrl:
			"https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=400&q=80",
		dimensions: {
			width: 4032,
			height: 3024,
		},
		uploadedBy: {
			id: "u1",
			name: "Mara Lindqvist",
		},
		createdAt: now - 15 * DAY,
		updatedAt: now - 14 * DAY,
		tags: ["team", "culture", "nature"],
	},
	{
		id: "media-7",
		name: "api-v3-migration-sheet.csv",
		title: "API Endpoint Migration Mapping",
		altText: "Spreadsheet matrix of legacy v2 endpoints to v3 routes",
		caption: "Downloadable mapping CSV attached to migration guide.",
		mimeType: "text/csv",
		size: 45210, // ~45 KB
		url: "https://example.com/api-v3-migration-sheet.csv",
		uploadedBy: {
			id: "u2",
			name: "Jonas Okafor",
		},
		createdAt: now - 18 * DAY,
		updatedAt: now - 18 * DAY,
		tags: ["docs", "api", "csv"],
	},
	{
		id: "media-8",
		name: "dark-mode-dashboard-ui.png",
		title: "Spile Dark Dashboard Mockup",
		altText:
			"Screenshot preview of the dark dashboard interface with analytics",
		caption: "Social media preview card image.",
		mimeType: "image/png",
		size: 1540300, // ~1.5 MB
		url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1400&q=80",
		thumbnailUrl:
			"https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=400&q=80",
		dimensions: {
			width: 2560,
			height: 1440,
		},
		uploadedBy: {
			id: "u3",
			name: "Priya Raman",
		},
		createdAt: now - 20 * DAY,
		updatedAt: now - 20 * DAY,
		tags: ["ui", "mockup", "darkmode"],
	},
];
