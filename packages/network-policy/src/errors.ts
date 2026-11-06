export class NetworkPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkPolicyError";
  }
}

export class HostNotAllowedError extends Error {
  readonly url: string;

  constructor(url: string) {
    super(`host is not allowed by the network policy: ${url}`);
    this.name = "HostNotAllowedError";
    this.url = url;
  }
}

export class RpcError extends Error {
  readonly code?: number;

  constructor(message: string, code?: number) {
    super(message);
    this.name = "RpcError";
    this.code = code;
  }
}
