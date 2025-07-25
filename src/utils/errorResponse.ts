/**
 * Custom error class for standardized error responses
 */
export class ErrorResponse extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;

        // Ensure proper prototype chain
        Object.setPrototypeOf(this, ErrorResponse.prototype);
    }
}
