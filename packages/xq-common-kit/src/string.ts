/**
 * Generates a random alphanumeric string of specified length
 * @param length - The desired length of the random string
 * @returns A random string containing letters (A-Z, a-z) and numbers (0-9)
 */
export function generateRandomString(length: number): string {
    const randomChars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += randomChars.charAt(
            Math.floor(Math.random() * randomChars.length)
        );
    }
    return result;
}
