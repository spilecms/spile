import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const savedLng =
	typeof window !== "undefined"
		? localStorage.getItem("i18nextLng") || "en"
		: "en";

i18n
	// pass the i18n instance to react-i18next.
	.use(initReactI18next)
	// init i18next
	// for all options read: https://www.i18next.com/overview/configuration-options
	.init({
		debug: false,
		lng: savedLng,
		fallbackLng: "en",
		interpolation: {
			escapeValue: false, // not needed for react as it escapes by default
		},
		resources: {
			en: {
				translation: {
					common: {
						views: "{{count}} views",
						min: "min",
						comingSoon: "Coming soon",
						edit: "Edit",
						duplicate: "Duplicate",
						delete: "Delete",
						status: {
							draft: "Draft",
							published: "Published",
							scheduled: "Scheduled",
							trashed: "Trash",
						},
					},
					dashboard: {
						title: "Dashboard",
						overview: "Overview",
						posts: "Posts",
						docs: "Docs",
						tags: "Tags",
						media: "Media",
						members: "Members",
						analytics: "Analytics",
						team: "Team",
						settings: "Settings",
						documentation: "Documentation",
						integrations: "Integrations",
						help: "Get help",
					},
					docs: {
						postButton: "New Doc",
						title: "Docs",
						subtitle: "Manage guides, API references, and documentation tree.",
						addSection: "Add Section",
						addPage: "Add Page",
						newSectionPrompt: "New section title",
						newPagePrompt: "New page title",
						searchPlaceholder: "Search docs (Cmd+K)...",
						emptySection: "No pages in this section. Click '+' to add one.",
						noSelection: "Select or create a document from the tree to edit.",
						pageTitlePlaceholder: "Document title...",
						slug: "Slug",
						status: "Status",
						saving: "Saving...",
						saveChanges: "Save Changes",
						saved: "Saved",
						deletePage: "Delete Page",
						deleteSection: "Delete Section",
						confirmDeletePage: "Are you sure you want to delete this document?",
						confirmDeleteSection:
							"Are you sure you want to delete this section?",
						tabs: {
							all: "All",
							draft: "Drafts",
							published: "Published",
						},
					},
					userMenu: {
						profile: "Profile",
						settings: "Settings",
						signOut: "Sign out",
					},
					theme: {
						switchToLight: "Switch to light theme",
						switchToDark: "Switch to dark theme",
					},
					overview: {
						cards: {
							totalViews: "Total views",
							totalViewsFooter: "Views across all published posts",
							publishedPosts: "Published posts",
							draftsWaiting: "{{count}} drafts waiting on you",
							members: "Members",
							newsletterSubscribers: "Newsletter subscribers",
							avgReadTime: "Avg. read time",
							avgReadTimeValue: "{{count}} min",
							acrossPublished: "Across published posts",
						},
						chart: {
							title: "Total views",
							totalForDays: "Total for the last {{count}} days",
							loading: "Loading…",
							last7Days: "Last 7 days",
							last30Days: "Last 30 days",
							last3Months: "Last 3 months",
							selectRangeAria: "Select a time range",
							views: "Views",
							visitors: "Visitors",
							viewsPeriod: "{{count}} views in the selected period",
						},
						recentPosts: {
							title: "Recent posts",
							description: "Your latest drafts and publications",
							views: "{{count}} views",
						},
						recentActivity: {
							title: "Recent activity",
							description: "What's happening on your site",
						},
					},
					posts: {
						postButton: "New Post",
						searchPlaceholder: "Search posts…",
						searchAria: "Search posts",
						filterTagAria: "Filter by tag",
						allTags: "All tags",
						filterAuthorAria: "Filter by author",
						allAuthors: "All authors",
						tabs: {
							all: "All",
							draft: "Drafts",
							published: "Published",
							scheduled: "Scheduled",
							trashed: "Trash",
						},
						filters: {
							all: "All",
							published: "Published",
							draft: "Draft",
							scheduled: "Scheduled",
							trash: "Trash",
						},
						empty: {
							noFilteredTitle: "No posts match your filters",
							noFilteredDesc:
								"Try adjusting your search or filters to find what you're looking for.",
							noPostsTitle: "No posts yet",
							noPostsDesc: "Create your first post to get started with Spile.",
							newPostAction: "New post",
						},
						table: {
							selectAll: "Select all",
							selectRow: "Select row",
							title: "Title",
							status: "Status",
							authors: "Authors",
							views: "Views",
							updated: "Updated",
							actionsAria: "Open menu",
							edit: "Edit",
							duplicate: "Duplicate",
							delete: "Delete",
							selectedCount: "{{count}} selected",
							changeStatus: "Change status",
							bulkComingSoon: "Bulk actions are coming soon",
							noResults: "No results.",
							postsCount: "{{count}} post(s)",
							pageOf: "Page {{current}} of {{total}}",
							prevPage: "Go to previous page",
							nextPage: "Go to next page",
						},
						delivery: {
							title: "Delivery Channels",
							webTitle: "Publish to Web",
							webDesc: "Visible on your public site and RSS feed",
							newsletterTitle: "Send as Newsletter",
							newsletterDesc: "Deliver directly to all subscriber inboxes",
							newsletterSent: "Newsletter sent on {{date}}",
							channelWeb: "Web",
							channelNewsletter: "Newsletter",
							filterAllChannels: "All channels",
							filterWeb: "Web only",
							filterNewsletter: "Newsletter only",
							publishWeb: "Publish to Web",
							publishNewsletter: "Send Newsletter",
							publishBoth: "Publish & Send Newsletter",
							saveChanges: "Save changes",
						},
					},
					placeholders: {
						comingSoon: "Coming soon",
						fallbackTitle: "This area is coming soon",
						fallbackDesc: "We're still building this part of Spile.",
						tags: {
							title: "Tags are coming soon",
							description:
								"Organize posts with tags and internal labels. This area ships in Phase 2.",
						},
						media: {
							title: "Media library is coming soon",
							description:
								"Uploads, images, video, and audio will be managed here. This area ships in Phase 2.",
						},
						members: {
							title: "Members are coming soon",
							description:
								"Newsletter subscribers and membership management live here. This area ships in Phase 3.",
						},
						newsletters: {
							title: "Newsletter Hub is coming soon",
							description:
								"Email templates, broadcast analytics, and sender configuration live here. Write new issues directly in Posts.",
						},
						analytics: {
							title: "Analytics are coming soon",
							description:
								"Traffic, top content, and audience insights will appear here. This area ships in Phase 4.",
						},
						team: {
							title: "Team management is coming soon",
							description:
								"Invite teammates and manage roles here. This area ships in Phase 4.",
						},
						settings: {
							title: "Settings are coming soon",
							description:
								"Site, branding, navigation, and email settings will live here. This area ships in Phase 5.",
						},
						integrations: {
							title: "Integrations are coming soon",
							description:
								"Connect third-party services and manage API keys here. This area ships in Phase 5.",
						},
						help: {
							title: "Help is coming soon",
							description:
								"Documentation and support resources will appear here.",
						},
					},
				},
			},
			es: {
				translation: {
					common: {
						views: "{{count}} vistas",
						min: "min",
						comingSoon: "Próximamente",
						edit: "Editar",
						duplicate: "Duplicar",
						delete: "Eliminar",
						status: {
							draft: "Borrador",
							published: "Publicado",
							scheduled: "Programado",
							trashed: "Papelera",
						},
					},
					dashboard: {
						title: "Panel",
						overview: "Resumen",
						posts: "Publicaciones",
						docs: "Documentación",
						tags: "Etiquetas",
						media: "Medios",
						members: "Miembros",
						analytics: "Analítica",
						team: "Equipo",
						settings: "Configuración",
						documentation: "Documentación",
						integrations: "Integraciones",
						help: "Obtener ayuda",
					},
					docs: {
						postButton: "Nueva Documentación",
						title: "Documentación",
						subtitle:
							"Gestiona guías, referencias API y el árbol de navegación.",
						addSection: "Añadir sección",
						addPage: "Añadir página",
						newSectionPrompt: "Título de la nueva sección",
						newPagePrompt: "Título de la nueva página",
						searchPlaceholder: "Buscar documentos (Cmd+K)...",
						emptySection:
							"No hay páginas en esta sección. Pulsa '+' para añadir una.",
						noSelection:
							"Selecciona o crea un documento del árbol para editar.",
						pageTitlePlaceholder: "Título del documento...",
						slug: "Slug",
						status: "Estado",
						saving: "Guardando...",
						saveChanges: "Guardar cambios",
						saved: "Guardado",
						deletePage: "Eliminar página",
						deleteSection: "Eliminar sección",
						confirmDeletePage:
							"¿Estás seguro de que deseas eliminar este documento?",
						confirmDeleteSection:
							"¿Estás seguro de que deseas eliminar esta sección?",
						tabs: {
							all: "Todas",
							draft: "Borradores",
							published: "Publicadas",
						},
					},
					userMenu: {
						profile: "Perfil",
						settings: "Configuración",
						signOut: "Cerrar sesión",
					},
					theme: {
						switchToLight: "Cambiar a tema claro",
						switchToDark: "Cambiar a tema oscuro",
					},
					overview: {
						cards: {
							totalViews: "Vistas totales",
							totalViewsFooter: "Vistas en todas las publicaciones",
							publishedPosts: "Publicaciones publicadas",
							draftsWaiting: "{{count}} borradores esperándote",
							members: "Miembros",
							newsletterSubscribers: "Suscriptores del boletín",
							avgReadTime: "Tiempo prom. de lectura",
							avgReadTimeValue: "{{count}} min",
							acrossPublished: "En publicaciones publicadas",
						},
						chart: {
							title: "Vistas totales",
							totalForDays: "Total de los últimos {{count}} días",
							loading: "Cargando…",
							last7Days: "Últimos 7 días",
							last30Days: "Últimos 30 días",
							last3Months: "Últimos 3 meses",
							selectRangeAria: "Seleccionar un rango de tiempo",
							views: "Vistas",
							visitors: "Visitantes",
							viewsPeriod: "{{count}} vistas en el periodo seleccionado",
						},
						recentPosts: {
							title: "Publicaciones recientes",
							description: "Tus últimos borradores y publicaciones",
							views: "{{count}} vistas",
						},
						recentActivity: {
							title: "Actividad reciente",
							description: "Lo que sucede en tu sitio",
						},
					},
					posts: {
						postButton: "Nueva Publicación",
						searchPlaceholder: "Buscar publicaciones…",
						searchAria: "Buscar publicaciones",
						filterTagAria: "Filtrar por etiqueta",
						allTags: "Todas las etiquetas",
						filterAuthorAria: "Filtrar por autor",
						allAuthors: "Todos los autores",
						tabs: {
							all: "Todas",
							draft: "Borradores",
							published: "Publicadas",
							scheduled: "Programadas",
							trashed: "Papelera",
						},
						filters: {
							all: "Todas",
							published: "Publicadas",
							draft: "Borradores",
							scheduled: "Programadas",
							trash: "Papelera",
						},
						empty: {
							noFilteredTitle:
								"No hay publicaciones que coincidan con tus filtros",
							noFilteredDesc:
								"Intenta ajustar tu búsqueda o filtros para encontrar lo que buscas.",
							noPostsTitle: "Aún no hay publicaciones",
							noPostsDesc:
								"Crea tu primera publicación para comenzar con Spile.",
							newPostAction: "Nueva publicación",
						},
						table: {
							selectAll: "Seleccionar todo",
							selectRow: "Seleccionar fila",
							title: "Título",
							status: "Estado",
							authors: "Autores",
							views: "Vistas",
							updated: "Actualizado",
							actionsAria: "Abrir menú",
							edit: "Editar",
							duplicate: "Duplicar",
							delete: "Eliminar",
							selectedCount: "{{count}} seleccionados",
							changeStatus: "Cambiar estado",
							bulkComingSoon: "Las acciones en lote estarán disponibles pronto",
							noResults: "Sin resultados.",
							postsCount: "{{count}} publicación(es)",
							pageOf: "Página {{current}} de {{total}}",
							prevPage: "Ir a la página anterior",
							nextPage: "Ir a la página siguiente",
						},
						delivery: {
							title: "Canales de entrega",
							webTitle: "Publicar en la Web",
							webDesc: "Visible en tu sitio público y canal RSS",
							newsletterTitle: "Enviar como Boletín",
							newsletterDesc: "Enviar directamente a todos los suscriptores",
							newsletterSent: "Boletín enviado el {{date}}",
							channelWeb: "Web",
							channelNewsletter: "Boletín",
							filterAllChannels: "Todos los canales",
							filterWeb: "Solo Web",
							filterNewsletter: "Solo Boletín",
							publishWeb: "Publicar en la Web",
							publishNewsletter: "Enviar Boletín",
							publishBoth: "Publicar y Enviar Boletín",
							saveChanges: "Guardar cambios",
						},
					},
					placeholders: {
						comingSoon: "Próximamente",
						fallbackTitle: "Esta sección estará disponible pronto",
						fallbackDesc: "Aún estamos construyendo esta parte de Spile.",
						tags: {
							title: "Las etiquetas estarán disponibles pronto",
							description:
								"Organiza publicaciones con etiquetas y rótulos internos. Esta área llegará en la Fase 2.",
						},
						media: {
							title: "La biblioteca de medios estará disponible pronto",
							description:
								"Subidas, imágenes, video y audio se gestionarán aquí. Esta área llegará en la Fase 2.",
						},
						members: {
							title: "Los miembros estarán disponibles pronto",
							description:
								"Los suscriptores del boletín y la gestión de membresías vivirán aquí. Esta área llegará en la Fase 3.",
						},
						newsletters: {
							title: "El Centro de Boletines estará disponible pronto",
							description:
								"Las plantillas de correo, las analíticas de envío y la configuración del remitente vivirán aquí. Escribe nuevos números directamente desde Publicaciones.",
						},
						analytics: {
							title: "La analítica estará disponible pronto",
							description:
								"Tráfico, contenido destacado y estadísticas de audiencia aparecerán aquí. Esta área llegará en la Fase 4.",
						},
						team: {
							title: "La gestión de equipo estará disponible pronto",
							description:
								"Invita compañeros de equipo y gestiona roles aquí. Esta área llegará en la Fase 4.",
						},
						settings: {
							title: "La configuración estará disponible pronto",
							description:
								"La configuración del sitio, marca, navegación y correo vivirá aquí. Esta área llegará en la Fase 5.",
						},
						integrations: {
							title: "Las integraciones estarán disponibles pronto",
							description:
								"Conecta servicios de terceros y gestiona claves API aquí. Esta área llegará en la Fase 5.",
						},
						help: {
							title: "La ayuda estará disponible pronto",
							description:
								"La documentación y los recursos de soporte aparecerán aquí.",
						},
					},
				},
			},
		},
	});

export default i18n;
