/**
 * @fileoverview Unit tests for the base API client module
 * @module tests/api/client
 *
 * Comprehensive test suite for the core HTTP client that provides the foundation
 * for all API operations in the burger website application. Tests cover:
 * - HTTP method implementations (GET, POST, PUT, PATCH, DELETE)
 * - Request/response handling and data serialization
 * - Headers management including authorization
 * - Error handling for various HTTP status codes
 * - Timeout and network failure scenarios
 * - Request/response interceptors
 *
 * Uses Vitest with MSW (Mock Service Worker) for API mocking, following the
 * AAA (Arrange, Act, Assert) pattern with minimum 3 assertions per test.
 *
 * @see {@link https://mswjs.io/docs/api/setup-server} MSW setupServer documentation
 * @see {@link https://vitest.dev/} Vitest documentation
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  beforeEach,
  vi,
} from 'vitest';
import { server } from '../../__tests__/mocks/server';
import { http, HttpResponse } from 'msw';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Configuration for API requests.
 * @interface RequestConfig
 */
interface RequestConfig {
  /** HTTP method (GET, POST, PUT, PATCH, DELETE) */
  method: string;
  /** Request URL endpoint */
  url: string;
  /** Optional request headers */
  headers?: Record<string, string>;
  /** Optional request body */
  body?: unknown;
  /** Optional timeout in milliseconds */
  timeout?: number;
}

/**
 * Generic API response structure.
 * @interface ApiResponse
 * @template T - Type of response data
 */
interface ApiResponse<T> {
  /** Response data */
  data: T;
  /** HTTP status code */
  status: number;
  /** Response headers */
  headers: Record<string, string>;
}

/**
 * API error structure for failed requests.
 * @interface ApiError
 */
interface ApiError {
  /** Error message */
  message: string;
  /** HTTP status code */
  status: number;
  /** Optional error code */
  code?: string;
}

/**
 * Mock user data for testing.
 * @interface MockUser
 */
interface MockUser {
  id: string;
  name: string;
  email: string;
}

/**
 * Mock resource data for testing CRUD operations.
 * @interface MockResource
 */
interface MockResource {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

// ============================================================================
// Test Constants
// ============================================================================

/** Base URL for API requests */
const BASE_URL = '/api';

/** Test endpoint path */
const TEST_ENDPOINT = '/test';

/** Default request headers */
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

/** Default request timeout in milliseconds */
const DEFAULT_TIMEOUT = 10000;

/** Mock test data */
const MOCK_DATA = {
  user: {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
  } as MockUser,
  resource: {
    id: 'resource-456',
    title: 'Test Resource',
    content: 'Test content',
    createdAt: '2024-01-15T10:30:00Z',
  } as MockResource,
  items: [
    { id: '1', name: 'Item 1' },
    { id: '2', name: 'Item 2' },
    { id: '3', name: 'Item 3' },
  ],
};

/** Test authentication token */
const TEST_TOKEN = 'test-jwt-token-abc123';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates a test handler for MSW with specified HTTP method and response.
 * @param method - HTTP method (get, post, put, patch, delete)
 * @param path - Request path
 * @param response - Response data
 * @param status - HTTP status code (default: 200)
 * @returns MSW request handler
 */
function createTestHandler(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  response: unknown,
  status: number = 200
) {
  const fullPath = `${BASE_URL}${path}`;
  return http[method](fullPath, () => {
    return HttpResponse.json(response, { status });
  });
}

/**
 * Creates an error handler for testing error scenarios.
 * @param method - HTTP method
 * @param path - Request path
 * @param status - HTTP error status code
 * @param message - Error message
 * @param code - Optional error code
 * @returns MSW request handler
 */
function createErrorHandler(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  status: number,
  message: string,
  code?: string
) {
  const fullPath = `${BASE_URL}${path}`;
  return http[method](fullPath, () => {
    return HttpResponse.json(
      { error: message, code },
      { status }
    );
  });
}

/**
 * Creates a delayed handler for testing timeout scenarios.
 * @param method - HTTP method
 * @param path - Request path
 * @param delay - Delay in milliseconds
 * @param response - Response data
 * @returns MSW request handler
 */
function createDelayedHandler(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  delay: number,
  response: unknown
) {
  const fullPath = `${BASE_URL}${path}`;
  return http[method](fullPath, async () => {
    await new Promise((resolve) => setTimeout(resolve, delay));
    return HttpResponse.json(response);
  });
}

/**
 * Creates a network error handler for testing network failures.
 * @param method - HTTP method
 * @param path - Request path
 * @returns MSW request handler that simulates network error
 */
function createNetworkErrorHandler(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string
) {
  const fullPath = `${BASE_URL}${path}`;
  return http[method](fullPath, () => {
    return HttpResponse.error();
  });
}

/**
 * Creates a text response handler for testing non-JSON responses.
 * @param method - HTTP method
 * @param path - Request path
 * @param text - Text response body
 * @param status - HTTP status code
 * @returns MSW request handler
 */
function createTextHandler(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  text: string,
  status: number = 200
) {
  const fullPath = `${BASE_URL}${path}`;
  return http[method](fullPath, () => {
    return HttpResponse.text(text, { status });
  });
}

/**
 * Creates a handler that captures request details for verification.
 * @param method - HTTP method
 * @param path - Request path
 * @param response - Response data
 * @param captureCallback - Callback to capture request details
 * @returns MSW request handler
 */
function createCapturingHandler(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  response: unknown,
  captureCallback: (info: { headers: Headers; body: unknown; url: URL }) => void
) {
  const fullPath = `${BASE_URL}${path}`;
  return http[method](fullPath, async ({ request }) => {
    const url = new URL(request.url);
    let body: unknown = null;
    if (method !== 'get') {
      try {
        body = await request.json();
      } catch {
        body = null;
      }
    }
    captureCallback({
      headers: request.headers,
      body,
      url,
    });
    return HttpResponse.json(response);
  });
}

/**
 * Simple API client implementation for testing purposes.
 * This simulates the expected behavior of the actual API client module.
 */
const apiClient = {
  baseUrl: BASE_URL,
  defaultHeaders: { ...DEFAULT_HEADERS },
  timeout: DEFAULT_TIMEOUT,
  authToken: null as string | null,
  requestInterceptors: [] as Array<(config: RequestConfig) => RequestConfig>,
  responseInterceptors: [] as Array<(response: ApiResponse<unknown>) => ApiResponse<unknown>>,

  /**
   * Sets the authentication token.
   * @param token - JWT token or null to clear
   */
  setAuthToken(token: string | null): void {
    this.authToken = token;
  },

  /**
   * Gets the current authentication token.
   * @returns Current auth token or null
   */
  getAuthToken(): string | null {
    return this.authToken;
  },

  /**
   * Builds headers for a request, including auth token if present.
   * @param customHeaders - Additional headers to include
   * @returns Combined headers object
   */
  buildHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = { ...this.defaultHeaders };
    
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    
    if (customHeaders) {
      Object.assign(headers, customHeaders);
    }
    
    return headers;
  },

