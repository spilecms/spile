import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Key, Plus, Trash2, Webhook as WebhookIcon } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { mockApi } from "@/lib/mock/api";

export function ApiKeysSection() {
	const queryClient = useQueryClient();
	const [keyDialogOpen, setKeyDialogOpen] = React.useState(false);
	const [keyName, setKeyName] = React.useState("");
	const [keyType, setKeyType] = React.useState<"public_read" | "admin_secret">(
		"public_read",
	);

	const [webhookDialogOpen, setWebhookDialogOpen] = React.useState(false);
	const [webhookName, setWebhookName] = React.useState("");
	const [webhookUrl, setWebhookUrl] = React.useState("");
	const [selectedEvents, setSelectedEvents] = React.useState<string[]>([
		"post.published",
	]);

	const { data: apiKeys, isLoading: keysLoading } = useQuery({
		queryKey: ["settings", "api-keys"],
		queryFn: () => mockApi.settings.listApiKeys(),
	});

	const { data: webhooks, isLoading: webhooksLoading } = useQuery({
		queryKey: ["settings", "webhooks"],
		queryFn: () => mockApi.settings.listWebhooks(),
	});

	const createKeyMutation = useMutation({
		mutationFn: () => mockApi.settings.createApiKey(keyName, keyType),
		onSuccess: (newKey) => {
			queryClient.invalidateQueries({ queryKey: ["settings", "api-keys"] });
			toast.success(`Generated ${newKey.name}`);
			setKeyDialogOpen(false);
			setKeyName("");
		},
		onError: () => toast.error("Failed to generate API key"),
	});

	const deleteKeyMutation = useMutation({
		mutationFn: (id: string) => mockApi.settings.deleteApiKey(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settings", "api-keys"] });
			toast.success("API key deleted");
		},
		onError: () => toast.error("Failed to delete API key"),
	});

	const createWebhookMutation = useMutation({
		mutationFn: () =>
			mockApi.settings.createWebhook({
				name: webhookName,
				url: webhookUrl,
				events: selectedEvents,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settings", "webhooks"] });
			toast.success("Webhook endpoint registered");
			setWebhookDialogOpen(false);
			setWebhookName("");
			setWebhookUrl("");
		},
		onError: () => toast.error("Failed to create webhook"),
	});

	const deleteWebhookMutation = useMutation({
		mutationFn: (id: string) => mockApi.settings.deleteWebhook(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settings", "webhooks"] });
			toast.success("Webhook endpoint removed");
		},
		onError: () => toast.error("Failed to remove webhook"),
	});

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
		toast.success("Copied to clipboard");
	};

	return (
		<div className="flex flex-col gap-6">
			{/* API Keys */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
					<div>
						<CardTitle className="text-base font-semibold flex items-center gap-2">
							<Key className="size-4 text-primary" />
							<span>API Access Tokens</span>
						</CardTitle>
						<CardDescription className="text-xs mt-1">
							Authenticate requests from your headless frontend websites
							(Next.js, Astro) and backend microservices.
						</CardDescription>
					</div>
					<Button
						size="sm"
						onClick={() => setKeyDialogOpen(true)}
						className="gap-1.5 h-8 text-xs shrink-0"
					>
						<Plus className="size-3.5" />
						<span>Generate Token</span>
					</Button>
				</CardHeader>
				<CardContent>
					<div className="rounded-lg border overflow-hidden">
						<table className="w-full text-xs">
							<thead>
								<tr className="border-b bg-muted/40 text-left text-muted-foreground">
									<th className="py-2.5 px-3 font-medium">Name</th>
									<th className="py-2.5 px-3 font-medium">Token Prefix</th>
									<th className="py-2.5 px-3 font-medium">Scope</th>
									<th className="py-2.5 px-3 font-medium">Last Used</th>
									<th className="py-2.5 px-3 text-right font-medium">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border/60">
								{keysLoading ? (
									<tr>
										<td
											colSpan={5}
											className="py-6 text-center text-muted-foreground"
										>
											Loading API keys…
										</td>
									</tr>
								) : (apiKeys ?? []).length === 0 ? (
									<tr>
										<td
											colSpan={5}
											className="py-6 text-center text-muted-foreground"
										>
											No API tokens generated yet.
										</td>
									</tr>
								) : (
									(apiKeys ?? []).map((key) => (
										<tr
											key={key.id}
											className="hover:bg-muted/30 transition-colors"
										>
											<td className="py-2.5 px-3 font-medium text-foreground">
												{key.name}
											</td>
											<td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
												<div className="flex items-center gap-1.5">
													<span>{key.prefix}</span>
													<Button
														variant="ghost"
														size="icon"
														className="size-5 text-muted-foreground hover:text-foreground"
														onClick={() => copyToClipboard(key.prefix)}
														title="Copy prefix"
													>
														<Copy className="size-3" />
													</Button>
												</div>
											</td>
											<td className="py-2.5 px-3">
												{key.type === "public_read" ? (
													<Badge
														variant="secondary"
														className="text-[10px] h-5 px-1.5 font-normal"
													>
														Public Read
													</Badge>
												) : (
													<Badge
														variant="destructive"
														className="text-[10px] h-5 px-1.5 font-normal"
													>
														Admin Secret
													</Badge>
												)}
											</td>
											<td className="py-2.5 px-3 text-muted-foreground">
												{key.lastUsedAt ? "Recently" : "Never used"}
											</td>
											<td className="py-2.5 px-3 text-right">
												<Button
													variant="ghost"
													size="icon"
													className="size-7 text-muted-foreground hover:text-destructive"
													onClick={() => {
														if (window.confirm(`Revoke key "${key.name}"?`)) {
															deleteKeyMutation.mutate(key.id);
														}
													}}
													title="Revoke token"
												>
													<Trash2 className="size-3.5" />
												</Button>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>

			{/* Webhooks */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
					<div>
						<CardTitle className="text-base font-semibold flex items-center gap-2">
							<WebhookIcon className="size-4 text-primary" />
							<span>Webhooks</span>
						</CardTitle>
						<CardDescription className="text-xs mt-1">
							Notify external deployment webhooks (e.g. Vercel, Netlify,
							Cloudflare) when content is published or updated.
						</CardDescription>
					</div>
					<Button
						size="sm"
						onClick={() => setWebhookDialogOpen(true)}
						className="gap-1.5 h-8 text-xs shrink-0"
					>
						<Plus className="size-3.5" />
						<span>Add Endpoint</span>
					</Button>
				</CardHeader>
				<CardContent>
					<div className="rounded-lg border overflow-hidden">
						<table className="w-full text-xs">
							<thead>
								<tr className="border-b bg-muted/40 text-left text-muted-foreground">
									<th className="py-2.5 px-3 font-medium">Name</th>
									<th className="py-2.5 px-3 font-medium">Target URL</th>
									<th className="py-2.5 px-3 font-medium">Subscribed Events</th>
									<th className="py-2.5 px-3 text-right font-medium">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border/60">
								{webhooksLoading ? (
									<tr>
										<td
											colSpan={4}
											className="py-6 text-center text-muted-foreground"
										>
											Loading webhooks…
										</td>
									</tr>
								) : (webhooks ?? []).length === 0 ? (
									<tr>
										<td
											colSpan={4}
											className="py-6 text-center text-muted-foreground"
										>
											No webhooks configured.
										</td>
									</tr>
								) : (
									(webhooks ?? []).map((wh) => (
										<tr
											key={wh.id}
											className="hover:bg-muted/30 transition-colors"
										>
											<td className="py-2.5 px-3 font-medium text-foreground">
												{wh.name}
											</td>
											<td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground max-w-xs truncate">
												{wh.url}
											</td>
											<td className="py-2.5 px-3">
												<div className="flex flex-wrap gap-1">
													{wh.events.map((evt) => (
														<Badge
															key={evt}
															variant="outline"
															className="text-[10px] h-4.5 px-1 font-mono"
														>
															{evt}
														</Badge>
													))}
												</div>
											</td>
											<td className="py-2.5 px-3 text-right">
												<Button
													variant="ghost"
													size="icon"
													className="size-7 text-muted-foreground hover:text-destructive"
													onClick={() => {
														if (
															window.confirm(`Delete webhook "${wh.name}"?`)
														) {
															deleteWebhookMutation.mutate(wh.id);
														}
													}}
													title="Delete webhook"
												>
													<Trash2 className="size-3.5" />
												</Button>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>

			{/* Create Token Dialog */}
			<Dialog open={keyDialogOpen} onOpenChange={setKeyDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Key className="size-4 text-primary" />
							<span>Generate API Token</span>
						</DialogTitle>
						<DialogDescription className="text-xs">
							Create a new API token for client headless sites or backend
							administrative scripts.
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-3 py-2">
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs">Token Name / Description</Label>
							<Input
								placeholder="e.g. Next.js Production Frontend"
								value={keyName}
								onChange={(e) => setKeyName(e.target.value)}
								className="h-8 text-xs"
							/>
						</div>

						<div className="flex flex-col gap-1.5">
							<Label className="text-xs">Token Permission Scope</Label>
							<Select
								value={keyType}
								onValueChange={(val) =>
									setKeyType(val as "public_read" | "admin_secret")
								}
							>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue placeholder="Select permission scope" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="public_read" className="text-xs">
										Public Read-Only (Safe for frontend static sites)
									</SelectItem>
									<SelectItem value="admin_secret" className="text-xs">
										Admin Full Access (Read/Write for backend servers)
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setKeyDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							size="sm"
							onClick={() => createKeyMutation.mutate()}
							disabled={!keyName.trim() || createKeyMutation.isPending}
						>
							{createKeyMutation.isPending ? "Generating…" : "Generate Token"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Create Webhook Dialog */}
			<Dialog open={webhookDialogOpen} onOpenChange={setWebhookDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<WebhookIcon className="size-4 text-primary" />
							<span>Register Webhook Endpoint</span>
						</DialogTitle>
						<DialogDescription className="text-xs">
							We will send an HTTP POST payload to this URL when events occur.
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-3 py-2">
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs">Endpoint Name</Label>
							<Input
								placeholder="e.g. Vercel Production Revalidation"
								value={webhookName}
								onChange={(e) => setWebhookName(e.target.value)}
								className="h-8 text-xs"
							/>
						</div>

						<div className="flex flex-col gap-1.5">
							<Label className="text-xs">Target POST URL</Label>
							<Input
								placeholder="https://mysite.com/api/revalidate"
								value={webhookUrl}
								onChange={(e) => setWebhookUrl(e.target.value)}
								className="h-8 text-xs font-mono"
							/>
						</div>

						<div className="flex flex-col gap-1.5">
							<Label className="text-xs">Events</Label>
							<div className="flex flex-wrap gap-1.5">
								{["post.published", "doc.updated", "newsletter.sent"].map(
									(evt) => {
										const isSelected = selectedEvents.includes(evt);
										return (
											<button
												key={evt}
												type="button"
												onClick={() =>
													setSelectedEvents((prev) =>
														isSelected
															? prev.filter((e) => e !== evt)
															: [...prev, evt],
													)
												}
												className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
													isSelected
														? "bg-primary text-primary-foreground border-primary"
														: "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
												}`}
											>
												{evt}
											</button>
										);
									},
								)}
							</div>
						</div>
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setWebhookDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							size="sm"
							onClick={() => createWebhookMutation.mutate()}
							disabled={
								!webhookName.trim() ||
								!webhookUrl.trim() ||
								selectedEvents.length === 0 ||
								createWebhookMutation.isPending
							}
						>
							{createWebhookMutation.isPending
								? "Adding…"
								: "Register Endpoint"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
