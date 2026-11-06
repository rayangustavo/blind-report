export class EnsResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnsResolutionError";
  }
}

export class EnsAdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnsAdminError";
  }
}
