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

/** Nome de redação não registrado/ativo no ENS. */
export class NewsroomNotFoundError extends EnsResolutionError {
  constructor(name: string) {
    super(`newsroom not found: ${name}`);
    this.name = "NewsroomNotFoundError";
  }
}

/** Registros ENS da redação publicados de forma inválida ou incompleta. */
export class RecordsError extends EnsResolutionError {
  constructor(public readonly field: string, detail?: string) {
    super(`invalid newsroom record "${field}"${detail ? `: ${detail}` : ""}`);
    this.name = "RecordsError";
  }
}
