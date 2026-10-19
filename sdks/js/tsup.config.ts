import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		index: "src/index.ts",
		react: "src/react/index.ts",
	},
	format: ["esm", "cjs"],
	dts: true,
	clean: true,
	sourcemap: true,
	splitting: false,
	treeshake: true,
	external: ["react", "react-dom"],
});
