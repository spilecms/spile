import { useQuery } from "@tanstack/react-query";
import { GlobeIcon } from "lucide-react";
import * as React from "react";
import { WorldMap } from "@/components/shadcnmaps/maps/world";
import type {
	MapRegionData,
	RegionOverride,
} from "@/components/shadcnmaps/types";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { CountryFlag } from "@/components/ui/country-flag";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";
import { mockApi } from "@/lib/mock/api";
import type { CountryTraffic } from "@/types/analytics";

export interface AudienceMapCardProps {
	countries?: CountryTraffic[];
	isLoading?: boolean;
}

export function AudienceMapCard({
	countries: propCountries,
	isLoading: propIsLoading,
}: AudienceMapCardProps = {}) {
	const [selectedCode, setSelectedCode] = React.useState<string | null>(null);

	const { data: queriedCountries, isLoading: queryLoading } = useQuery({
		queryKey: ["analytics", "countries"],
		queryFn: () => mockApi.analytics.getCountries(),
		enabled: !propCountries,
	});

	const countries = propCountries ?? queriedCountries;
	const isLoading = propIsLoading ?? (propCountries ? false : queryLoading);

	const countryMap = React.useMemo(() => {
		const map = new Map<string, CountryTraffic>();
		if (!countries) return map;
		for (const c of countries) {
			map.set(c.countryCode.toUpperCase(), c);
		}
		return map;
	}, [countries]);

	const maxPercentage = React.useMemo(() => {
		if (!countries || countries.length === 0) return 100;
		return Math.max(...countries.map((c) => c.percentage));
	}, [countries]);

	// Umami-style styling: deep navy/slate palette matching the reference screenshot
	const regionOverrides = React.useMemo<RegionOverride[]>(() => {
		if (!countries) return [];
		return countries.map((c) => {
			const ratio = c.percentage / maxPercentage;
			// Vibrant electric/royal blue shades for active reader countries
			let fillClass = "fill-[#1d4ed8] stroke-[#38bdf8]/60 hover:fill-[#3b82f6]";

			if (ratio > 0.6) {
				// Top traffic (e.g. US) - bright primary blue
				fillClass = "fill-[#3b82f6] stroke-[#60a5fa] hover:fill-[#60a5fa]";
			} else if (ratio > 0.25) {
				// Medium-high traffic
				fillClass = "fill-[#2563eb] stroke-[#38bdf8]/80 hover:fill-[#3b82f6]";
			} else if (ratio > 0.1) {
				// Moderate traffic
				fillClass = "fill-[#1e40af] stroke-[#0284c7]/70 hover:fill-[#2563eb]";
			} else {
				// Lower recorded traffic
				fillClass = "fill-[#1e3a8a] stroke-[#0369a1]/50 hover:fill-[#1d4ed8]";
			}

			return {
				id: c.countryCode.toUpperCase(),
				name: c.countryName,
				className: `${fillClass} transition-colors duration-150 cursor-pointer stroke-[1]`,
			};
		});
	}, [countries, maxPercentage]);

	const renderTooltip = (region: MapRegionData) => {
		const stats = countryMap.get(region.id.toUpperCase());
		return (
			<div className="flex items-center gap-2 rounded-md border border-sky-900/40 bg-[#0f172a]/95 px-3 py-2 shadow-xl backdrop-blur-md text-xs text-slate-100">
				<CountryFlag
					countryCode={region.id}
					className="size-4 shrink-0 shadow-xs"
				/>
				<div>
					<p className="font-semibold text-sky-200">{region.name}</p>
					{stats ? (
						<p className="text-[11px] text-slate-300">
							<span className="font-bold text-white">
								{formatNumber(stats.views)}
							</span>{" "}
							views ({stats.percentage.toFixed(1)}%)
						</p>
					) : (
						<p className="text-[11px] text-slate-400">No visitors tracked</p>
					)}
				</div>
			</div>
		);
	};

	const sortedCountries = React.useMemo(() => {
		if (!countries) return [];
		return [...countries].sort((a, b) => b.views - a.views);
	}, [countries]);

	return (
		<Card className="shadow-none border overflow-hidden">
			<CardHeader className="border-b pb-3 px-5">
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="text-base font-semibold flex items-center gap-2">
							<GlobeIcon className="size-4 text-primary" />
							Global Reader Geography
						</CardTitle>
						<CardDescription className="text-xs">
							Interactive, zoomable world map showing traffic volume by country.
						</CardDescription>
					</div>
					<Badge variant="outline" className="text-xs font-mono font-normal">
						{countries?.length ?? 0} active countries
					</Badge>
				</div>
			</CardHeader>

			<CardContent className="p-0">
				{/* Full-width, huge canvas matching the reference screenshot */}
				<div className="w-full relative bg-[#090d16] flex flex-col justify-between overflow-hidden border-b">
					{isLoading ? (
						<div className="flex items-center justify-center h-[560px]">
							<Skeleton className="h-[460px] w-full max-w-3xl bg-slate-800/40" />
						</div>
					) : (
						<div className="w-full h-[520px] sm:h-[600px] lg:h-[680px] relative select-none">
							{/* Zoomable WorldMap */}
							<WorldMap
								regions={regionOverrides}
								renderTooltip={renderTooltip}
								selectedRegion={selectedCode}
								onRegionClick={(event) => {
									setSelectedCode(event.region.id);
								}}
								enableZoom={true}
								zoomConfig={{
									minZoom: 1,
									maxZoom: 8,
									zoomStep: 0.5,
									panStep: 50,
								}}
								className="w-full h-full cursor-grab active:cursor-grabbing text-blue-500 [&_path]:stroke-[#1e3a8a] [&_path]:stroke-[0.8] [&_[data-slot=map-region]:not([class*='fill-'])]:fill-[#0f172a] [&_[data-slot=map-region]:not([class*='fill-'])]:hover:fill-[#1e293b]"
							/>
						</div>
					)}

					{/* Bottom status & choropleth bar */}
					<div className="flex items-center justify-between px-4 py-2 text-[11px] text-slate-400 bg-[#070a12]/90 border-t border-slate-800/60 backdrop-blur-xs">
						<span className="flex items-center gap-2">
							<span className="inline-block size-1.5 rounded-full bg-sky-400 animate-pulse" />
							<span>
								Scroll wheel to zoom in/out • Click and drag to pan • Click any
								country to filter
							</span>
						</span>
						<div className="flex items-center gap-2">
							<span className="text-[10px] uppercase tracking-wider text-slate-400">
								Traffic
							</span>
							<div className="flex h-2 w-20 overflow-hidden rounded-[2px] border border-slate-700/50">
								<span className="h-full w-1/4 bg-[#1e3a8a]" title="Low" />
								<span className="h-full w-1/4 bg-[#1e40af]" />
								<span className="h-full w-1/4 bg-[#2563eb]" />
								<span className="h-full w-1/4 bg-[#3b82f6]" title="High" />
							</div>
						</div>
					</div>
				</div>

				{/* Ranked Territories Grid below the huge map */}
				<div className="p-4 sm:p-5 bg-card">
					<div className="flex items-center justify-between pb-2 mb-3 border-b">
						<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							Top Territories Breakdown
						</span>
						<span className="text-xs text-muted-foreground font-mono">
							{sortedCountries.length} countries recorded
						</span>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
						{isLoading
							? [
									"sk-geo-1",
									"sk-geo-2",
									"sk-geo-3",
									"sk-geo-4",
									"sk-geo-5",
									"sk-geo-6",
									"sk-geo-7",
									"sk-geo-8",
								].map((skId) => (
									<div
										key={skId}
										className="flex items-center justify-between p-2 rounded-md border"
									>
										<Skeleton className="h-4 w-28" />
										<Skeleton className="h-4 w-12" />
									</div>
								))
							: sortedCountries.slice(0, 12).map((c) => (
									<button
										type="button"
										key={c.countryCode}
										onClick={() => setSelectedCode(c.countryCode)}
										className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all text-left ${
											selectedCode === c.countryCode
												? "border-primary bg-primary/10 text-primary font-medium ring-1 ring-primary/30"
												: "hover:bg-muted/50 border-border/60 bg-muted/20"
										}`}
									>
										<div className="flex items-center gap-2 truncate">
											<CountryFlag
												countryCode={c.countryCode}
												className="size-4 shrink-0 shadow-xs"
											/>
											<span className="truncate font-medium">
												{c.countryName}
											</span>
										</div>
										<div className="flex items-center gap-1.5 font-mono text-[11px] shrink-0">
											<span className="text-muted-foreground">
												{formatNumber(c.views)}
											</span>
											<span className="font-semibold text-foreground">
												{c.percentage.toFixed(1)}%
											</span>
										</div>
									</button>
								))}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
