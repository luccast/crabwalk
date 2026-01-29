import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { nitro } from 'nitro/vite';
import viteReact from '@vitejs/plugin-react';
import viteTsConfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';

const allowedHosts = process.env.ALLOWED_HOSTS
	? process.env.ALLOWED_HOSTS.split(',')
			.map((host) => host.trim())
			.filter(Boolean)
	: undefined;

export default defineConfig({
	server: {
		allowedHosts,
	},
	plugins: [
		viteTsConfigPaths({
			projects: ['./tsconfig.json'],
		}),
		tailwindcss(),
		tanstackStart(),
		nitro(),
		viteReact(),
	],
});
