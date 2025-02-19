import Keyv from 'keyv';
import mysql from 'mysql2/promise';
import pg from 'pg';
import oracledb from 'oracledb';

interface DatabaseConfig {
    type: 'mysql' | 'postgresql' | 'oracle';
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
}

class DatabaseConnectionManager {
    private static instance: DatabaseConnectionManager;
    private connectionCache: Keyv;
    
    private constructor() {
        this.connectionCache = new Keyv({ namespace: 'db-connections' });
    }

    static getInstance(): DatabaseConnectionManager {
        if (!DatabaseConnectionManager.instance) {
            DatabaseConnectionManager.instance = new DatabaseConnectionManager();
        }
        return DatabaseConnectionManager.instance;
    }

    async getConnection(config: DatabaseConfig) {
        const cacheKey = `${config.type}-${config.host}-${config.database}`;
        let connection = await this.connectionCache.get(cacheKey);

        if (!connection) {
            connection = await this.createConnection(config);
            await this.connectionCache.set(cacheKey, connection);
        }

        return connection;
    }

    private async createConnection(config: DatabaseConfig) {
        switch (config.type) {
            case 'mysql':
                return await mysql.createConnection({
                    host: config.host,
                    port: config.port,
                    user: config.username,
                    password: config.password,
                    database: config.database
                });

            case 'postgresql':
                return new pg.Client({
                    host: config.host,
                    port: config.port,
                    user: config.username,
                    password: config.password,
                    database: config.database
                });

            case 'oracle':
                return await oracledb.getConnection({
                    user: config.username,
                    password: config.password,
                    connectString: `${config.host}:${config.port}/${config.database}`
                });

            default:
                throw new Error(`Unsupported database type: ${config.type}`);
        }
    }
}
