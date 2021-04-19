import * as bodyParser from 'body-parser';
import express, { NextFunction, Response, Request, Express } from 'express';

import {
    Conf,
    Logger,
    JwtWrapper,
    Misc,
    FlApi
} from '@jamestiberiuskirk/fl-shared';

import { DbClient } from '../clients/db';
import { TrackingPointsRouter } from './TrackingPointsRouter';
import { TrackingGroupRouter } from './TrackingGoupsRouter';

/**
 * Class for instantiating HTTP server.
 */
export class Server {

    /* Server conf. */
    conf: Conf.ServerConfig;

    /* The Express app. */
    app: Express;

    /* The db client */
    db: DbClient;

    /* The internal fl api client. */
    flApi: FlApi

    /**
     * Constructor.
     * @param conf Server config.
     */
    constructor(conf: Conf.ServerConfig, db: DbClient, flApi: FlApi) {
        this.conf = conf;
        this.app = express();
        this.db = db;
        this.flApi = flApi;
        this.initMiddleware();
        this.initRoutes();
    }

    /**
     * Init express server.
     */
    initServer(): Promise<void> {
        return new Promise((resolve) => {
            this.app.listen(this.conf.port, () => {
                Logger.log('Http server started on port ' + this.conf.port);
                resolve();
            });
        });
    }

    /**
     * Initializing all the routers and routes.
     */
    initRoutes() {
        this.app.use('/point', TrackingPointsRouter());
        this.app.use('/group', TrackingGroupRouter());
    }

    /**
     * Initializing middleware.
     */
    initMiddleware() {
        this.disableServerCors();

        this.app.use(Misc.GetMorganMiddleware());
        this.app.use(bodyParser.json());

        // Injecting the database and the logger into each request
        this.app.use((req: Request, res: Response, next: NextFunction) => {
            res.locals.db = this.db;
            res.locals.flApi = this.flApi;
            next();
        });

        this.app.use(JwtWrapper.authMiddleware);
    }


    /**
     * This is for disabling CORS request.
     */
    disableServerCors() {
        this.app.use((req: Request, res: Response, next: NextFunction) => {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            next();
        });
    }
}
