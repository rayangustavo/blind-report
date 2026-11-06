import { createRelayerComposition } from "./compose";

const { server } = createRelayerComposition();

await server.start();
console.log(`Blind Report relayer listening on port ${server.port}`);
