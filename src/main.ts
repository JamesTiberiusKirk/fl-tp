import * as dotenv from 'dotenv';

import { Env, initStopHandler } from '@jamestiberiuskirk/fl-shared';
import { Server } from './server/server';
import { DbClient } from './clients/db';

initStopHandler();
dotenv.config();


const config: Env.MicroserviceEnvConfig = new Env.MicroserviceEnvConfig();

const db: DbClient = new DbClient(config.dbConfig);

db.init().then(() => {
    const httpServer: Server = new Server(config.serverConfig, db);
    httpServer.initServer();
});

