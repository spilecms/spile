import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";
import { createPortal } from "react-dom";

const HeaderTargetContext = createContext<HTMLElement | null>(null);

export function HeaderTargetProvider({
	value,
	children,
}: {
	value: HTMLElement | null;
	children: ReactNode;
}) {
	return (
		<HeaderTargetContext.Provider value={value}>
			{children}
		</HeaderTargetContext.Provider>
	);
}

export function useRegisterHeaderTarget() {
	const [target, setTarget] = useState<HTMLElement | null>(null);
	return { target, setTarget };
}

export function HeaderActions({ children }: { children: ReactNode }) {
	const target = useContext(HeaderTargetContext);
	const [host, setHost] = useState<HTMLElement | null>(null);

	useEffect(() => {
		setHost(target);
	}, [target]);

	if (!host) return null;
	return createPortal(children, host);
}