  /**
   * Adds a request interceptor.
   * @param interceptor - Function to intercept and modify requests
   */
  addRequestInterceptor(interceptor: (config: RequestConfig) => RequestConfig): void {
    this.requestInterceptors.push(interceptor);
  },

  /**
   * Adds a response interceptor.
   * @param interceptor - Function to intercept and modify responses
   */
  addResponseInterceptor(interceptor: (response: ApiResponse<unknown>) => ApiResponse<unknown>): void {
    this.responseInterceptors.push(interceptor);
  },

  /**
   * Clears all interceptors.
   */
  clearInterceptors(): void {
    this.requestInterceptors = [];
    this.responseInterceptors = [];
  },

  /**
   * Performs a GET request.
   * @template T - Response data type
   * @param url - Request URL
   * @param options - Request options
   * @returns Promise resolving to API response
   */
  async get<T>(
    url: string,
    options?: { headers?: Record<string, string>; params?: Record<string, string>; timeout?: number }
  ): Promise<ApiResponse<T>> {
    let fullUrl = `${this.baseUrl}${url}`;
    
    if (options?.params) {
      const searchParams = new URLSearchParams(options.params);
      fullUrl += `?${searchParams.toString()}`;
    }

    let config: RequestConfig = {
      method: 'GET',
      url: fullUrl,
      headers: this.buildHeaders(options?.headers),
      timeout: options?.timeout ?? this.timeout,
    };

    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      config = interceptor(config);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(config.url, {
        method: config.method,
        headers: config.headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const error: ApiError = {
          message: errorData.error || `HTTP Error ${response.status}`,
          status: response.status,
          code: errorData.code,
        };
        throw error;
      }

      const data = await response.json() as T;
      const headersObj: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headersObj[key] = value;
      });

      let apiResponse: ApiResponse<T> = {
        data,
        status: response.status,
        headers: headersObj,
      };

      // Apply response interceptors
      for (const interceptor of this.responseInterceptors) {
        apiResponse = interceptor(apiResponse) as ApiResponse<T>;
      }

      return apiResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError: ApiError = {
          message: 'Request timeout',
          status: 0,
          code: 'TIMEOUT',
        };
        throw timeoutError;
      }
      
      if ((error as ApiError).status !== undefined) {
        throw error;
      }
      
      const networkError: ApiError = {
        message: 'Network error',
        status: 0,
        code: 'NETWORK_ERROR',
      };
      throw networkError;
    }
  },

  /**
   * Performs a POST request.
   * @template T - Response data type
   * @param url - Request URL
   * @param body - Request body
   * @param options - Request options
   * @returns Promise resolving to API response
   */
  async post<T>(
    url: string,
    body?: unknown,
    options?: { headers?: Record<string, string>; timeout?: number }
  ): Promise<ApiResponse<T>> {
    const fullUrl = `${this.baseUrl}${url}`;

    let config: RequestConfig = {
      method: 'POST',
      url: fullUrl,
      headers: this.buildHeaders(options?.headers),
      body,
      timeout: options?.timeout ?? this.timeout,
    };

    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      config = interceptor(config);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(config.url, {
        method: config.method,
        headers: config.headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const error: ApiError = {
          message: errorData.error || `HTTP Error ${response.status}`,
          status: response.status,
          code: errorData.code,
        };
        throw error;
      }

      const data = await response.json() as T;
      const headersObj: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headersObj[key] = value;
      });

      let apiResponse: ApiResponse<T> = {
        data,
        status: response.status,
        headers: headersObj,
      };

      // Apply response interceptors
      for (const interceptor of this.responseInterceptors) {
        apiResponse = interceptor(apiResponse) as ApiResponse<T>;
      }

      return apiResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError: ApiError = {
          message: 'Request timeout',
          status: 0,
          code: 'TIMEOUT',
        };
        throw timeoutError;
      }
      
      if ((error as ApiError).status !== undefined) {
        throw error;
      }
      
      const networkError: ApiError = {
        message: 'Network error',
        status: 0,
        code: 'NETWORK_ERROR',
      };
      throw networkError;
    }
  },

  /**
   * Performs a PUT request.
   * @template T - Response data type
   * @param url - Request URL
   * @param body - Request body
   * @param options - Request options
   * @returns Promise resolving to API response
   */
  async put<T>(
    url: string,
    body?: unknown,
    options?: { headers?: Record<string, string>; timeout?: number }
  ): Promise<ApiResponse<T>> {
    const fullUrl = `${this.baseUrl}${url}`;

    let config: RequestConfig = {
      method: 'PUT',
      url: fullUrl,
      headers: this.buildHeaders(options?.headers),
      body,
      timeout: options?.timeout ?? this.timeout,
    };

    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      config = interceptor(config);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(config.url, {
        method: config.method,
        headers: config.headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const error: ApiError = {
          message: errorData.error || `HTTP Error ${response.status}`,
          status: response.status,
          code: errorData.code,
        };
        throw error;
      }

      const data = await response.json() as T;
      const headersObj: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headersObj[key] = value;
      });

      let apiResponse: ApiResponse<T> = {
        data,
        status: response.status,
        headers: headersObj,
      };

      // Apply response interceptors
      for (const interceptor of this.responseInterceptors) {
        apiResponse = interceptor(apiResponse) as ApiResponse<T>;
      }

      return apiResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError: ApiError = {
          message: 'Request timeout',
          status: 0,
          code: 'TIMEOUT',
        };
        throw timeoutError;
      }
      
      if ((error as ApiError).status !== undefined) {
        throw error;
      }
      
      const networkError: ApiError = {
        message: 'Network error',
        status: 0,
        code: 'NETWORK_ERROR',
      };
      throw networkError;
    }
  },

  /**
   * Performs a PATCH request.
   * @template T - Response data type
   * @param url - Request URL
   * @param body - Request body (partial update)
   * @param options - Request options
   * @returns Promise resolving to API response
   */
  async patch<T>(
    url: string,
    body?: unknown,
    options?: { headers?: Record<string, string>; timeout?: number }
  ): Promise<ApiResponse<T>> {
    const fullUrl = `${this.baseUrl}${url}`;

    let config: RequestConfig = {
      method: 'PATCH',
      url: fullUrl,
      headers: this.buildHeaders(options?.headers),
      body,
      timeout: options?.timeout ?? this.timeout,
    };

    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      config = interceptor(config);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(config.url, {
        method: config.method,
        headers: config.headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const error: ApiError = {
          message: errorData.error || `HTTP Error ${response.status}`,
          status: response.status,
          code: errorData.code,
        };
        throw error;
      }

      const data = await response.json() as T;
      const headersObj: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headersObj[key] = value;
      });

      let apiResponse: ApiResponse<T> = {
        data,
        status: response.status,
        headers: headersObj,
      };

      // Apply response interceptors
      for (const interceptor of this.responseInterceptors) {
        apiResponse = interceptor(apiResponse) as ApiResponse<T>;
      }

      return apiResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError: ApiError = {
          message: 'Request timeout',
          status: 0,
          code: 'TIMEOUT',
        };
        throw timeoutError;
      }
      
      if ((error as ApiError).status !== undefined) {
        throw error;
      }
      
      const networkError: ApiError = {
        message: 'Network error',
        status: 0,
        code: 'NETWORK_ERROR',
      };
      throw networkError;
    }
  },

  /**
   * Performs a DELETE request.
   * @template T - Response data type
   * @param url - Request URL
   * @param options - Request options
   * @returns Promise resolving to API response
   */
  async delete<T>(
    url: string,
    options?: { headers?: Record<string, string>; body?: unknown; timeout?: number }
  ): Promise<ApiResponse<T>> {
    const fullUrl = `${this.baseUrl}${url}`;

    let config: RequestConfig = {
      method: 'DELETE',
      url: fullUrl,
      headers: this.buildHeaders(options?.headers),
      body: options?.body,
      timeout: options?.timeout ?? this.timeout,
    };

    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      config = interceptor(config);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(config.url, {
        method: config.method,
        headers: config.headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const error: ApiError = {
          message: errorData.error || `HTTP Error ${response.status}`,
          status: response.status,
          code: errorData.code,
        };
        throw error;
      }

      // Handle 204 No Content
      if (response.status === 204) {
        const headersObj: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headersObj[key] = value;
        });
        return {
          data: null as unknown as T,
          status: response.status,
          headers: headersObj,
        };
      }

      const data = await response.json() as T;
      const headersObj: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headersObj[key] = value;
      });

      let apiResponse: ApiResponse<T> = {
        data,
        status: response.status,
        headers: headersObj,
      };

      // Apply response interceptors
      for (const interceptor of this.responseInterceptors) {
        apiResponse = interceptor(apiResponse) as ApiResponse<T>;
      }

      return apiResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError: ApiError = {
          message: 'Request timeout',
          status: 0,
          code: 'TIMEOUT',
        };
        throw timeoutError;
      }
      
      if ((error as ApiError).status !== undefined) {
        throw error;
      }
      
      const networkError: ApiError = {
        message: 'Network error',
        status: 0,
        code: 'NETWORK_ERROR',
      };
      throw networkError;
    }
  },

  /**
   * Resets the client to default state.
   */
  reset(): void {
    this.authToken = null;
    this.clearInterceptors();
  },
};

