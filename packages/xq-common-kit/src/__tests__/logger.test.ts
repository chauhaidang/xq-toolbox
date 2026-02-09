import { logger, LOG_LEVELS } from '../logger';

describe('Logger', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    test('should log info messages by default', () => {
        logger.info('Test info message');
        expect(consoleSpy).toHaveBeenCalledTimes(1);
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('INFO: Test info message')
        );
    });

    test('should log error messages', () => {
        logger.error('Test error message');
        expect(consoleSpy).toHaveBeenCalledTimes(1);
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('ERROR: Test error message')
        );
    });

    test('should log warn messages', () => {
        logger.warn('Test warn message');
        expect(consoleSpy).toHaveBeenCalledTimes(1);
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('WARN: Test warn message')
        );
    });

    test('should not log debug messages by default', () => {
        logger.debug('Test debug message');
        expect(consoleSpy).not.toHaveBeenCalled();
    });

    test('should log debug messages when level is set to DEBUG', () => {
        logger.setLevel('DEBUG');
        logger.debug('Test debug message');
        expect(consoleSpy).toHaveBeenCalledTimes(1);
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('DEBUG: Test debug message')
        );
        logger.setLevel('INFO');
    });

    test('should handle multiple arguments', () => {
        logger.info('Test message', 'arg1', 'arg2');
        expect(consoleSpy).toHaveBeenCalledTimes(1);
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('INFO: Test message arg1 arg2')
        );
    });

    test('should handle object arguments', () => {
        const testObj = { key: 'value' };
        logger.info('Test message', testObj);
        expect(consoleSpy).toHaveBeenCalledTimes(1);
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('INFO: Test message')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining(JSON.stringify(testObj, null, 2))
        );
    });

    test('should include timestamp in log messages', () => {
        logger.info('Test message');
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/)
        );
    });

    test('should respect log level filtering', () => {
        logger.setLevel('WARN');

        logger.debug('Debug message');
        logger.info('Info message');
        logger.warn('Warn message');
        logger.error('Error message');

        expect(consoleSpy).toHaveBeenCalledTimes(2);
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('WARN: Warn message')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('ERROR: Error message')
        );

        logger.setLevel('INFO');
    });

    test('should handle numeric log level', () => {
        logger.setLevel(LOG_LEVELS.ERROR);

        logger.info('Info message');
        logger.warn('Warn message');
        logger.error('Error message');

        expect(consoleSpy).toHaveBeenCalledTimes(1);
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('ERROR: Error message')
        );

        logger.setLevel('INFO');
    });

    test('should default to INFO level for invalid level strings', () => {
        logger.setLevel('INVALID');
        logger.info('Info message');
        logger.debug('Debug message');

        expect(consoleSpy).toHaveBeenCalledTimes(1);
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('INFO: Info message')
        );
    });
});
