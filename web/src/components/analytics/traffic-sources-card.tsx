import { useQuery } from "@tanstack/react-query";
import {
	CompassIcon,
	LaptopIcon,
	SmartphoneIcon,
	TabletIcon,
} from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";
import { mockApi } from "@/lib/mock/api";

import type { DeviceDistribution, ReferrerSource } from "@/types/analytics";

export interface TrafficSourcesCardProps {
	referrers?: ReferrerSource[];
	devices?: DeviceDistribution;
	isLoading?: boolean;
}

export function TrafficSourcesCard({
	referrers: propReferrers,
	devices: propDevices,
	isLoading: propIsLoading,
}: TrafficSourcesCardProps = {}) {
	const { data: queriedReferrers, isLoading: qRefLoading } = useQuery({
		queryKey: ["analytics", "referrers"],
		queryFn: () => mockApi.analytics.getReferrers(),
		enabled: !propReferrers,
	});

	const { data: queriedDevices, isLoading: qDevLoading } = useQuery({
		queryKey: ["analytics", "devices"],
		queryFn: () => mockApi.analytics.getDevices(),
		enabled: !propDevices,
	});

	const referrers = propReferrers ?? queriedReferrers;
	const devices = propDevices ?? queriedDevices;
	const referrersLoading =
		propIsLoading ?? (propReferrers ? false : qRefLoading);
	const devicesLoading = propIsLoading ?? (propDevices ? false : qDevLoading);

	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
			{/* Referrers Card */}
			<Card className="shadow-none">
				<CardHeader className="border-b pb-4">
					<CardTitle className="text-base font-semibold flex items-center gap-2">
						<CompassIcon className="size-4 text-primary" />
						Top Referrer Channels
					</CardTitle>
					<CardDescription className="text-xs">
						Incoming acquisition sources and direct discovery pathways.
					</CardDescription>
				</CardHeader>
				<CardContent className="p-4 sm:p-6 flex flex-col gap-3.5">
					{referrersLoading
						? ["sk-ref-1", "sk-ref-2", "sk-ref-3", "sk-ref-4", "sk-ref-5"].map(
								(id) => (
									<div key={id} className="flex items-center justify-between">
										<Skeleton className="h-4 w-32" />
										<Skeleton className="h-4 w-14" />
									</div>
								),
							)
						: referrers?.map((ref) => (
								<div key={ref.source} className="flex flex-col gap-1.5">
									<div className="flex items-center justify-between text-xs">
										<span className="font-medium">{ref.source}</span>
										<div className="flex items-center gap-2 font-mono text-[11px]">
											<span className="text-muted-foreground">
												{formatNumber(ref.visitors)}
											</span>
											<span className="font-medium">
												{ref.percentage.toFixed(1)}%
											</span>
										</div>
									</div>
									<div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
										<div
											className="h-full bg-primary rounded-full transition-all duration-300"
											style={{
												width: `${Math.min(100, Math.max(0, ref.percentage))}%`,
											}}
										/>
									</div>
								</div>
							))}
				</CardContent>
			</Card>

			{/* Devices Card */}
			<Card className="shadow-none">
				<CardHeader className="border-b pb-4">
					<CardTitle className="text-base font-semibold flex items-center gap-2">
						<LaptopIcon className="size-4 text-primary" />
						Device Distribution
					</CardTitle>
					<CardDescription className="text-xs">
						Hardware breakdown of visiting readers and consumers.
					</CardDescription>
				</CardHeader>
				<CardContent className="p-4 sm:p-6 flex flex-col justify-between gap-6">
					{devicesLoading ? (
						<div className="flex flex-col gap-4">
							<Skeleton className="h-6 w-full" />
							<Skeleton className="h-16 w-full" />
						</div>
					) : devices ? (
						<>
							{/* Horizontal multi-color bar */}
							<div className="flex flex-col gap-2">
								<div className="h-3 w-full rounded-full overflow-hidden flex bg-muted">
									<div
										style={{ width: `${devices.desktop}%` }}
										className="bg-primary h-full transition-all"
										title={`Desktop: ${devices.desktop}%`}
									/>
									<div
										style={{ width: `${devices.mobile}%` }}
										className="bg-primary/60 h-full transition-all"
										title={`Mobile: ${devices.mobile}%`}
									/>
									<div
										style={{ width: `${devices.tablet}%` }}
										className="bg-primary/30 h-full transition-all"
										title={`Tablet: ${devices.tablet}%`}
									/>
								</div>
							</div>

							<div className="grid grid-cols-3 gap-3">
								<div className="flex flex-col items-center justify-center p-3 rounded-lg border bg-muted/20 text-center">
									<div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
										<LaptopIcon className="size-3.5 text-primary" />
										<span>Desktop</span>
									</div>
									<span className="text-lg font-bold font-mono">
										{devices.desktop.toFixed(1)}%
									</span>
								</div>

								<div className="flex flex-col items-center justify-center p-3 rounded-lg border bg-muted/20 text-center">
									<div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
										<SmartphoneIcon className="size-3.5 text-primary/75" />
										<span>Mobile</span>
									</div>
									<span className="text-lg font-bold font-mono">
										{devices.mobile.toFixed(1)}%
									</span>
								</div>

								<div className="flex flex-col items-center justify-center p-3 rounded-lg border bg-muted/20 text-center">
									<div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
										<TabletIcon className="size-3.5 text-primary/50" />
										<span>Tablet</span>
									</div>
									<span className="text-lg font-bold font-mono">
										{devices.tablet.toFixed(1)}%
									</span>
								</div>
							</div>
						</>
					) : null}
				</CardContent>
			</Card>
		</div>
	);
}
