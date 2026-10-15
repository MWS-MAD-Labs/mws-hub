export class ResponseError extends Error {
  constructor(
    public status: number,
    public message: string,
    // Optional name for the failure, for callers that show it by name (the login page).
    public code?: string,
  ) {
    super(message);
  }
}
