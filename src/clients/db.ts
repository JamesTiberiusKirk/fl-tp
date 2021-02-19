import { ConnectionOptions, connect, Connection, disconnect } from 'mongoose';

import { Logger, Conf} from '@jamestiberiuskirk/fl-shared';

/**
 * Class for instantiating a HTTP client.
 */
export class DbClient {

    /* Database config. */
    dbConfig: Conf.DbConfig;

    /* Database connection. */
    conn!: Connection;

    constructor(dbConfig: Conf.DbConfig) {
        this.dbConfig = dbConfig;
    }

    /* Initializes the db connection */
    async init() {
        const mongoURI = `mongodb://${this.dbConfig.username}:${this.dbConfig.password}@${this.dbConfig.host}:${this.dbConfig.port}/${this.dbConfig.database}`;
        try {
            const options: ConnectionOptions = {
                useNewUrlParser: true,
                useCreateIndex: true,
                useFindAndModify: false,
                useUnifiedTopology: true,
            };
            await connect(mongoURI, options);
            Logger.dbLog('Database connected');
        } catch (err) {
            Logger.dbErr(err.message);
            process.exit(1);
        }
    };

    /* Disconnect function. */
    disconnect() {
        if (!this.conn) {
            return;
        }

        disconnect().then(() => {
            Logger.dbLog('Database disconnected');
        });

    }
}