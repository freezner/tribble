import { createNodeServer, installShutdownHandlers, LISTEN_HOST, parsePort } from './node-server.mjs';

const port = parsePort(process.env.PORT);
const server = createNodeServer();
installShutdownHandlers(server);
server.listen(port, LISTEN_HOST);
