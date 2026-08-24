export class ApiError extends Error {
  constructor(
    public status: number,
    public data: any,
  ) {
    super(data?.error?.message || data?.message || `API Error: ${status}`);
    this.name = "ApiError";
  }
}

interface FetchOptions extends RequestInit {
  data?: any;
}

export const api = {
  async fetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { data, headers, ...restOptions } = options;
    const url = endpoint.startsWith("http") ? endpoint : `/api/v1${endpoint}`;

    const config: RequestInit = {
      ...restOptions,
      headers: {
        ...(data ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      // Important: this tells the browser to include cookies with requests to this backend.
      credentials: "omit", // The backend is on the same domain in dev via proxy, so we can use 'same-origin' or 'include'. Let's use 'include' just to be safe. Wait, if it's via proxy, it's same origin.
    };
    
    // Wait, let's fix credentials: "omit" -> "same-origin" because of proxy.
    config.credentials = "same-origin";

    if (data) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(response.status, errorData);
    }

    const responseData = await response.json();
    return responseData as T;
  },

  get<T>(endpoint: string, options?: Omit<FetchOptions, "method">) {
    return this.fetch<T>(endpoint, { ...options, method: "GET" });
  },

  post<T>(endpoint: string, data?: any, options?: Omit<FetchOptions, "method" | "data">) {
    return this.fetch<T>(endpoint, { ...options, method: "POST", data });
  },

  patch<T>(endpoint: string, data?: any, options?: Omit<FetchOptions, "method" | "data">) {
    return this.fetch<T>(endpoint, { ...options, method: "PATCH", data });
  },

  put<T>(endpoint: string, data?: any, options?: Omit<FetchOptions, "method" | "data">) {
    return this.fetch<T>(endpoint, { ...options, method: "PUT", data });
  },

  delete<T>(endpoint: string, options?: Omit<FetchOptions, "method">) {
    return this.fetch<T>(endpoint, { ...options, method: "DELETE" });
  },
};
