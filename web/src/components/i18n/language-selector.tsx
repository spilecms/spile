import { ES, US } from "country-flag-icons/react/3x2";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const languages = [
	{ code: "en", name: "English", nativeName: "English", Icon: US },
	{ code: "es", name: "Spanish", nativeName: "Español", Icon: ES },
];

export function LanguageSelector() {
	const { i18n } = useTranslation();
	const currentCode = i18n.resolvedLanguage || i18n.language || "en";
	const selectedLanguage =
		languages.find(({ code }) => code === currentCode) ?? languages[0];

	function changeLanguage(code: string) {
		i18n.changeLanguage(code);
		if (typeof window !== "undefined") {
			localStorage.setItem("i18nextLng", code);
		}
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={<Button variant="outline" size="sm" />}
				aria-label={`Select language. Current language: ${selectedLanguage.name}`}
			>
				<selectedLanguage.Icon />
				<span className="text-[0.75rem] font-bold">
					{selectedLanguage.code.toUpperCase()}
				</span>
				<ChevronDown data-icon="inline-end" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuGroup>
					<DropdownMenuLabel>Languages</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuRadioGroup
						value={selectedLanguage.code}
						onValueChange={(code) => {
							if (code) changeLanguage(code);
						}}
						className="gap-1.5"
					>
						{languages.map(({ code, nativeName, Icon }) => (
							<DropdownMenuRadioItem key={code} value={code} closeOnClick>
								<Icon />
								{nativeName}
							</DropdownMenuRadioItem>
						))}
					</DropdownMenuRadioGroup>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export default LanguageSelector;
