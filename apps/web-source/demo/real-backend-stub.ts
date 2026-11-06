// Stub do backend real para o bundle da demo: nunca é chamado (__DEMO_MODE__ é true),
// mas evita puxar ENS/Arkiv/viem para uma UI que roda com dados simulados.
export async function createRealBackend(): Promise<never> {
  throw new Error("backend real indisponível na demonstração");
}
