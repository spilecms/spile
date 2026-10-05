import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, CheckCircle2, Cloud, Mail, Send, Sparkles } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { mockApi } from "@/lib/mock/api";
import type {
	AiProviderType,
	AiSettings,
	EmailProviderType,
	EmailSettings,
	StorageProviderType,
	StorageSettings,
} from "@/types/domain";

export function IntegrationsSection() {
	const queryClient = useQueryClient();

	// Storage Settings Query & Mutation
	const { data: storage } = useQuery({
		queryKey: ["settings", "storage"],
		queryFn: () => mockApi.settings.getStorage(),
	});

	const [localStorage, setLocalStorage] =
		React.useState<StorageSettings | null>(null);

	React.useEffect(() => {
		if (storage) setLocalStorage(storage);
	}, [storage]);

	const saveStorageMutation = useMutation({
		mutationFn: (patch: Partial<StorageSettings>) =>
			mockApi.settings.updateStorage(patch),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settings", "storage"] });
			toast.success("Storage settings saved");
		},
		onError: () => toast.error("Failed to save storage settings"),
	});

	// Email Settings Query & Mutation
	const { data: email } = useQuery({
		queryKey: ["settings", "email"],
		queryFn: () => mockApi.settings.getEmail(),
	});

	const [localEmail, setLocalEmail] = React.useState<EmailSettings | null>(
		null,
	);

	React.useEffect(() => {
		if (email) setLocalEmail(email);
	}, [email]);

	const saveEmailMutation = useMutation({
		mutationFn: (patch: Partial<EmailSettings>) =>
			mockApi.settings.updateEmail(patch),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settings", "email"] });
			toast.success("Email & Newsletter settings saved");
		},
		onError: () => toast.error("Failed to save email settings"),
	});

	// AI Settings Query & Mutation
	const { data: ai } = useQuery({
		queryKey: ["settings", "ai"],
		queryFn: () => mockApi.settings.getAi(),
	});

	const [localAi, setLocalAi] = React.useState<AiSettings | null>(null);

	React.useEffect(() => {
		if (ai) setLocalAi(ai);
	}, [ai]);

	const saveAiMutation = useMutation({
		mutationFn: (patch: Partial<AiSettings>) =>
			mockApi.settings.updateAi(patch),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settings", "ai"] });
			toast.success("AI Copilot settings saved");
		},
		onError: () => toast.error("Failed to save AI settings"),
	});

	const handleTestEmail = () => {
		toast.success("Test email sent to your current account address!");
	};

	const handleTestStorage = () => {
		toast.success("Successfully connected to S3/R2 storage bucket!");
	};

	return (
		<div className="flex flex-col gap-6">
			{/* 1. Storage Integration */}
			<Card>
				<CardHeader className="pb-4">
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-base font-semibold flex items-center gap-2">
								<Cloud className="size-4 text-primary" />
								<span>Cloud Storage (Media & Attachments)</span>
							</CardTitle>
							<CardDescription className="text-xs mt-1">
								Connect Cloudflare R2, AWS S3, or MinIO for file and image
								uploads in the editor.
							</CardDescription>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={handleTestStorage}
							className="h-8 text-xs gap-1.5"
						>
							<CheckCircle2 className="size-3.5 text-emerald-500" />
							<span>Test Connection</span>
						</Button>
					</div>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs">Storage Provider</Label>
							<Select
								value={localStorage?.provider ?? "r2"}
								onValueChange={(val) =>
									setLocalStorage((prev) =>
										prev
											? { ...prev, provider: val as StorageProviderType }
											: null,
									)
								}
							>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="r2" className="text-xs">
										Cloudflare R2 (S3 Compatible)
									</SelectItem>
									<SelectItem value="s3" className="text-xs">
										Amazon AWS S3
									</SelectItem>
									<SelectItem value="minio" className="text-xs">
										MinIO Self-Hosted
									</SelectItem>
									<SelectItem value="local" className="text-xs">
										Local Disk Storage
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="flex flex-col gap-1.5">
							<Label className="text-xs">Bucket Name</Label>
							<Input
								value={localStorage?.bucket ?? ""}
								onChange={(e) =>
									setLocalStorage((prev) =>
										prev ? { ...prev, bucket: e.target.value } : null,
									)
								}
								placeholder="spile-media-bucket"
								className="h-8 text-xs font-mono"
							/>
						</div>

						<div className="flex flex-col gap-1.5">
							<Label className="text-xs">S3 Endpoint URL</Label>
							<Input
								value={localStorage?.endpoint ?? ""}
								onChange={(e) =>
									setLocalStorage((prev) =>
										prev ? { ...prev, endpoint: e.target.value } : null,
									)
								}
								placeholder="https://<account>.r2.cloudflarestorage.com"
								className="h-8 text-xs font-mono"
							/>
						</div>

						<div className="flex flex-col gap-1.5">
							<Label className="text-xs">Public CDN / Media Domain</Label>
							<Input
								value={localStorage?.publicUrl ?? ""}
								onChange={(e) =>
									setLocalStorage((prev) =>
										prev ? { ...prev, publicUrl: e.target.value } : null,
									)
								}
								placeholder="https://media.yourdomain.com"
								className="h-8 text-xs font-mono"
							/>
						</div>

						<div className="flex flex-col gap-1.5">
							<Label className="text-xs">Access Key ID</Label>
							<Input
								value={localStorage?.accessKey ?? ""}
								onChange={(e) =>
									setLocalStorage((prev) =>
										prev ? { ...prev, accessKey: e.target.value } : null,
									)
								}
								placeholder="Access Key"
								className="h-8 text-xs font-mono"
							/>
						</div>

						<div className="flex flex-col gap-1.5">
							<Label className="text-xs">Secret Access Key</Label>
							<Input
								type="password"
								value={localStorage?.secretKey ?? ""}
								onChange={(e) =>
									setLocalStorage((prev) =>
										prev ? { ...prev, secretKey: e.target.value } : null,
									)
								}
								placeholder="••••••••••••••••••••••••"
								className="h-8 text-xs font-mono"
							/>
						</div>
					</div>

					<div className="flex justify-end pt-2">
						<Button
							size="sm"
							onClick={() =>
								localStorage && saveStorageMutation.mutate(localStorage)
							}
							disabled={saveStorageMutation.isPending}
							className="h-8 text-xs"
						>
							{saveStorageMutation.isPending
								? "Saving…"
								: "Save Storage Settings"}
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* 2. Email / Newsletter Integration */}
			<Card>
				<CardHeader className="pb-4">
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-base font-semibold flex items-center gap-2">
								<Mail className="size-4 text-primary" />
								<span>Email & Newsletter Provider</span>
							</CardTitle>
							<CardDescription className="text-xs mt-1">
								Configure who emails are sent from and your broadcast provider
								(Resend, AWS SES, or SMTP).
							</CardDescription>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={handleTestEmail}
							className="h-8 text-xs gap-1.5"
						>
							<Send className="size-3.5" />
							<span>Send Test Email</span>
						</Button>
					</div>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					{/* Sender Identity */}
					<div className="p-3 rounded-lg border bg-muted/20 flex flex-col gap-3">
						<span className="text-xs font-semibold text-foreground">
							Sender Identity (What subscribers see in their inbox)
						</span>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
							<div className="flex flex-col gap-1.5">
								<Label className="text-xs">From Name</Label>
								<Input
									value={localEmail?.fromName ?? ""}
									onChange={(e) =>
										setLocalEmail((prev) =>
											prev ? { ...prev, fromName: e.target.value } : null,
										)
									}
									placeholder="e.g. Spile Weekly"
									className="h-8 text-xs"
								/>
							</div>

							<div className="flex flex-col gap-1.5">
								<Label className="text-xs">From Email Address</Label>
								<Input
									type="email"
									value={localEmail?.fromEmail ?? ""}
									onChange={(e) =>
										setLocalEmail((prev) =>
											prev ? { ...prev, fromEmail: e.target.value } : null,
										)
									}
									placeholder="newsletter@spile.io"
									className="h-8 text-xs"
								/>
							</div>

							<div className="flex flex-col gap-1.5">
								<Label className="text-xs">Reply-To Email</Label>
								<Input
									type="email"
									value={localEmail?.replyTo ?? ""}
									onChange={(e) =>
										setLocalEmail((prev) =>
											prev ? { ...prev, replyTo: e.target.value } : null,
										)
									}
									placeholder="team@spile.io"
									className="h-8 text-xs"
								/>
							</div>
						</div>
					</div>

					{/* Provider Selection */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs">Delivery Provider</Label>
							<Select
								value={localEmail?.provider ?? "resend"}
								onValueChange={(val) =>
									setLocalEmail((prev) =>
										prev
											? { ...prev, provider: val as EmailProviderType }
											: null,
									)
								}
							>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="resend" className="text-xs">
										Resend (Recommended)
									</SelectItem>
									<SelectItem value="ses" className="text-xs">
										Amazon AWS SES
									</SelectItem>
									<SelectItem value="postmark" className="text-xs">
										Postmark
									</SelectItem>
									<SelectItem value="smtp" className="text-xs">
										Custom SMTP Server
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{localEmail?.provider !== "smtp" ? (
							<div className="flex flex-col gap-1.5">
								<Label className="text-xs">API Key / Server Token</Label>
								<Input
									type="password"
									value={localEmail?.apiKey ?? ""}
									onChange={(e) =>
										setLocalEmail((prev) =>
											prev ? { ...prev, apiKey: e.target.value } : null,
										)
									}
									placeholder="re_••••••••••••••••"
									className="h-8 text-xs font-mono"
								/>
							</div>
						) : (
							<>
								<div className="flex flex-col gap-1.5">
									<Label className="text-xs">SMTP Host</Label>
									<Input
										value={localEmail?.smtpHost ?? ""}
										onChange={(e) =>
											setLocalEmail((prev) =>
												prev ? { ...prev, smtpHost: e.target.value } : null,
											)
										}
										placeholder="smtp.mailgun.org"
										className="h-8 text-xs font-mono"
									/>
								</div>
								<div className="flex flex-col gap-1.5">
									<Label className="text-xs">SMTP Port</Label>
									<Input
										type="number"
										value={localEmail?.smtpPort ?? 587}
										onChange={(e) =>
											setLocalEmail((prev) =>
												prev
													? { ...prev, smtpPort: Number(e.target.value) }
													: null,
											)
										}
										className="h-8 text-xs font-mono"
									/>
								</div>
								<div className="flex flex-col gap-1.5">
									<Label className="text-xs">SMTP Username</Label>
									<Input
										value={localEmail?.smtpUser ?? ""}
										onChange={(e) =>
											setLocalEmail((prev) =>
												prev ? { ...prev, smtpUser: e.target.value } : null,
											)
										}
										className="h-8 text-xs"
									/>
								</div>
								<div className="flex flex-col gap-1.5">
									<Label className="text-xs">SMTP Password</Label>
									<Input
										type="password"
										value={localEmail?.smtpPassword ?? ""}
										onChange={(e) =>
											setLocalEmail((prev) =>
												prev ? { ...prev, smtpPassword: e.target.value } : null,
											)
										}
										className="h-8 text-xs"
									/>
								</div>
							</>
						)}
					</div>

					<div className="flex justify-end pt-2">
						<Button
							size="sm"
							onClick={() => localEmail && saveEmailMutation.mutate(localEmail)}
							disabled={saveEmailMutation.isPending}
							className="h-8 text-xs"
						>
							{saveEmailMutation.isPending ? "Saving…" : "Save Email Settings"}
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* 3. AI Copilot Integration */}
			<Card>
				<CardHeader className="pb-4">
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-base font-semibold flex items-center gap-2">
								<Bot className="size-4 text-primary" />
								<span>AI Writing Assistant & Translator</span>
							</CardTitle>
							<CardDescription className="text-xs mt-1">
								Connect Google Gemini or OpenAI to translate blocks, summarize
								articles, and generate SEO descriptions.
							</CardDescription>
						</div>
						<div className="flex items-center gap-1.5 text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
							<Sparkles className="size-3" />
							<span>Editor Intelligence</span>
						</div>
					</div>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs">AI Provider</Label>
							<Select
								value={localAi?.provider ?? "gemini"}
								onValueChange={(val) =>
									setLocalAi((prev) =>
										prev ? { ...prev, provider: val as AiProviderType } : null,
									)
								}
							>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="gemini" className="text-xs">
										Google Gemini (Recommended)
									</SelectItem>
									<SelectItem value="openai" className="text-xs">
										OpenAI (GPT-4o)
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="flex flex-col gap-1.5">
							<Label className="text-xs">API Key</Label>
							<Input
								type="password"
								value={localAi?.apiKey ?? ""}
								onChange={(e) =>
									setLocalAi((prev) =>
										prev ? { ...prev, apiKey: e.target.value } : null,
									)
								}
								placeholder="AIzaSy••••••••••••••••"
								className="h-8 text-xs font-mono"
							/>
						</div>

						<div className="flex flex-col gap-1.5">
							<Label className="text-xs">Default Model</Label>
							<Select
								value={localAi?.model ?? "gemini-1.5-flash"}
								onValueChange={(val) => {
									if (val) {
										setLocalAi((prev) =>
											prev ? { ...prev, model: val } : null,
										);
									}
								}}
							>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{localAi?.provider === "openai" ? (
										<>
											<SelectItem value="gpt-4o" className="text-xs">
												GPT-4o (Omni)
											</SelectItem>
											<SelectItem value="gpt-4o-mini" className="text-xs">
												GPT-4o Mini
											</SelectItem>
										</>
									) : (
										<>
											<SelectItem value="gemini-1.5-flash" className="text-xs">
												Gemini 1.5 Flash (Fast & Low Latency)
											</SelectItem>
											<SelectItem value="gemini-1.5-pro" className="text-xs">
												Gemini 1.5 Pro (Deep Reasoning)
											</SelectItem>
										</>
									)}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
						<div className="flex items-center justify-between p-3 rounded-lg border bg-muted/10">
							<div className="flex flex-col">
								<span className="text-xs font-medium">1-Click Translation</span>
								<span className="text-[11px] text-muted-foreground">
									Translate entire blocks to target locale
								</span>
							</div>
							<Switch
								checked={localAi?.enableTranslations ?? true}
								onCheckedChange={(c) =>
									setLocalAi((prev) =>
										prev ? { ...prev, enableTranslations: c } : null,
									)
								}
							/>
						</div>

						<div className="flex items-center justify-between p-3 rounded-lg border bg-muted/10">
							<div className="flex flex-col">
								<span className="text-xs font-medium">Auto Summaries</span>
								<span className="text-[11px] text-muted-foreground">
									Generate excerpt and SEO meta
								</span>
							</div>
							<Switch
								checked={localAi?.enableSummaries ?? true}
								onCheckedChange={(c) =>
									setLocalAi((prev) =>
										prev ? { ...prev, enableSummaries: c } : null,
									)
								}
							/>
						</div>

						<div className="flex items-center justify-between p-3 rounded-lg border bg-muted/10">
							<div className="flex flex-col">
								<span className="text-xs font-medium">Writing Polish</span>
								<span className="text-[11px] text-muted-foreground">
									Fix grammar & simplify technical prose
								</span>
							</div>
							<Switch
								checked={localAi?.enableWritingAssistant ?? true}
								onCheckedChange={(c) =>
									setLocalAi((prev) =>
										prev ? { ...prev, enableWritingAssistant: c } : null,
									)
								}
							/>
						</div>
					</div>

					<div className="flex justify-end pt-2">
						<Button
							size="sm"
							onClick={() => localAi && saveAiMutation.mutate(localAi)}
							disabled={saveAiMutation.isPending}
							className="h-8 text-xs"
						>
							{saveAiMutation.isPending ? "Saving…" : "Save AI Settings"}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
