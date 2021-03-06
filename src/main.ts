import * as dotenv from 'dotenv';

import { Env, FlApi, initStopHandler } from '@jamestiberiuskirk/fl-shared';
import { Server } from './server/server';
import { DbClient } from './clients/db';

initStopHandler();
dotenv.config();


const config: Env.MicroserviceEnvConfig = new Env.MicroserviceEnvConfig();

const db: DbClient = new DbClient(config.dbConfig);
const flApi: FlApi = new FlApi(config.flApiHost);

db.init().then(() => {
    const httpServer: Server =
        new Server(config.serverConfig, db, flApi);
    httpServer.initServer();
});

