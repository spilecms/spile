export type AnalyticsTimeRange = "24h" | "7d" | "30d" | "90d" | "1y";

export interface AnalyticsOverview {
	totalViews: number;
	viewsTrend: number;
	uniqueVisitors: number;
	visitorsTrend: number;
	avgReadTimeSeconds: number;
	readTimeTrend: number;
	bounceRate: number;
	bounceRateTrend: number;
}

export interface AnalyticsTimeSeriesPoint {
	date: string;
	views: number;
	visitors: number;
}

export interface DocPageAnalytics {
	pageId: string;
	pageTitle: string;
	projectId: string;
	projectName: string;
	slug: string;
	locale: string;
	views: number;
	uniqueVisitors: number;
	avgReadTimeSeconds: number;
	bounceRate: number;
	lastVisitedAt: number;
}

export interface PostAnalytics {
	postId: string;
	title: string;
	slug: string;
	views: number;
	uniqueVisitors: number;
	avgReadTimeSeconds: number;
	bounceRate: number;
	lastVisitedAt: number;
}

export interface CountryTraffic {
	countryCode: string; // ISO 3166-1 alpha-2, e.g. "US", "DE", "ET", "FR", "GB"
	countryName: string;
	views: number;
	visitors: number;
	percentage: number;
}

export interface ReferrerSource {
	source: string;
	visitors: number;
	percentage: number;
	icon?: string;
}

export interface DeviceDistribution {
	desktop: number;
	mobile: number;
	tablet: number;
}

export type AnalyticsEntityType = "post" | "doc";

export interface PageAnalyticsDetail {
	entityId: string;
	entityType: AnalyticsEntityType;
	title: string;
	slug: string;
	locale?: string;
	projectId?: string;
	projectName?: string;
	status: string;
	overview: AnalyticsOverview;
	timeSeries: AnalyticsTimeSeriesPoint[];
	countries: CountryTraffic[];
	referrers: ReferrerSource[];
	devices: DeviceDistribution;
}
