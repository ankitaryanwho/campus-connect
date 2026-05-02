export class ApiError extends Error {
  status?: number;
  isNetworkError: boolean;
  isTimeout: boolean;

  constructor(opts: {
    message?: string;
    status?: number;
    isNetworkError?: boolean;
    isTimeout?: boolean;
  }) {
    super(opts.message ?? (opts.status ? `HTTP ${opts.status}` : "API error"));
    this.name = "ApiError";
    this.status = opts.status;
    this.isNetworkError = opts.isNetworkError ?? false;
    this.isTimeout = opts.isTimeout ?? false;
  }
}

export function throwIfNotOk(res: Response): void {
  if (!res.ok) {
    throw new ApiError({
      status: res.status,
      isNetworkError: false,
      message: `HTTP ${res.status}`,
    });
  }
}