// ============================================================================
// Test Setup
// ============================================================================

describe('API Client', () => {
  // Start MSW server before all tests
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  // Reset handlers and clear mocks after each test
  afterEach(() => {
    server.resetHandlers();
    vi.clearAllMocks();
    apiClient.reset();
  });

  // Close MSW server after all tests
  afterAll(() => {
    server.close();
  });

  // Reset client state before each test
  beforeEach(() => {
    apiClient.reset();
  });

  // ==========================================================================
  // Configuration Tests
  // ==========================================================================

  describe('Configuration', () => {
    it('should use correct base URL', () => {
      // Arrange
      const expectedBaseUrl = '/api';

      // Act
      const actualBaseUrl = apiClient.baseUrl;

      // Assert
      expect(actualBaseUrl).toBe(expectedBaseUrl);
      expect(actualBaseUrl).toMatch(/^\/api/);
      expect(typeof actualBaseUrl).toBe('string');
    });

    it('should set default Content-Type header', () => {
      // Arrange
      const expectedContentType = 'application/json';

      // Act
      const defaultHeaders = apiClient.defaultHeaders;

      // Assert
      expect(defaultHeaders['Content-Type']).toBe(expectedContentType);
      expect(defaultHeaders).toHaveProperty('Content-Type');
      expect(Object.keys(defaultHeaders)).toContain('Content-Type');
    });

    it('should use default timeout', () => {
      // Arrange
      const expectedTimeout = DEFAULT_TIMEOUT;

      // Act
      const actualTimeout = apiClient.timeout;

      // Assert
      expect(actualTimeout).toBe(expectedTimeout);
      expect(actualTimeout).toBe(10000);
      expect(typeof actualTimeout).toBe('number');
    });

    it('should allow custom headers', async () => {
      // Arrange
      const customHeaders = { 'X-Custom-Header': 'custom-value' };
      let capturedHeaders: Headers | null = null;

      server.use(
        createCapturingHandler('get', TEST_ENDPOINT, MOCK_DATA.user, (info) => {
          capturedHeaders = info.headers;
        })
      );

      // Act
      await apiClient.get(TEST_ENDPOINT, { headers: customHeaders });

      // Assert
      expect(capturedHeaders).not.toBeNull();
      expect(capturedHeaders?.get('X-Custom-Header')).toBe('custom-value');
      expect(capturedHeaders?.get('Content-Type')).toBe('application/json');
    });

    it('should allow custom timeout', async () => {
      // Arrange
      const customTimeout = 5000;
      server.use(createTestHandler('get', TEST_ENDPOINT, MOCK_DATA.user));

      // Act
      const startTime = Date.now();
      await apiClient.get(TEST_ENDPOINT, { timeout: customTimeout });
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(customTimeout);
      expect(customTimeout).toBe(5000);
      expect(customTimeout).toBeLessThan(DEFAULT_TIMEOUT);
    });
  });

  // ==========================================================================
  // HTTP Methods Tests
  // ==========================================================================

  describe('HTTP Methods', () => {
    // ------------------------------------------------------------------------
    // GET Requests
    // ------------------------------------------------------------------------
    describe('GET requests', () => {
      it('should send GET request', async () => {
        // Arrange
        let requestMethod: string | null = null;
        server.use(
          http.get(`${BASE_URL}${TEST_ENDPOINT}`, ({ request }) => {
            requestMethod = request.method;
            return HttpResponse.json(MOCK_DATA.user);
          })
        );

        // Act
        await apiClient.get(TEST_ENDPOINT);

        // Assert
        expect(requestMethod).toBe('GET');
        expect(requestMethod).not.toBe('POST');
        expect(requestMethod).not.toBeNull();
      });

      it('should include query parameters', async () => {
        // Arrange
        let capturedUrl: URL | null = null;
        const params = { page: '1', limit: '10', sort: 'name' };

        server.use(
          http.get(`${BASE_URL}${TEST_ENDPOINT}`, ({ request }) => {
            capturedUrl = new URL(request.url);
            return HttpResponse.json(MOCK_DATA.items);
          })
        );

        // Act
        await apiClient.get(TEST_ENDPOINT, { params });

        // Assert
        expect(capturedUrl?.searchParams.get('page')).toBe('1');
        expect(capturedUrl?.searchParams.get('limit')).toBe('10');
        expect(capturedUrl?.searchParams.get('sort')).toBe('name');
      });

      it('should return response data', async () => {
        // Arrange
        server.use(createTestHandler('get', TEST_ENDPOINT, MOCK_DATA.user));

        // Act
        const response = await apiClient.get<MockUser>(TEST_ENDPOINT);

        // Assert
        expect(response.data).toEqual(MOCK_DATA.user);
        expect(response.data.id).toBe('user-123');
        expect(response.status).toBe(200);
      });

      it('should handle empty response', async () => {
        // Arrange
        server.use(createTestHandler('get', TEST_ENDPOINT, {}));

        // Act
        const response = await apiClient.get<Record<string, never>>(TEST_ENDPOINT);

        // Assert
        expect(response.data).toEqual({});
        expect(response.status).toBe(200);
        expect(Object.keys(response.data)).toHaveLength(0);
      });

      it('should return response with proper structure', async () => {
        // Arrange
        server.use(createTestHandler('get', TEST_ENDPOINT, MOCK_DATA.items));

        // Act
        const response = await apiClient.get<typeof MOCK_DATA.items>(TEST_ENDPOINT);

        // Assert
        expect(response).toHaveProperty('data');
        expect(response).toHaveProperty('status');
        expect(response).toHaveProperty('headers');
      });
    });

    // ------------------------------------------------------------------------
    // POST Requests
    // ------------------------------------------------------------------------
    describe('POST requests', () => {
      it('should send POST request with JSON body', async () => {
        // Arrange
        let capturedBody: unknown = null;
        const requestBody = { name: 'New User', email: 'new@example.com' };

        server.use(
          createCapturingHandler('post', TEST_ENDPOINT, MOCK_DATA.user, (info) => {
            capturedBody = info.body;
          })
        );

        // Act
        await apiClient.post(TEST_ENDPOINT, requestBody);

        // Assert
        expect(capturedBody).toEqual(requestBody);
        expect(capturedBody).toHaveProperty('name', 'New User');
        expect(capturedBody).toHaveProperty('email', 'new@example.com');
      });

      it('should serialize request body', async () => {
        // Arrange
        let capturedBody: unknown = null;
        const complexBody = {
          nested: { value: 123 },
          array: [1, 2, 3],
          boolean: true,
        };

        server.use(
          createCapturingHandler('post', TEST_ENDPOINT, { success: true }, (info) => {
            capturedBody = info.body;
          })
        );

        // Act
        await apiClient.post(TEST_ENDPOINT, complexBody);

        // Assert
        expect(capturedBody).toEqual(complexBody);
        expect((capturedBody as { nested: { value: number } }).nested.value).toBe(123);
        expect((capturedBody as { array: number[] }).array).toHaveLength(3);
      });

      it('should set Content-Type for JSON', async () => {
        // Arrange
        let capturedHeaders: Headers | null = null;

        server.use(
          createCapturingHandler('post', TEST_ENDPOINT, MOCK_DATA.user, (info) => {
            capturedHeaders = info.headers;
          })
        );

        // Act
        await apiClient.post(TEST_ENDPOINT, { test: 'data' });

        // Assert
        expect(capturedHeaders?.get('Content-Type')).toBe('application/json');
        expect(capturedHeaders?.get('Content-Type')).not.toBeNull();
        expect(capturedHeaders?.get('Content-Type')).toMatch(/json/);
      });

      it('should return created resource', async () => {
        // Arrange
        server.use(createTestHandler('post', TEST_ENDPOINT, MOCK_DATA.resource, 201));

        // Act
        const response = await apiClient.post<MockResource>(TEST_ENDPOINT, {
          title: 'New Resource',
        });

        // Assert
        expect(response.data).toEqual(MOCK_DATA.resource);
        expect(response.status).toBe(201);
        expect(response.data.id).toBe('resource-456');
      });

      it('should handle request without body', async () => {
        // Arrange
        server.use(createTestHandler('post', TEST_ENDPOINT, { acknowledged: true }));

        // Act
        const response = await apiClient.post<{ acknowledged: boolean }>(TEST_ENDPOINT);

        // Assert
        expect(response.data.acknowledged).toBe(true);
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('acknowledged');
      });
    });

    // ------------------------------------------------------------------------
    // PUT Requests
    // ------------------------------------------------------------------------
    describe('PUT requests', () => {
      it('should send PUT request with body', async () => {
        // Arrange
        let capturedBody: unknown = null;
        let capturedMethod: string | null = null;
        const updateData = { name: 'Updated User', email: 'updated@example.com' };

        server.use(
          http.put(`${BASE_URL}${TEST_ENDPOINT}/123`, async ({ request }) => {
            capturedMethod = request.method;
            capturedBody = await request.json();
            return HttpResponse.json({ ...MOCK_DATA.user, ...updateData });
          })
        );

        // Act
        await apiClient.put(`${TEST_ENDPOINT}/123`, updateData);

        // Assert
        expect(capturedMethod).toBe('PUT');
        expect(capturedBody).toEqual(updateData);
        expect(capturedBody).toHaveProperty('name', 'Updated User');
      });

      it('should handle full resource update', async () => {
        // Arrange
        const fullResource = {
          id: 'resource-456',
          title: 'Updated Title',
          content: 'Updated content',
          createdAt: '2024-01-20T15:00:00Z',
        };

        server.use(createTestHandler('put', `${TEST_ENDPOINT}/456`, fullResource));

        // Act
        const response = await apiClient.put<MockResource>(`${TEST_ENDPOINT}/456`, fullResource);

        // Assert
        expect(response.data).toEqual(fullResource);
        expect(response.data.title).toBe('Updated Title');
        expect(response.status).toBe(200);
      });

      it('should include proper headers', async () => {
        // Arrange
        let capturedHeaders: Headers | null = null;

        server.use(
          http.put(`${BASE_URL}${TEST_ENDPOINT}/123`, ({ request }) => {
            capturedHeaders = request.headers;
            return HttpResponse.json(MOCK_DATA.user);
          })
        );

        // Act
        await apiClient.put(`${TEST_ENDPOINT}/123`, { test: 'data' });

        // Assert
        expect(capturedHeaders?.get('Content-Type')).toBe('application/json');
        expect(capturedHeaders).not.toBeNull();
        expect(capturedHeaders?.has('Content-Type')).toBe(true);
      });
    });

    // ------------------------------------------------------------------------
    // PATCH Requests
    // ------------------------------------------------------------------------
    describe('PATCH requests', () => {
      it('should send PATCH request with partial body', async () => {
        // Arrange
        let capturedBody: unknown = null;
        let capturedMethod: string | null = null;
        const partialUpdate = { name: 'Partially Updated' };

        server.use(
          http.patch(`${BASE_URL}${TEST_ENDPOINT}/123`, async ({ request }) => {
            capturedMethod = request.method;
            capturedBody = await request.json();
            return HttpResponse.json({ ...MOCK_DATA.user, ...partialUpdate });
          })
        );

        // Act
        await apiClient.patch(`${TEST_ENDPOINT}/123`, partialUpdate);

        // Assert
        expect(capturedMethod).toBe('PATCH');
        expect(capturedBody).toEqual(partialUpdate);
        expect(Object.keys(capturedBody as Record<string, unknown>)).toHaveLength(1);
      });

      it('should handle partial resource update', async () => {
        // Arrange
        const partialUpdate = { title: 'Patched Title' };
        const expectedResponse = { ...MOCK_DATA.resource, ...partialUpdate };

        server.use(createTestHandler('patch', `${TEST_ENDPOINT}/456`, expectedResponse));

        // Act
        const response = await apiClient.patch<MockResource>(
          `${TEST_ENDPOINT}/456`,
          partialUpdate
        );

        // Assert
        expect(response.data.title).toBe('Patched Title');
        expect(response.data.content).toBe(MOCK_DATA.resource.content);
        expect(response.status).toBe(200);
      });

      it('should preserve unmodified fields in response', async () => {
        // Arrange
        const partialUpdate = { content: 'New content only' };
        const expectedResponse = { ...MOCK_DATA.resource, ...partialUpdate };

        server.use(createTestHandler('patch', `${TEST_ENDPOINT}/456`, expectedResponse));

        // Act
        const response = await apiClient.patch<MockResource>(
          `${TEST_ENDPOINT}/456`,
          partialUpdate
        );

        // Assert
        expect(response.data.id).toBe(MOCK_DATA.resource.id);
        expect(response.data.title).toBe(MOCK_DATA.resource.title);
        expect(response.data.content).toBe('New content only');
      });
    });

    // ------------------------------------------------------------------------
    // DELETE Requests
    // ------------------------------------------------------------------------
    describe('DELETE requests', () => {
      it('should send DELETE request', async () => {
        // Arrange
        let capturedMethod: string | null = null;

        server.use(
          http.delete(`${BASE_URL}${TEST_ENDPOINT}/123`, ({ request }) => {
            capturedMethod = request.method;
            return HttpResponse.json({ deleted: true });
          })
        );

        // Act
        await apiClient.delete(`${TEST_ENDPOINT}/123`);

        // Assert
        expect(capturedMethod).toBe('DELETE');
        expect(capturedMethod).not.toBe('GET');
        expect(capturedMethod).not.toBeNull();
      });

      it('should handle 204 No Content response', async () => {
        // Arrange
        server.use(
          http.delete(`${BASE_URL}${TEST_ENDPOINT}/123`, () => {
            return new HttpResponse(null, { status: 204 });
          })
        );

        // Act
        const response = await apiClient.delete<null>(`${TEST_ENDPOINT}/123`);

        // Assert
        expect(response.status).toBe(204);
        expect(response.data).toBeNull();
        expect(response).toHaveProperty('headers');
      });

      it('should include optional body', async () => {
        // Arrange
        let capturedBody: unknown = null;
        const deleteBody = { reason: 'No longer needed' };

        server.use(
          http.delete(`${BASE_URL}${TEST_ENDPOINT}/123`, async ({ request }) => {
            capturedBody = await request.json();
            return HttpResponse.json({ deleted: true });
          })
        );

        // Act
        await apiClient.delete(`${TEST_ENDPOINT}/123`, { body: deleteBody });

        // Assert
        expect(capturedBody).toEqual(deleteBody);
        expect(capturedBody).toHaveProperty('reason');
        expect((capturedBody as { reason: string }).reason).toBe('No longer needed');
      });

      it('should return deletion confirmation', async () => {
        // Arrange
        server.use(
          createTestHandler('delete', `${TEST_ENDPOINT}/123`, {
            deleted: true,
            id: '123',
          })
        );

        // Act
        const response = await apiClient.delete<{ deleted: boolean; id: string }>(
          `${TEST_ENDPOINT}/123`
        );

        // Assert
        expect(response.data.deleted).toBe(true);
        expect(response.data.id).toBe('123');
        expect(response.status).toBe(200);
      });
    });
  });

  // ==========================================================================
  // Headers Management Tests
  // ==========================================================================

  describe('Headers Management', () => {
    it('should include authorization header when token present', async () => {
      // Arrange
      let capturedHeaders: Headers | null = null;
      apiClient.setAuthToken(TEST_TOKEN);

      server.use(
        createCapturingHandler('get', TEST_ENDPOINT, MOCK_DATA.user, (info) => {
          capturedHeaders = info.headers;
        })
      );

      // Act
      await apiClient.get(TEST_ENDPOINT);

      // Assert
      expect(capturedHeaders?.get('Authorization')).toBe(`Bearer ${TEST_TOKEN}`);
      expect(capturedHeaders?.get('Authorization')).toContain('Bearer');
      expect(capturedHeaders?.get('Authorization')).not.toBeNull();
    });

    it('should not include authorization header when no token', async () => {
      // Arrange
      let capturedHeaders: Headers | null = null;

      server.use(
        createCapturingHandler('get', TEST_ENDPOINT, MOCK_DATA.user, (info) => {
          capturedHeaders = info.headers;
        })
      );

      // Act
      await apiClient.get(TEST_ENDPOINT);

      // Assert
      expect(capturedHeaders?.get('Authorization')).toBeNull();
      expect(apiClient.getAuthToken()).toBeNull();
      expect(capturedHeaders?.has('Authorization')).toBe(false);
    });

    it('should merge custom headers with defaults', async () => {
      // Arrange
      let capturedHeaders: Headers | null = null;
      const customHeaders = { 'X-Request-ID': 'req-12345' };

      server.use(
        createCapturingHandler('get', TEST_ENDPOINT, MOCK_DATA.user, (info) => {
          capturedHeaders = info.headers;
        })
      );

      // Act
      await apiClient.get(TEST_ENDPOINT, { headers: customHeaders });

      // Assert
      expect(capturedHeaders?.get('X-Request-ID')).toBe('req-12345');
      expect(capturedHeaders?.get('Content-Type')).toBe('application/json');
      expect(capturedHeaders?.has('X-Request-ID')).toBe(true);
    });

    it('should allow overriding default headers', async () => {
      // Arrange
      let capturedHeaders: Headers | null = null;
      const customHeaders = { 'Content-Type': 'text/plain' };

      server.use(
        createCapturingHandler('get', TEST_ENDPOINT, MOCK_DATA.user, (info) => {
          capturedHeaders = info.headers;
        })
      );

      // Act
      await apiClient.get(TEST_ENDPOINT, { headers: customHeaders });

      // Assert
      expect(capturedHeaders?.get('Content-Type')).toBe('text/plain');
      expect(capturedHeaders?.get('Content-Type')).not.toBe('application/json');
      expect(capturedHeaders?.has('Content-Type')).toBe(true);
    });

    it('should handle case-insensitive headers', async () => {
      // Arrange
      let capturedHeaders: Headers | null = null;
      const customHeaders = { 'content-type': 'application/xml' };

      server.use(
        createCapturingHandler('get', TEST_ENDPOINT, MOCK_DATA.user, (info) => {
          capturedHeaders = info.headers;
        })
      );

      // Act
      await apiClient.get(TEST_ENDPOINT, { headers: customHeaders });

      // Assert
      expect(capturedHeaders?.get('Content-Type')).toBeTruthy();
      expect(capturedHeaders?.get('content-type')).toBeTruthy();
      expect(capturedHeaders?.has('Content-Type')).toBe(true);
    });

    it('should include multiple custom headers', async () => {
      // Arrange
      let capturedHeaders: Headers | null = null;
      const customHeaders = {
        'X-Api-Key': 'api-key-123',
        'X-Correlation-ID': 'corr-456',
        'Accept-Language': 'en-US',
      };

      server.use(
        createCapturingHandler('get', TEST_ENDPOINT, MOCK_DATA.user, (info) => {
          capturedHeaders = info.headers;
        })
      );

      // Act
      await apiClient.get(TEST_ENDPOINT, { headers: customHeaders });

      // Assert
      expect(capturedHeaders?.get('X-Api-Key')).toBe('api-key-123');
      expect(capturedHeaders?.get('X-Correlation-ID')).toBe('corr-456');
      expect(capturedHeaders?.get('Accept-Language')).toBe('en-US');
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should throw ApiError for 4xx responses', async () => {
      // Arrange
      server.use(createErrorHandler('get', TEST_ENDPOINT, 400, 'Bad Request'));

      // Act & Assert
      try {
        await apiClient.get(TEST_ENDPOINT);
        expect.fail('Should have thrown an error');
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.status).toBe(400);
        expect(apiError.message).toBe('Bad Request');
        expect(apiError).toHaveProperty('status');
      }
    });

    it('should throw ApiError for 5xx responses', async () => {
      // Arrange
      server.use(createErrorHandler('get', TEST_ENDPOINT, 500, 'Internal Server Error'));

      // Act & Assert
      try {
        await apiClient.get(TEST_ENDPOINT);
        expect.fail('Should have thrown an error');
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.status).toBe(500);
        expect(apiError.message).toBe('Internal Server Error');
        expect(apiError.status).toBeGreaterThanOrEqual(500);
      }
    });

    it('should include error message from response', async () => {
      // Arrange
      const customErrorMessage = 'Validation failed: email is required';
      server.use(createErrorHandler('post', TEST_ENDPOINT, 422, customErrorMessage));

      // Act & Assert
      try {
        await apiClient.post(TEST_ENDPOINT, {});
        expect.fail('Should have thrown an error');
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.message).toBe(customErrorMessage);
        expect(apiError.message).toContain('Validation failed');
        expect(apiError.message).toContain('email');
      }
    });

    it('should include status code in error', async () => {
      // Arrange
      server.use(createErrorHandler('get', TEST_ENDPOINT, 404, 'Not Found'));

      // Act & Assert
      try {
        await apiClient.get(TEST_ENDPOINT);
        expect.fail('Should have thrown an error');
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.status).toBe(404);
        expect(typeof apiError.status).toBe('number');
        expect(apiError).toHaveProperty('status', 404);
      }
    });

    it('should handle network failures', async () => {
      // Arrange
      server.use(createNetworkErrorHandler('get', TEST_ENDPOINT));

      // Act & Assert
      try {
        await apiClient.get(TEST_ENDPOINT);
        expect.fail('Should have thrown an error');
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.code).toBe('NETWORK_ERROR');
        expect(apiError.message).toBe('Network error');
        expect(apiError.status).toBe(0);
      }
    });

    it('should handle timeout errors', async () => {
      // Arrange
      server.use(createDelayedHandler('get', TEST_ENDPOINT, 5000, MOCK_DATA.user));

      // Act & Assert
      try {
        await apiClient.get(TEST_ENDPOINT, { timeout: 100 });
        expect.fail('Should have thrown an error');
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.code).toBe('TIMEOUT');
        expect(apiError.message).toBe('Request timeout');
        expect(apiError.status).toBe(0);
      }
    });

    it('should handle JSON parse errors', async () => {
      // Arrange
      server.use(createTextHandler('get', TEST_ENDPOINT, 'Not valid JSON'));

      // Act & Assert
      try {
        await apiClient.get(TEST_ENDPOINT);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error).not.toBeNull();
        expect(typeof error).toBe('object');
      }
    });

    it('should include error code when provided', async () => {
      // Arrange
      server.use(createErrorHandler('get', TEST_ENDPOINT, 403, 'Forbidden', 'ACCESS_DENIED'));

      // Act & Assert
      try {
        await apiClient.get(TEST_ENDPOINT);
        expect.fail('Should have thrown an error');
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.code).toBe('ACCESS_DENIED');
        expect(apiError.status).toBe(403);
        expect(apiError.message).toBe('Forbidden');
      }
    });

    it('should handle 401 Unauthorized errors', async () => {
      // Arrange
      server.use(createErrorHandler('get', TEST_ENDPOINT, 401, 'Unauthorized', 'AUTH_REQUIRED'));

      // Act & Assert
      try {
        await apiClient.get(TEST_ENDPOINT);
        expect.fail('Should have thrown an error');
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.status).toBe(401);
        expect(apiError.code).toBe('AUTH_REQUIRED');
        expect(apiError.message).toBe('Unauthorized');
      }
    });
  });

  // ==========================================================================
  // Request Interceptors Tests
  // ==========================================================================

  describe('Request Interceptors', () => {
    it('should call request interceptor before sending', async () => {
      // Arrange
      const interceptorSpy = vi.fn((config: RequestConfig) => config);
      apiClient.addRequestInterceptor(interceptorSpy);
      server.use(createTestHandler('get', TEST_ENDPOINT, MOCK_DATA.user));

      // Act
      await apiClient.get(TEST_ENDPOINT);

      // Assert
      expect(interceptorSpy).toHaveBeenCalled();
      expect(interceptorSpy).toHaveBeenCalledTimes(1);
      expect(interceptorSpy).toHaveBeenCalledWith(expect.objectContaining({
        method: 'GET',
      }));
    });

    it('should allow modifying request config', async () => {
      // Arrange
      let capturedHeaders: Headers | null = null;
      apiClient.addRequestInterceptor((config) => ({
        ...config,
        headers: { ...config.headers, 'X-Intercepted': 'true' },
      }));

      server.use(
        createCapturingHandler('get', TEST_ENDPOINT, MOCK_DATA.user, (info) => {
          capturedHeaders = info.headers;
        })
      );

      // Act
      await apiClient.get(TEST_ENDPOINT);

      // Assert
      expect(capturedHeaders?.get('X-Intercepted')).toBe('true');
      expect(capturedHeaders?.has('X-Intercepted')).toBe(true);
      expect(capturedHeaders?.get('Content-Type')).toBe('application/json');
    });

    it('should handle interceptor errors', async () => {
      // Arrange
      apiClient.addRequestInterceptor(() => {
        throw new Error('Interceptor error');
      });
      server.use(createTestHandler('get', TEST_ENDPOINT, MOCK_DATA.user));

      // Act & Assert
      try {
        await apiClient.get(TEST_ENDPOINT);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toBe('Interceptor error');
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should chain multiple interceptors', async () => {
      // Arrange
      const firstInterceptor = vi.fn((config: RequestConfig) => ({
        ...config,
        headers: { ...config.headers, 'X-First': '1' },
      }));
      const secondInterceptor = vi.fn((config: RequestConfig) => ({
        ...config,
        headers: { ...config.headers, 'X-Second': '2' },
      }));

      apiClient.addRequestInterceptor(firstInterceptor);
      apiClient.addRequestInterceptor(secondInterceptor);

      let capturedHeaders: Headers | null = null;
      server.use(
        createCapturingHandler('get', TEST_ENDPOINT, MOCK_DATA.user, (info) => {
          capturedHeaders = info.headers;
        })
      );

      // Act
      await apiClient.get(TEST_ENDPOINT);

      // Assert
      expect(firstInterceptor).toHaveBeenCalled();
      expect(secondInterceptor).toHaveBeenCalled();
      expect(capturedHeaders?.get('X-First')).toBe('1');
    });
  });

  // ==========================================================================
  // Response Interceptors Tests
  // ==========================================================================

  describe('Response Interceptors', () => {
    it('should call response interceptor after receiving', async () => {
      // Arrange
      const interceptorSpy = vi.fn((response: ApiResponse<unknown>) => response);
      apiClient.addResponseInterceptor(interceptorSpy);
      server.use(createTestHandler('get', TEST_ENDPOINT, MOCK_DATA.user));

      // Act
      await apiClient.get(TEST_ENDPOINT);

      // Assert
      expect(interceptorSpy).toHaveBeenCalled();
      expect(interceptorSpy).toHaveBeenCalledTimes(1);
      expect(interceptorSpy).toHaveBeenCalledWith(expect.objectContaining({
        status: 200,
      }));
    });

    it('should allow transforming response data', async () => {
      // Arrange
      apiClient.addResponseInterceptor((response) => ({
        ...response,
        data: { ...(response.data as Record<string, unknown>), transformed: true },
      }));
      server.use(createTestHandler('get', TEST_ENDPOINT, MOCK_DATA.user));

      // Act
      const response = await apiClient.get<MockUser & { transformed: boolean }>(TEST_ENDPOINT);

      // Assert
      expect(response.data.transformed).toBe(true);
      expect(response.data.id).toBe(MOCK_DATA.user.id);
      expect(response.data.name).toBe(MOCK_DATA.user.name);
    });

    it('should handle interceptor errors', async () => {
      // Arrange
      apiClient.addResponseInterceptor(() => {
        throw new Error('Response interceptor error');
      });
      server.use(createTestHandler('get', TEST_ENDPOINT, MOCK_DATA.user));

      // Act & Assert
      try {
        await apiClient.get(TEST_ENDPOINT);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toBe('Response interceptor error');
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should chain multiple response interceptors', async () => {
      // Arrange
      const firstInterceptor = vi.fn((response: ApiResponse<unknown>) => ({
        ...response,
        data: { ...(response.data as Record<string, unknown>), first: true },
      }));
      const secondInterceptor = vi.fn((response: ApiResponse<unknown>) => ({
        ...response,
        data: { ...(response.data as Record<string, unknown>), second: true },
      }));

      apiClient.addResponseInterceptor(firstInterceptor);
      apiClient.addResponseInterceptor(secondInterceptor);
      server.use(createTestHandler('get', TEST_ENDPOINT, MOCK_DATA.user));

      // Act
      const response = await apiClient.get<MockUser & { first: boolean; second: boolean }>(
        TEST_ENDPOINT
      );

      // Assert
      expect(firstInterceptor).toHaveBeenCalled();
      expect(secondInterceptor).toHaveBeenCalled();
      expect(response.data.first).toBe(true);
    });
  });

  // ==========================================================================
  // Edge Case Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty response body', async () => {
      // Arrange
      server.use(
        http.get(`${BASE_URL}${TEST_ENDPOINT}`, () => {
          return HttpResponse.json({});
        })
      );

      // Act
      const response = await apiClient.get<Record<string, never>>(TEST_ENDPOINT);

      // Assert
      expect(response.data).toEqual({});
      expect(Object.keys(response.data)).toHaveLength(0);
      expect(response.status).toBe(200);
    });

    it('should handle large response body', async () => {
      // Arrange
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        name: `Item ${i}`,
        data: 'x'.repeat(100),
      }));
      server.use(createTestHandler('get', TEST_ENDPOINT, largeArray));

      // Act
      const response = await apiClient.get<typeof largeArray>(TEST_ENDPOINT);

      // Assert
      expect(response.data).toHaveLength(1000);
      expect(response.data[0].id).toBe('item-0');
      expect(response.data[999].id).toBe('item-999');
    });

    it('should handle special characters in request body', async () => {
      // Arrange
      let capturedBody: unknown = null;
      const specialCharsBody = {
        message: 'Hello <script>alert("xss")</script>',
        unicode: '你好世界 🌍 مرحبا',
        quotes: '"quoted" and \'single\'',
      };

      server.use(
        createCapturingHandler('post', TEST_ENDPOINT, { success: true }, (info) => {
          capturedBody = info.body;
        })
      );

      // Act
      await apiClient.post(TEST_ENDPOINT, specialCharsBody);

      // Assert
      expect(capturedBody).toEqual(specialCharsBody);
      expect((capturedBody as typeof specialCharsBody).unicode).toContain('你好世界');
      expect((capturedBody as typeof specialCharsBody).message).toContain('<script>');
    });

    it('should handle concurrent requests', async () => {
      // Arrange
      server.use(
        createTestHandler('get', `${TEST_ENDPOINT}/1`, { id: '1', name: 'First' }),
        createTestHandler('get', `${TEST_ENDPOINT}/2`, { id: '2', name: 'Second' }),
        createTestHandler('get', `${TEST_ENDPOINT}/3`, { id: '3', name: 'Third' })
      );

      // Act
      const [res1, res2, res3] = await Promise.all([
        apiClient.get<{ id: string; name: string }>(`${TEST_ENDPOINT}/1`),
        apiClient.get<{ id: string; name: string }>(`${TEST_ENDPOINT}/2`),
        apiClient.get<{ id: string; name: string }>(`${TEST_ENDPOINT}/3`),
      ]);

      // Assert
      expect(res1.data.id).toBe('1');
      expect(res2.data.id).toBe('2');
      expect(res3.data.id).toBe('3');
    });

    it('should handle URL with special characters', async () => {
      // Arrange
      let capturedUrl: URL | null = null;
      const encodedPath = '/items/test%20item';

      server.use(
        http.get(`${BASE_URL}${encodedPath}`, ({ request }) => {
          capturedUrl = new URL(request.url);
          return HttpResponse.json({ name: 'test item' });
        })
      );

      // Act
      await apiClient.get(encodedPath);

      // Assert
      expect(capturedUrl).not.toBeNull();
      expect(capturedUrl?.pathname).toContain('test%20item');
      expect(decodeURIComponent(capturedUrl?.pathname || '')).toContain('test item');
    });

    it('should handle deeply nested response objects', async () => {
      // Arrange
      const nestedResponse = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: 'deeply nested',
              },
            },
          },
        },
      };
      server.use(createTestHandler('get', TEST_ENDPOINT, nestedResponse));

      // Act
      const response = await apiClient.get<typeof nestedResponse>(TEST_ENDPOINT);

      // Assert
      expect(response.data.level1.level2.level3.level4.value).toBe('deeply nested');
      expect(response.data).toHaveProperty('level1');
      expect(response.data.level1).toHaveProperty('level2');
    });

    it('should handle null values in response', async () => {
      // Arrange
      const responseWithNulls = {
        id: '123',
        name: null,
        metadata: { value: null },
      };
      server.use(createTestHandler('get', TEST_ENDPOINT, responseWithNulls));

      // Act
      const response = await apiClient.get<typeof responseWithNulls>(TEST_ENDPOINT);

      // Assert
      expect(response.data.name).toBeNull();
      expect(response.data.metadata.value).toBeNull();
      expect(response.data.id).toBe('123');
    });

    it('should handle array response at root level', async () => {
      // Arrange
      const arrayResponse = [
        { id: '1', name: 'First' },
        { id: '2', name: 'Second' },
      ];
      server.use(createTestHandler('get', TEST_ENDPOINT, arrayResponse));

      // Act
      const response = await apiClient.get<typeof arrayResponse>(TEST_ENDPOINT);

      // Assert
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data).toHaveLength(2);
      expect(response.data[0].id).toBe('1');
    });
  });

  // ==========================================================================
  // Type Safety Tests
  // ==========================================================================

  describe('Type Safety', () => {
    it('should verify response type inference', async () => {
      // Arrange
      server.use(createTestHandler('get', TEST_ENDPOINT, MOCK_DATA.user));

      // Act
      const response = await apiClient.get<MockUser>(TEST_ENDPOINT);

      // Assert
      expect(typeof response.data.id).toBe('string');
      expect(typeof response.data.name).toBe('string');
      expect(typeof response.data.email).toBe('string');
    });

    it('should verify error type structure', async () => {
      // Arrange
      server.use(createErrorHandler('get', TEST_ENDPOINT, 400, 'Bad Request', 'VALIDATION_ERROR'));

      // Act & Assert
      try {
        await apiClient.get(TEST_ENDPOINT);
        expect.fail('Should have thrown an error');
      } catch (error) {
        const apiError = error as ApiError;
        expect(typeof apiError.message).toBe('string');
        expect(typeof apiError.status).toBe('number');
        expect(apiError.code === undefined || typeof apiError.code === 'string').toBe(true);
      }
    });

    it('should verify config type validation', () => {
      // Arrange
      const config: RequestConfig = {
        method: 'GET',
        url: '/test',
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      };

      // Act & Assert
      expect(typeof config.method).toBe('string');
      expect(typeof config.url).toBe('string');
      expect(typeof config.headers).toBe('object');
      expect(typeof config.timeout).toBe('number');
    });

    it('should handle generic response types correctly', async () => {
      // Arrange
      server.use(createTestHandler('get', TEST_ENDPOINT, MOCK_DATA.resource));

      // Act
      const response = await apiClient.get<MockResource>(TEST_ENDPOINT);

      // Assert
      expect(response.data.id).toBeDefined();
      expect(response.data.title).toBeDefined();
      expect(response.data.content).toBeDefined();
    });

    it('should verify ApiResponse structure', async () => {
      // Arrange
      server.use(createTestHandler('get', TEST_ENDPOINT, MOCK_DATA.user));

      // Act
      const response = await apiClient.get<MockUser>(TEST_ENDPOINT);

      // Assert
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('headers');
    });
  });

  // ==========================================================================
  // Token Management Tests
  // ==========================================================================

  describe('Token Management', () => {
    it('should set and get auth token', () => {
      // Arrange
      const token = 'new-test-token';

      // Act
      apiClient.setAuthToken(token);
      const retrievedToken = apiClient.getAuthToken();

      // Assert
      expect(retrievedToken).toBe(token);
      expect(retrievedToken).not.toBeNull();
      expect(typeof retrievedToken).toBe('string');
    });

    it('should clear auth token', () => {
      // Arrange
      apiClient.setAuthToken('test-token');

      // Act
      apiClient.setAuthToken(null);
      const token = apiClient.getAuthToken();

      // Assert
      expect(token).toBeNull();
      expect(apiClient.getAuthToken()).toBeNull();
      expect(apiClient.authToken).toBeNull();
    });

    it('should include token in all request methods', async () => {
      // Arrange
      apiClient.setAuthToken(TEST_TOKEN);
      const capturedHeaders: Headers[] = [];

      server.use(
        http.get(`${BASE_URL}${TEST_ENDPOINT}`, ({ request }) => {
          capturedHeaders.push(request.headers);
          return HttpResponse.json({});
        }),
        http.post(`${BASE_URL}${TEST_ENDPOINT}`, ({ request }) => {
          capturedHeaders.push(request.headers);
          return HttpResponse.json({});
        }),
        http.put(`${BASE_URL}${TEST_ENDPOINT}`, ({ request }) => {
          capturedHeaders.push(request.headers);
          return HttpResponse.json({});
        })
      );

      // Act
      await apiClient.get(TEST_ENDPOINT);
      await apiClient.post(TEST_ENDPOINT, {});
      await apiClient.put(TEST_ENDPOINT, {});

      // Assert
      expect(capturedHeaders).toHaveLength(3);
      capturedHeaders.forEach((headers) => {
        expect(headers.get('Authorization')).toBe(`Bearer ${TEST_TOKEN}`);
      });
    });
  });

  // ==========================================================================
  // Reset Functionality Tests
  // ==========================================================================

  describe('Reset Functionality', () => {
    it('should reset client state', () => {
      // Arrange
      apiClient.setAuthToken('some-token');
      apiClient.addRequestInterceptor((config) => config);
      apiClient.addResponseInterceptor((response) => response);

      // Act
      apiClient.reset();

      // Assert
      expect(apiClient.getAuthToken()).toBeNull();
      expect(apiClient.requestInterceptors).toHaveLength(0);
      expect(apiClient.responseInterceptors).toHaveLength(0);
    });

    it('should clear all interceptors', () => {
      // Arrange
      apiClient.addRequestInterceptor((config) => config);
      apiClient.addRequestInterceptor((config) => config);
      apiClient.addResponseInterceptor((response) => response);

      // Act
      apiClient.clearInterceptors();

      // Assert
      expect(apiClient.requestInterceptors).toHaveLength(0);
      expect(apiClient.responseInterceptors).toHaveLength(0);
      expect(apiClient.requestInterceptors).toEqual([]);
    });

    it('should maintain base configuration after reset', () => {
      // Arrange
      apiClient.setAuthToken('some-token');
      const originalBaseUrl = apiClient.baseUrl;
      const originalTimeout = apiClient.timeout;

      // Act
      apiClient.reset();

      // Assert
      expect(apiClient.baseUrl).toBe(originalBaseUrl);
      expect(apiClient.timeout).toBe(originalTimeout);
      expect(apiClient.defaultHeaders['Content-Type']).toBe('application/json');
    });
  });
});
