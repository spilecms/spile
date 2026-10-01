const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatRelativeTime(
	timestamp: number,
	now = Date.now(),
): string {
	const diff = now - timestamp;
	if (diff < MINUTE) return "just now";
	if (diff < HOUR) {
		const minutes = Math.floor(diff / MINUTE);
		return `${minutes}m ago`;
	}
	if (diff < DAY) {
		const hours = Math.floor(diff / HOUR);
		return `${hours}h ago`;
	}
	if (diff < 7 * DAY) {
		const days = Math.floor(diff / DAY);
		return `${days}d ago`;
	}
	return new Date(timestamp).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year:
			new Date(timestamp).getFullYear() === new Date(now).getFullYear()
				? undefined
				: "numeric",
	});
}

export function formatNumber(value: number): string {
	if (value >= 1_000_000) {
		return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
	}
	if (value >= 10_000) {
		return `${(value / 1_000).toFixed(0)}K`;
	}
	if (value >= 1_000) {
		return `${(value / 1_000).toFixed(1)}K`;
	}
	return value.toLocaleString("en-US");
}

export function formatDate(timestamp: number): string {
	return new Date(timestamp).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export function formatDateTime(timestamp: number): string {
	return new Date(timestamp).toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

export function formatReadingTime(minutes: number): string {
	return `${minutes} min read`;
}

export function formatPercent(value: number): string {
	const sign = value > 0 ? "+" : "";
	return `${sign}${value.toFixed(1)}%`;
}

export function slugify(input: string): string {
	return input
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, "")
		.replace(/[\s_-]+/g, "-")
		.replace(/^-+|-+$/g, "");
}
