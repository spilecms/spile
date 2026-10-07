import { SendIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
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
import type { Newsletter } from "@/types/domain";

interface SendTestDialogProps {
	target: Newsletter | null;
	onClose: () => void;
	onSend: (email: string) => Promise<void>;
}

export function SendTestDialog({
	target,
	onClose,
	onSend,
}: SendTestDialogProps) {
	const [email, setEmail] = React.useState("");
	const [sending, setSending] = React.useState(false);

	React.useEffect(() => {
		if (target) setEmail("");
	}, [target]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email.trim() || sending) return;
		setSending(true);
		try {
			await onSend(email.trim());
		} finally {
			setSending(false);
		}
	};

	return (
		<Dialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
			{target && (
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Send Test Preview</DialogTitle>
						<DialogDescription>
							Send a test copy of "{target.subject}" to your personal inbox to
							inspect formatting.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleSubmit} className="space-y-4 py-2">
						<div className="space-y-1.5">
							<Label htmlFor="test-recipient-email">
								Recipient email address
							</Label>
							<Input
								id="test-recipient-email"
								type="email"
								placeholder="your-email@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								autoFocus
							/>
						</div>
						<DialogFooter className="pt-2">
							<Button
								type="button"
								variant="outline"
								onClick={onClose}
								disabled={sending}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={sending} className="gap-1.5">
								<SendIcon className="size-3.5" />
								{sending ? "Sending..." : "Send Test Email"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			)}
		</Dialog>
	);
}

interface BroadcastConfirmDialogProps {
	target: Newsletter | null;
	activeSubscriberCount: number;
	onClose: () => void;
	onConfirm: () => void;
	isPending: boolean;
}

export function BroadcastConfirmDialog({
	target,
	activeSubscriberCount,
	onClose,
	onConfirm,
	isPending,
}: BroadcastConfirmDialogProps) {
	return (
		<Dialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
			{target && (
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-primary">
							<SendIcon className="size-5" />
							Broadcast to Audience
						</DialogTitle>
						<DialogDescription className="space-y-2 pt-2">
							<p>
								You are about to broadcast <strong>"{target.subject}"</strong>{" "}
								to{" "}
								<span className="font-semibold text-foreground">
									{activeSubscriberCount} active subscribers
								</span>
								.
							</p>
							<p className="text-amber-600 dark:text-amber-400 text-xs font-medium">
								Warning: Once dispatched, email delivery cannot be undone.
							</p>
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="pt-3">
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button
							onClick={onConfirm}
							disabled={isPending}
							className="gap-1.5"
						>
							<SendIcon className="size-3.5" />
							{isPending
								? "Broadcasting..."
								: `Send to ${activeSubscriberCount} Members`}
						</Button>
					</DialogFooter>
				</DialogContent>
			)}
		</Dialog>
	);
}
