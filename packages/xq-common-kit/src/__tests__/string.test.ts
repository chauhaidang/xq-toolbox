import { generateRandomString } from '../string';

describe('String Module', () => {
    test('generateRandomString should return string of specified length', () => {
        const length = 10;
        const result = generateRandomString(length);
        expect(result).toHaveLength(length);
    });

    test('generateRandomString should return alphanumeric characters only', () => {
        const result = generateRandomString(20);
        expect(result).toMatch(/^[A-Za-z0-9]+$/);
    });

    test('generateRandomString should return different strings on multiple calls', () => {
        const length = 8;
        const result1 = generateRandomString(length);
        const result2 = generateRandomString(length);
        expect(result1).not.toBe(result2);
    });

    test('generateRandomString should handle zero length', () => {
        const result = generateRandomString(0);
        expect(result).toBe('');
    });
});
