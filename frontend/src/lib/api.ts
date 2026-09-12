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
    const baseUrl = import.meta.env.VITE_API_URL || "/api/v1";
    const cleanBase = baseUrl.replace(/\/$/, "");
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    
    // Handle endpoint URLs correctly whether VITE_API_URL is full URL or relative path
    let url = endpoint.startsWith("http")
      ? endpoint
      : cleanBase.endsWith("/v1") && cleanEndpoint.startsWith("/v1/")
        ? `${cleanBase.slice(0, -3)}${cleanEndpoint}`
        : `${cleanBase}${cleanEndpoint}`;

    const config: RequestInit = {
      ...restOptions,
      headers: {
        ...(data ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      // "include" ensures auth cookies are sent with every request.
      // The Vite proxy forwards /api/* to the backend, so the browser treats
      // it as same-origin, but "include" is the safest setting to guarantee cookies flow.
      credentials: "include",
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(url, config);

    const isOk = response.ok || response.status === 304;

    if (!isOk) {
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
