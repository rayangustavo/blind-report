/** Erros de domínio do Blind Report. Cada tipo de falha tem um nome estável para testes e logs. */

export class InvalidNewsroomNameError extends Error {
  readonly newsroom: string;

  constructor(newsroom: string) {
    super(`invalid newsroom name: ${JSON.stringify(newsroom)}`);
    this.name = "InvalidNewsroomNameError";
    this.newsroom = newsroom;
  }
}

export class InvalidEpochError extends Error {
  readonly epoch: string;

  constructor(epoch: string) {
    super(`invalid epoch: ${JSON.stringify(epoch)} (expected YYYY-MM)`);
    this.name = "InvalidEpochError";
    this.epoch = epoch;
  }
}

export class PolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PolicyError";
  }
}

export class Base64UrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Base64UrlError";
  }
}

export class ValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`submission rejected: ${issues.join("; ")}`);
    this.name = "ValidationError";
    this.issues = issues;
  }
}

export class IntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntegrityError";
  }
}
