export class ResolveError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ResolveError";
    this.status = status;
  }
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "没找到分享者，请检查链接后再试";
}
