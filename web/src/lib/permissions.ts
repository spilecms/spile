import { useQuery } from "@tanstack/react-query";
import { mockApi } from "@/lib/mock/api";
import type { UserRole } from "@/types/domain";

export type AppAction =
	// Posts
	| "post:view"
	| "post:create"
	| "post:edit_own"
	| "post:edit_any"
	| "post:publish"
	| "post:schedule"
	| "post:delete_own"
	| "post:delete_any"
	| "post:duplicate"
	| "post:bulk_status"
	| "post:translate"
	// Docs
	| "doc:view"
	| "doc:project_create"
	| "doc:project_delete"
	| "doc:page_create"
	| "doc:page_edit"
	| "doc:page_reorder"
	| "doc:page_publish"
	| "doc:page_delete"
	| "doc:translate"
	// Newsletters
	| "newsletter:view"
	| "newsletter:create"
	| "newsletter:edit"
	| "newsletter:send_test"
	| "newsletter:schedule"
	| "newsletter:send_broadcast"
	| "newsletter:delete"
	| "newsletter:duplicate"
	// Members / Subscribers
	| "member:view"
	| "member:create"
	| "member:edit"
	| "member:delete"
	| "member:export"
	// Editorial Review & Versioning
	| "review:submit"
	| "review:withdraw"
	| "review:approve"
	| "review:request_changes"
	| "review:view_queue"
	| "review:restore_history"
	// Media Library
	| "media:view"
	| "media:upload"
	| "media:edit"
	| "media:delete"
	// Workspace & Settings
	| "settings:locales_view"
	| "settings:locales_manage"
	| "settings:tags_manage"
	| "settings:integrations_manage"
	| "settings:api_keys_manage"
	| "settings:webhooks_manage"
	| "settings:team_invite"
	| "settings:team_manage";

export const ROLE_PERMISSIONS: Record<UserRole, readonly AppAction[]> = {
	owner: [
		"post:view",
		"post:create",
		"post:edit_own",
		"post:edit_any",
		"post:publish",
		"post:schedule",
		"post:delete_own",
		"post:delete_any",
		"post:duplicate",
		"post:bulk_status",
		"post:translate",
		"doc:view",
		"doc:project_create",
		"doc:project_delete",
		"doc:page_create",
		"doc:page_edit",
		"doc:page_reorder",
		"doc:page_publish",
		"doc:page_delete",
		"doc:translate",
		"newsletter:view",
		"newsletter:create",
		"newsletter:edit",
		"newsletter:send_test",
		"newsletter:schedule",
		"newsletter:send_broadcast",
		"newsletter:delete",
		"newsletter:duplicate",
		"member:view",
		"member:create",
		"member:edit",
		"member:delete",
		"member:export",
		"review:submit",
		"review:withdraw",
		"review:approve",
		"review:request_changes",
		"review:view_queue",
		"review:restore_history",
		"media:view",
		"media:upload",
		"media:edit",
		"media:delete",
		"settings:locales_view",
		"settings:locales_manage",
		"settings:tags_manage",
		"settings:integrations_manage",
		"settings:api_keys_manage",
		"settings:webhooks_manage",
		"settings:team_invite",
		"settings:team_manage",
	],

	admin: [
		"post:view",
		"post:create",
		"post:edit_own",
		"post:edit_any",
		"post:publish",
		"post:schedule",
		"post:delete_own",
		"post:delete_any",
		"post:duplicate",
		"post:bulk_status",
		"post:translate",
		"doc:view",
		"doc:project_create",
		"doc:project_delete",
		"doc:page_create",
		"doc:page_edit",
		"doc:page_reorder",
		"doc:page_publish",
		"doc:page_delete",
		"doc:translate",
		"newsletter:view",
		"newsletter:create",
		"newsletter:edit",
		"newsletter:send_test",
		"newsletter:schedule",
		"newsletter:send_broadcast",
		"newsletter:delete",
		"newsletter:duplicate",
		"member:view",
		"member:create",
		"member:edit",
		"member:delete",
		"member:export",
		"review:submit",
		"review:withdraw",
		"review:approve",
		"review:request_changes",
		"review:view_queue",
		"review:restore_history",
		"media:view",
		"media:upload",
		"media:edit",
		"media:delete",
		"settings:locales_view",
		"settings:locales_manage",
		"settings:tags_manage",
		"settings:integrations_manage",
		"settings:api_keys_manage",
		"settings:webhooks_manage",
		"settings:team_invite",
	],

	editor: [
		"post:view",
		"post:create",
		"post:edit_own",
		"post:edit_any",
		"post:publish",
		"post:schedule",
		"post:delete_own",
		"post:delete_any",
		"post:duplicate",
		"post:bulk_status",
		"post:translate",
		"doc:view",
		"doc:project_create",
		"doc:page_create",
		"doc:page_edit",
		"doc:page_reorder",
		"doc:page_publish",
		"doc:page_delete",
		"doc:translate",
		"newsletter:view",
		"newsletter:create",
		"newsletter:edit",
		"newsletter:send_test",
		"newsletter:schedule",
		"newsletter:duplicate",
		"member:view",
		"review:submit",
		"review:withdraw",
		"review:approve",
		"review:request_changes",
		"review:view_queue",
		"review:restore_history",
		"media:view",
		"media:upload",
		"media:edit",
		"media:delete",
		"settings:locales_view",
		"settings:tags_manage",
	],

	author: [
		"post:view",
		"post:create",
		"post:edit_own",
		"post:delete_own",
		"post:duplicate",
		"post:translate",
		"doc:view",
		"doc:page_create",
		"doc:page_edit",
		"doc:translate",
		"review:submit",
		"review:withdraw",
		"review:view_queue",
		"media:view",
		"media:upload",
		"media:edit",
		"settings:locales_view",
	],

	contributor: [
		"post:view",
		"post:create",
		"post:edit_own",
		"doc:view",
		"doc:page_edit",
		"review:submit",
		"review:withdraw",
		"review:view_queue",
		"media:view",
		"media:upload",
		"settings:locales_view",
	],
};

export function hasPermission(
	role: UserRole | undefined,
	action: AppAction,
): boolean {
	if (!role) return false;
	return ROLE_PERMISSIONS[role]?.includes(action) ?? false;
}

export function usePermissions() {
	const { data: user } = useQuery({
		queryKey: ["users", "current"],
		queryFn: () => mockApi.users.current(),
	});

	const role = user?.role;

	return {
		role,
		user,
		can: (action: AppAction) => hasPermission(role, action),
		cannot: (action: AppAction) => !hasPermission(role, action),
	};
}
