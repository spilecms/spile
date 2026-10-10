const BASE_URL = "/api/v1";

export class ApiError extends Error {
	constructor(
		message: string,
		public status: number,
		public data?: any,
	) {
		super(message);
		this.name = "ApiError";
	}
}

async function request<T>(
	endpoint: string,
	options: RequestInit = {},
): Promise<T> {
	const url = `${BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

	const headers: Record<string, string> = {
		...(options.headers as Record<string, string>),
	};

	if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
		headers["Content-Type"] = "application/json";
	}

	const config: RequestInit = {
		...options,
		headers,
		credentials: "include", // Automatically send/receive HTTP-only session cookies
	};

	const response = await fetch(url, config);

	if (!response.ok) {
		let errorMsg = `Request failed with status ${response.status}`;
		let errorData: any;
		try {
			errorData = await response.json();
			if (errorData?.error) {
				errorMsg = errorData.error;
			}
		} catch {
			// Non-JSON response
		}
		throw new ApiError(errorMsg, response.status, errorData);
	}

	if (response.status === 204) {
		return null as T;
	}

	return response.json();
}

export const http = {
	get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
		let query = "";
		if (params) {
			const searchParams = new URLSearchParams();
			for (const [key, val] of Object.entries(params)) {
				if (val !== undefined && val !== null && val !== "") {
					searchParams.append(key, String(val));
				}
			}
			const qs = searchParams.toString();
			if (qs) query = `?${qs}`;
		}
		return request<T>(`${endpoint}${query}`, { method: "GET" });
	},

	post<T>(endpoint: string, body?: any): Promise<T> {
		return request<T>(endpoint, {
			method: "POST",
			body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
		});
	},

	put<T>(endpoint: string, body?: any): Promise<T> {
		return request<T>(endpoint, {
			method: "PUT",
			body: JSON.stringify(body ?? {}),
		});
	},

	patch<T>(endpoint: string, body?: any): Promise<T> {
		return request<T>(endpoint, {
			method: "PATCH",
			body: JSON.stringify(body ?? {}),
		});
	},

	delete<T>(endpoint: string): Promise<T> {
		return request<T>(endpoint, { method: "DELETE" });
	},
};
