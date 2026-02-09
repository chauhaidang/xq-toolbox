/**
 * Log levels for the logger
 */
export const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
} as const;

type LogLevel = typeof LOG_LEVELS[keyof typeof LOG_LEVELS];
type LogLevelName = keyof typeof LOG_LEVELS;

const LOG_COLORS = {
    DEBUG: '\x1b[36m',
    INFO: '\x1b[32m',
    WARN: '\x1b[33m',
    ERROR: '\x1b[31m',
    RESET: '\x1b[0m'
} as const;

/**
 * Logger instance for logging messages with different severity levels
 */
export interface Logger {
    /**
     * Sets the minimum log level
     * @param level - The log level (DEBUG, INFO, WARN, ERROR) as a string or number
     */
    setLevel(level: string | number): void;

    /**
     * Logs a debug message
     * @param message - The message to log
     * @param args - Additional arguments to log
     */
    debug(message: string, ...args: any[]): void;

    /**
     * Logs an info message
     * @param message - The message to log
     * @param args - Additional arguments to log
     */
    info(message: string, ...args: any[]): void;

    /**
     * Logs a warning message
     * @param message - The message to log
     * @param args - Additional arguments to log
     */
    warn(message: string, ...args: any[]): void;

    /**
     * Logs an error message
     * @param message - The message to log
     * @param args - Additional arguments to log
     */
    error(message: string, ...args: any[]): void;
}

class LoggerImpl implements Logger {
    private level: LogLevel = LOG_LEVELS.INFO;

    setLevel(level: string | number): void {
        if (typeof level === 'string') {
            const upperLevel = level.toUpperCase() as LogLevelName;
            this.level = LOG_LEVELS[upperLevel] ?? LOG_LEVELS.INFO;
        } else {
            this.level = level as LogLevel;
        }
    }

    private formatMessage(level: LogLevelName, message: string, ...args: any[]): string {
        const timestamp = new Date().toISOString();
        const color = LOG_COLORS[level];
        const reset = LOG_COLORS.RESET;
        const formattedArgs = args.length > 0
            ? ' ' + args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ')
            : '';

        return `${color}[${timestamp}] ${level}: ${message}${formattedArgs}${reset}`;
    }

    private log(level: LogLevelName, message: string, ...args: any[]): void {
        if (LOG_LEVELS[level] >= this.level) {
            console.log(this.formatMessage(level, message, ...args));
        }
    }

    debug(message: string, ...args: any[]): void {
        this.log('DEBUG', message, ...args);
    }

    info(message: string, ...args: any[]): void {
        this.log('INFO', message, ...args);
    }

    warn(message: string, ...args: any[]): void {
        this.log('WARN', message, ...args);
    }

    error(message: string, ...args: any[]): void {
        this.log('ERROR', message, ...args);
    }
}

/**
 * Singleton logger instance
 */
export const logger: Logger = new LoggerImpl();
