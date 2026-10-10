import type {
	AnalyticsOverview,
	AnalyticsTimeRange,
	AnalyticsTimeSeriesPoint,
	CountryTraffic,
	DeviceDistribution,
	DocPageAnalytics,
	PostAnalytics,
	ReferrerSource,
} from "@/types/analytics";

function mulberry32(seed: number) {
	let s = seed;
	return () => {
		s += 0x6d2b79f5;
		let t = s;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export const mockOverviewData: Record<AnalyticsTimeRange, AnalyticsOverview> = {
	"24h": {
		totalViews: 4120,
		viewsTrend: 14.8,
		uniqueVisitors: 2890,
		visitorsTrend: 11.2,
		avgReadTimeSeconds: 265, // ~4m 25s
		readTimeTrend: 3.5,
		bounceRate: 31.4,
		bounceRateTrend: -2.1, // negative is good for bounce rate
	},
	"7d": {
		totalViews: 32680,
		viewsTrend: 18.4,
		uniqueVisitors: 21450,
		visitorsTrend: 14.9,
		avgReadTimeSeconds: 278,
		readTimeTrend: 5.1,
		bounceRate: 29.8,
		bounceRateTrend: -3.4,
	},
	"30d": {
		totalViews: 148290,
		viewsTrend: 24.2,
		uniqueVisitors: 98400,
		visitorsTrend: 19.8,
		avgReadTimeSeconds: 285,
		readTimeTrend: 6.8,
		bounceRate: 28.5,
		bounceRateTrend: -4.2,
	},
	"90d": {
		totalViews: 482100,
		viewsTrend: 31.5,
		uniqueVisitors: 312800,
		visitorsTrend: 26.3,
		avgReadTimeSeconds: 292,
		readTimeTrend: 8.4,
		bounceRate: 27.9,
		bounceRateTrend: -5.0,
	},
	"1y": {
		totalViews: 1845000,
		viewsTrend: 42.0,
		uniqueVisitors: 1189000,
		visitorsTrend: 35.7,
		avgReadTimeSeconds: 298,
		readTimeTrend: 10.2,
		bounceRate: 27.1,
		bounceRateTrend: -6.4,
	},
};

export function generateAnalyticsTimeSeries(
	range: AnalyticsTimeRange,
): AnalyticsTimeSeriesPoint[] {
	const count =
		range === "24h"
			? 24
			: range === "7d"
				? 7
				: range === "30d"
					? 30
					: range === "90d"
						? 90
						: 365;

	const rand = mulberry32(count * 777);
	const points: AnalyticsTimeSeriesPoint[] = [];
	const now = Date.now();

	if (range === "24h") {
		for (let i = 23; i >= 0; i--) {
			const time = new Date(now - i * 3600 * 1000);
			const hourStr = `${time.getHours().toString().padStart(2, "0")}:00`;
			const base = 120 + Math.sin(i / 3) * 60;
			const views = Math.max(20, Math.round(base + rand() * 80));
			const visitors = Math.max(10, Math.round(views * (0.6 + rand() * 0.2)));
			points.push({
				date: hourStr,
				views,
				visitors,
			});
		}
		return points;
	}

	// Daily points for 7d, 30d, 90d, 1y (sample down if 1y)
	const stepDays = range === "1y" ? 7 : 1;
	const loopSteps = Math.floor(count / stepDays);

	for (let i = loopSteps - 1; i >= 0; i--) {
		const daysAgo = i * stepDays;
		const dateObj = new Date(now - daysAgo * 24 * 3600 * 1000);
		const dateStr = dateObj.toISOString().slice(0, 10);
		const wave = 1 + 0.35 * Math.sin(daysAgo / 5);
		const baseline = 950 + (count - daysAgo) * 4;
		const views = Math.round((baseline * wave + rand() * 450) * stepDays);
		const visitors = Math.round(views * (0.62 + rand() * 0.12));
		points.push({
			date: dateStr,
			views,
			visitors,
		});
	}

	return points;
}

export const mockDocPagesAnalytics: DocPageAnalytics[] = [
	{
		pageId: "doc-1",
		pageTitle: "Introduction to Spile",
		projectId: "doc-proj-developer-docs",
		projectName: "Developer Platform & API",
		slug: "introduction",
		locale: "en",
		views: 42150,
		uniqueVisitors: 28430,
		avgReadTimeSeconds: 195,
		bounceRate: 24.1,
		lastVisitedAt: Date.now() - 4 * 60 * 1000,
	},
	{
		pageId: "doc-2",
		pageTitle: "Installation & Quickstart",
		projectId: "doc-proj-developer-docs",
		projectName: "Developer Platform & API",
		slug: "installation",
		locale: "en",
		views: 38920,
		uniqueVisitors: 26110,
		avgReadTimeSeconds: 310,
		bounceRate: 21.8,
		lastVisitedAt: Date.now() - 12 * 60 * 1000,
	},
	{
		pageId: "doc-3",
		pageTitle: "Architecture & Data Model",
		projectId: "doc-proj-developer-docs",
		projectName: "Developer Platform & API",
		slug: "architecture",
		locale: "en",
		views: 24500,
		uniqueVisitors: 16900,
		avgReadTimeSeconds: 420,
		bounceRate: 28.4,
		lastVisitedAt: Date.now() - 25 * 60 * 1000,
	},
	{
		pageId: "doc-4",
		pageTitle: "Authentication & API Keys",
		projectId: "doc-proj-developer-docs",
		projectName: "Developer Platform & API",
		slug: "authentication",
		locale: "en",
		views: 19800,
		uniqueVisitors: 14350,
		avgReadTimeSeconds: 275,
		bounceRate: 26.5,
		lastVisitedAt: Date.now() - 42 * 60 * 1000,
	},
	{
		pageId: "doc-1-es",
		pageTitle: "Introducción a Spile",
		projectId: "doc-proj-developer-docs",
		projectName: "Developer Platform & API",
		slug: "introduccion",
		locale: "es",
		views: 7420,
		uniqueVisitors: 5120,
		avgReadTimeSeconds: 205,
		bounceRate: 25.0,
		lastVisitedAt: Date.now() - 65 * 60 * 1000,
	},
	{
		pageId: "doc-handbook-1",
		pageTitle: "Editorial Guidelines & Tone",
		projectId: "doc-proj-user-handbook",
		projectName: "Editorial Handbook & Style Guide",
		slug: "editorial-guidelines",
		locale: "en",
		views: 5210,
		uniqueVisitors: 3480,
		avgReadTimeSeconds: 380,
		bounceRate: 34.2,
		lastVisitedAt: Date.now() - 120 * 60 * 1000,
	},
];

export const mockPostsAnalytics: PostAnalytics[] = [
	{
		postId: "p1",
		title: "Designing Spile's block editor: what we learned from Editor.js",
		slug: "designing-spiles-block-editor",
		views: 12840,
		uniqueVisitors: 8940,
		avgReadTimeSeconds: 340,
		bounceRate: 26.8,
		lastVisitedAt: Date.now() - 8 * 60 * 1000,
	},
	{
		postId: "p2",
		title: "Introducing webhooks: automate everything around your content",
		slug: "introducing-webhooks",
		views: 8320,
		uniqueVisitors: 5910,
		avgReadTimeSeconds: 290,
		bounceRate: 31.2,
		lastVisitedAt: Date.now() - 18 * 60 * 1000,
	},
	{
		postId: "p4",
		title: "The case for self-hosting your publishing platform",
		slug: "the-case-for-self-hosting",
		views: 9450,
		uniqueVisitors: 6720,
		avgReadTimeSeconds: 385,
		bounceRate: 24.5,
		lastVisitedAt: Date.now() - 32 * 60 * 1000,
	},
	{
		postId: "p3",
		title: "How to build a newsletter workflow that doesn't wake you up at 3am",
		slug: "how-to-build-a-newsletter-workflow",
		views: 6210,
		uniqueVisitors: 4410,
		avgReadTimeSeconds: 315,
		bounceRate: 29.0,
		lastVisitedAt: Date.now() - 55 * 60 * 1000,
	},
	{
		postId: "p5",
		title: "KaTeX in the editor: math that actually survives copy-paste",
		slug: "katex-in-the-editor",
		views: 4120,
		uniqueVisitors: 2890,
		avgReadTimeSeconds: 240,
		bounceRate: 33.1,
		lastVisitedAt: Date.now() - 95 * 60 * 1000,
	},
];

export const mockCountryTraffic: CountryTraffic[] = [
	{
		countryCode: "US",
		countryName: "United States",
		views: 52400,
		visitors: 34800,
		percentage: 35.3,
	},
	{
		countryCode: "DE",
		countryName: "Germany",
		views: 21800,
		visitors: 14600,
		percentage: 14.7,
	},
	{
		countryCode: "GB",
		countryName: "United Kingdom",
		views: 18200,
		visitors: 12100,
		percentage: 12.3,
	},
	{
		countryCode: "FR",
		countryName: "France",
		views: 11400,
		visitors: 7600,
		percentage: 7.7,
	},
	{
		countryCode: "JP",
		countryName: "Japan",
		views: 9800,
		visitors: 6450,
		percentage: 6.6,
	},
	{
		countryCode: "CA",
		countryName: "Canada",
		views: 8900,
		visitors: 5900,
		percentage: 6.0,
	},
	{
		countryCode: "ET",
		countryName: "Ethiopia",
		views: 6200,
		visitors: 4100,
		percentage: 4.2,
	},
	{
		countryCode: "BR",
		countryName: "Brazil",
		views: 5800,
		visitors: 3950,
		percentage: 3.9,
	},
	{
		countryCode: "IN",
		countryName: "India",
		views: 5100,
		visitors: 3420,
		percentage: 3.4,
	},
	{
		countryCode: "NL",
		countryName: "Netherlands",
		views: 3900,
		visitors: 2600,
		percentage: 2.6,
	},
	{
		countryCode: "AU",
		countryName: "Australia",
		views: 3200,
		visitors: 2150,
		percentage: 2.2,
	},
	{
		countryCode: "ES",
		countryName: "Spain",
		views: 1590,
		visitors: 1030,
		percentage: 1.1,
	},
];

export const mockReferrerSources: ReferrerSource[] = [
	{
		source: "Google Search",
		visitors: 48900,
		percentage: 49.7,
	},
	{
		source: "Direct / Bookmark",
		visitors: 22400,
		percentage: 22.8,
	},
	{
		source: "GitHub / Repo Docs",
		visitors: 14100,
		percentage: 14.3,
	},
	{
		source: "Twitter / X",
		visitors: 6800,
		percentage: 6.9,
	},
	{
		source: "Hacker News",
		visitors: 3900,
		percentage: 4.0,
	},
	{
		source: "Reddit",
		visitors: 2300,
		percentage: 2.3,
	},
];

export const mockDeviceDistribution: DeviceDistribution = {
	desktop: 68.4,
	mobile: 26.2,
	tablet: 5.4,
};

export function getEntityAnalyticsDetail(
	entityType: "post" | "doc",
	entityId: string,
	timeRange: AnalyticsTimeRange = "30d",
): import("@/types/analytics").PageAnalyticsDetail {
	let title = "Document / Post";
	let slug = entityId;
	let locale = "en";
	let projectId: string | undefined;
	let projectName: string | undefined;
	let baseViews = 12500;

	if (entityType === "doc") {
		const doc = mockDocPagesAnalytics.find((d) => d.pageId === entityId);
		if (doc) {
			title = doc.pageTitle;
			slug = doc.slug;
			locale = doc.locale;
			projectId = doc.projectId;
			projectName = doc.projectName;
			baseViews = doc.views;
		} else {
			title = `Doc ${entityId}`;
			slug = entityId;
		}
	} else {
		const post = mockPostsAnalytics.find((p) => p.postId === entityId);
		if (post) {
			title = post.title;
			slug = post.slug;
			baseViews = post.views;
		} else {
			title = `Post ${entityId}`;
			slug = entityId;
		}
	}

	// Multiplier based on timeRange
	const rangeMult =
		timeRange === "24h"
			? 0.03
			: timeRange === "7d"
				? 0.22
				: timeRange === "30d"
					? 1.0
					: timeRange === "90d"
						? 2.8
						: 7.2;

	const views = Math.round(baseViews * rangeMult);
	const visitors = Math.round(views * 0.68);
	const avgReadTime = 260 + (entityId.charCodeAt(0) % 80);
	const bounceRate = 22.5 + (entityId.charCodeAt(entityId.length - 1) % 15);

	const overview: AnalyticsOverview = {
		totalViews: views,
		viewsTrend: 16.4,
		uniqueVisitors: visitors,
		visitorsTrend: 12.8,
		avgReadTimeSeconds: avgReadTime,
		readTimeTrend: 4.2,
		bounceRate: bounceRate,
		bounceRateTrend: -3.1,
	};

	// Generate time series scaled to this specific entity
	const globalSeries = generateAnalyticsTimeSeries(timeRange);
	const ratio = views / (mockOverviewData[timeRange]?.totalViews || 148290);
	const timeSeries = globalSeries.map((pt) => ({
		date: pt.date,
		views: Math.max(1, Math.round(pt.views * ratio * 1.5)),
		visitors: Math.max(1, Math.round(pt.visitors * ratio * 1.5)),
	}));

	// Top countries scaled
	const countries: CountryTraffic[] = mockCountryTraffic.map((c) => ({
		...c,
		views: Math.round(c.views * ratio * 1.5),
		visitors: Math.round(c.visitors * ratio * 1.5),
	}));

	// Referrers
	const referrers: ReferrerSource[] = mockReferrerSources.map((r) => ({
		...r,
		visitors: Math.round(r.visitors * ratio * 1.5),
	}));

	return {
		entityId,
		entityType,
		title,
		slug,
		locale,
		projectId,
		projectName,
		status: "published",
		overview,
		timeSeries,
		countries,
		referrers,
		devices: mockDeviceDistribution,
	};
}
