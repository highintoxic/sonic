import { API_CONFIG } from "@/config/api";
import { ApiError, ApiResponse } from "@/types/api";

class ApiClient {
	private baseURL: string;
	private timeout: number;

	constructor() {
		this.baseURL = API_CONFIG.baseURL;
		this.timeout = API_CONFIG.timeout;
	}

	private async request<T>(
		endpoint: string,
		options: RequestInit = {}
	): Promise<ApiResponse<T>> {
		const url = `${this.baseURL}${endpoint}`;

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), this.timeout);

		try {
			const response = await fetch(url, {
				...options,
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				const error = new ApiError(
					errorData.error || `HTTP ${response.status}`,
					response.status,
					errorData.details
				);
				throw error;
			}

			return await response.json();
		} catch (error) {
			clearTimeout(timeoutId);

			if (error instanceof Error && error.name === "AbortError") {
				const timeoutError = new ApiError("Request timeout", 408);
				throw timeoutError;
			}

			throw error;
		}
	}

	async get<T>(endpoint: string): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		});
	}

	async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
		const isFormData = data instanceof FormData;

		return this.request<T>(endpoint, {
			method: "POST",
			headers: isFormData
				? {}
				: {
						"Content-Type": "application/json",
				  },
			body: isFormData ? data : JSON.stringify(data),
		});
	}

	async uploadFile<T>(
		endpoint: string,
		file: File,
		additionalData?: Record<string, string>
	): Promise<ApiResponse<T>> {
		const formData = new FormData();
		formData.append("audio", file);

		if (additionalData) {
			Object.entries(additionalData).forEach(([key, value]) => {
				formData.append(key, value);
			});
		}

		return this.post<T>(endpoint, formData);
	}
}

export const apiClient = new ApiClient();
