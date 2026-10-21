import * as React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import logoImg from "@/assets/logo4.png";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
	const navigate = useNavigate();
	const { login, register, isAuthenticated } = useAuth();

	// Redirect if already logged in
	React.useEffect(() => {
		if (isAuthenticated) {
			navigate("/", { replace: true });
		}
	}, [isAuthenticated, navigate]);

	// Login form state
	const [loginEmail, setLoginEmail] = React.useState("");
	const [loginPassword, setLoginPassword] = React.useState("");
	const [isLoggingIn, setIsLoggingIn] = React.useState(false);

	// Register form state
	const [regName, setRegName] = React.useState("");
	const [regEmail, setRegEmail] = React.useState("");
	const [regPassword, setRegPassword] = React.useState("");
	const [isRegistering, setIsRegistering] = React.useState(false);

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!loginEmail || !loginPassword) {
			toast.error("Please enter both email and password");
			return;
		}

		setIsLoggingIn(true);
		try {
			await login(loginEmail, loginPassword);
			toast.success("Welcome back!");
			navigate("/", { replace: true });
		} catch (err: unknown) {
			const msg =
				err instanceof Error
					? err.message
					: "Failed to log in. Please check your credentials.";
			toast.error(msg);
		} finally {
			setIsLoggingIn(false);
		}
	};

	const handleRegister = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!regName || !regEmail || !regPassword) {
			toast.error("All fields are required");
			return;
		}
		if (regPassword.length < 8) {
			toast.error("Password must be at least 8 characters long");
			return;
		}

		setIsRegistering(true);
		try {
			await register(regName, regEmail, regPassword);
			toast.success("Account created successfully!");
			navigate("/", { replace: true });
		} catch (err: unknown) {
			const msg =
				err instanceof Error
					? err.message
					: "Registration failed. Please try again.";
			toast.error(msg);
		} finally {
			setIsRegistering(false);
		}
	};

	return (
		<div className="min-h-screen w-full flex items-center justify-center p-4 bg-muted/20">
			<Card className="w-full max-w-md shadow-lg border-border/60">
				<CardHeader className="text-center pb-2">
					<div className="flex items-center justify-center gap-2 mb-2">
						<span className="font-extrabold text-2xl tracking-tight text-foreground">
							<img src={logoImg} alt="Spile CMS Logo" className="size-13" />
						</span>
					</div>
					<CardTitle className="text-xl font-bold tracking-tight">
						Welcome to Spile CMS
					</CardTitle>
					<CardDescription className="text-xs">
						Enter your credentials to access your publication workspace.
					</CardDescription>
				</CardHeader>

				<CardContent className="pt-4">
					<Tabs defaultValue="login" className="w-full">
						<TabsList className="grid w-full grid-cols-2 mb-6">
							<TabsTrigger value="login" className="text-xs">
								Sign In
							</TabsTrigger>
							<TabsTrigger value="register" className="text-xs">
								Create Account
							</TabsTrigger>
						</TabsList>

						{/* Sign In Tab */}
						<TabsContent value="login">
							<form onSubmit={handleLogin} className="flex flex-col gap-4">
								<div className="flex flex-col gap-1.5">
									<Label htmlFor="login-email" className="text-xs">
										Email Address
									</Label>
									<Input
										id="login-email"
										type="email"
										placeholder="editor@yourpublication.com"
										value={loginEmail}
										onChange={(e) => setLoginEmail(e.target.value)}
										required
										autoFocus
									/>
								</div>

								<div className="flex flex-col gap-1.5">
									<Label htmlFor="login-password" className="text-xs">
										Password
									</Label>
									<Input
										id="login-password"
										type="password"
										placeholder="••••••••••••"
										value={loginPassword}
										onChange={(e) => setLoginPassword(e.target.value)}
										required
									/>
								</div>

								<Button
									type="submit"
									className="w-full mt-2"
									disabled={isLoggingIn}
								>
									{isLoggingIn ? "Signing In…" : "Sign In"}
								</Button>
							</form>
						</TabsContent>

						{/* Register Tab */}
						<TabsContent value="register">
							<form onSubmit={handleRegister} className="flex flex-col gap-4">
								<div className="flex flex-col gap-1.5">
									<Label htmlFor="reg-name" className="text-xs">
										Full Name
									</Label>
									<Input
										id="reg-name"
										type="text"
										placeholder="Jane Doe"
										value={regName}
										onChange={(e) => setRegName(e.target.value)}
										required
									/>
								</div>

								<div className="flex flex-col gap-1.5">
									<Label htmlFor="reg-email" className="text-xs">
										Email Address
									</Label>
									<Input
										id="reg-email"
										type="email"
										placeholder="owner@yourpublication.com"
										value={regEmail}
										onChange={(e) => setRegEmail(e.target.value)}
										required
									/>
								</div>

								<div className="flex flex-col gap-1.5">
									<Label htmlFor="reg-password" className="text-xs">
										Password (minimum 8 characters)
									</Label>
									<Input
										id="reg-password"
										type="password"
										placeholder="••••••••••••"
										value={regPassword}
										onChange={(e) => setRegPassword(e.target.value)}
										required
									/>
								</div>

								<p className="text-[11px] text-muted-foreground bg-muted/60 p-2 rounded border border-border/40">
									💡 Note: If this is the first account registered in your
									database, it will automatically be granted the{" "}
									<strong>Owner</strong> role.
								</p>

								<Button
									type="submit"
									className="w-full mt-1"
									disabled={isRegistering}
								>
									{isRegistering ? "Creating Account…" : "Create Account"}
								</Button>
							</form>
						</TabsContent>
					</Tabs>
				</CardContent>

				<CardFooter className="flex justify-center border-t border-border/40 pt-4 pb-4">
					<p className="text-[11px] text-muted-foreground text-center">
						Spile CMS &bull; Self-hosted modern publishing platform
					</p>
				</CardFooter>
			</Card>
		</div>
	);
}
