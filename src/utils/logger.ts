export function logServiceError(message: string, error: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.error(message, error);
  }
}
