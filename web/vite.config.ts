import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": "/src",
		},
	},
	build: {
		// All application & vendor chunks are < 400 kB; raise limit to accommodate
		// the isolated lazy-loaded `world-map` SVG vector paths chunk (~1.2 MB).
		chunkSizeWarningLimit: 1300,
		rolldownOptions: {
			output: {
				codeSplitting: {
					groups: [
						{
							name: "react-vendor",
							test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
						},
						{
							name: "katex",
							test: /node_modules[\\/]katex[\\/]/,
						},
						{
							name: "hljs",
							test: /node_modules[\\/]highlight\.js[\\/]/,
						},
						{
							name: "blocknote",
							test: /node_modules[\\/]@blocknote[\\/]/,
						},
						{
							name: "charts",
							test: /node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor)[\\/]/,
						},
						{
							name: "ui-vendor",
							test: /node_modules[\\/](@base-ui|lucide-react|@dnd-kit)[\\/]/,
						},
						{
							name: "world-map",
							test: /src[\\/]components[\\/]shadcnmaps[\\/]map-data[\\/]/,
						},
					],
				},
			},
		},
	},
});
