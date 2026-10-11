/**
 * Generates a deterministic GitHub-style anchor slug from heading text,
 * deduplicating collisions within the same page via `seenCounts`:
 * - 1st occurrence: "rate-limiting"
 * - 2nd occurrence: "rate-limiting-1"
 * - 3rd occurrence: "rate-limiting-2"
 *
 * Matches `search.SlugifyGitHub` in `api/internal/search/chunker.go`.
 */
export function slugifyGitHub(
	text: string,
	seenCounts?: Map<string, number>,
): string {
	const clean = text
		.replace(/<[^>]*>/g, " ")
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s_-]/gu, "")
		.trim()
		.replace(/[-_\s]+/g, "-")
		.replace(/^-+|-+$/g, "");

	const base = clean || "section";
	if (!seenCounts) {
		return base;
	}

	const count = seenCounts.get(base) ?? 0;
	seenCounts.set(base, count + 1);
	return count === 0 ? base : `${base}-${count}`;
}
