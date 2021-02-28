import { MongoClient, Collection } from 'mongodb';

import { Logger, Conf } from '@jamestiberiuskirk/fl-shared';

export enum Collections {
    TrackingPoints = 'tracking-points',
    TrackingGroups = 'tracking-groups',
}

/**
 * Class for instantiating a HTTP client.
 */
export class DbClient {

    /* Database config. */
    dbConfig: Conf.DbConfig;

    /* Database connection. */
    conn!: MongoClient;

    constructor(dbConfig: Conf.DbConfig) {
        this.dbConfig = dbConfig;
    }

    /* Initializes the db connection */
    async init() {
        const mongoURI = `mongodb://${this.dbConfig.username}:${this.dbConfig.password}` +
            `@${this.dbConfig.host}:${this.dbConfig.port}` +
            `/${this.dbConfig.database}?authMechanism=SCRAM-SHA-256`;
        this.conn = new MongoClient(mongoURI, { useUnifiedTopology: true });
        try {
            await this.conn.connect();
            await this.conn.db(this.dbConfig.database).command({ ping: 1 });
            Logger.dbLog('Database connected');
        } catch (err) {
            Logger.dbErr(err.message);
            process.exit(1);
        }
    };

    /* Disconnect function. */
    async disconnect() {
        if (!this.conn) {
            return;
        }
        await this.conn.connect();
        Logger.dbLog('Database disconnected');

    }

    /**
     * Return an instance of a mongodb collection.
     * @param collectionName Collection enum.
     */
    getCollection(collectionName: Collections): Collection {
        return this.conn.db(this.dbConfig.database).collection(collectionName);
    }
}