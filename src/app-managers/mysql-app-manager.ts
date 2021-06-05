import { SqlAppManager } from './sql-app-manager';

export class MysqlAppManager extends SqlAppManager {
    /**
     * Get the client name to be used by Knex.
     *
     * @return {string}
     */
    protected knexClientName(): string {
        return 'mysql';
    }

    /**
     * Get the object connection details for Knex.
     *
     * @return {any}
     */
    protected knexConnectionDetails(): any {
        return {
            ...this.options.database.mysql,
        };
    }

    /**
     * Get the connection version for Knex.
     * For MySQL can be 5.7 or 8.0, etc.
     *
     * @return {string}
     */
    protected knexVersion(): string {
        return this.options.appManager.mysql.version;
    }

    /**
     * Wether the manager supports pooling. This introduces
     * additional settings for connection pooling.
     *
     * @return {boolean}
     */
    protected supportsPooling(): boolean {
        return true;
    }

    /**
     * Get the table name where the apps are stored.
     *
     * @return {string}
     */
    protected appsTableName(): string {
        return this.options.appManager.mysql.table;
    }
}
