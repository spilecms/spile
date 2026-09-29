<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import './layout.css';

	let { children } = $props();
</script>

<svelte:head></svelte:head>
{@render children()}

<div style="display:none">
	{#each locales as locale (locale)}
		<a
			href={resolve(localizeHref(page.url.pathname, { locale }) as Pathname)}
		>{locale}</a>
	{/each}
</div>
