# ChainRemit Backend

A Node.js/Express backend for ChainRemit, written in TypeScript.

## Features
- Structured logging with Winston
- API documentation with Swagger (OpenAPI)
- Environment-based configuration
- Security best practices (Helmet, CORS)
- Static Application Security Testing (SAST) with CodeQL

## Setup

1. **Clone the repository:**
   ```sh
   git clone https://github.com/MetroLogic/chainremit_backend.git
   cd chainremit_backend
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Configure environment variables:**
   - Copy `.env.example` to `.env.development`, `.env.production`, etc. and set values as needed.

4. **Run the development server:**
   ```sh
   npm run dev
   ```

## Usage

- The server will start on the port specified in your `.env` file (default: 3000).
- Health check endpoint: `GET /health`
- API documentation: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

## API Documentation

Interactive API docs are available at `/api-docs` once the server is running. Documentation is generated using Swagger/OpenAPI.

## Static Application Security Testing (SAST)

CodeQL is configured via GitHub Actions to automatically analyze code for security vulnerabilities on push and pull requests to `main`.

## Scripts
- `npm run dev` — Start development server with hot reload
- `npm run build` — Compile TypeScript to JavaScript
- `npm start` — Run compiled app
- `npm test` — Run tests
- `npm run lint` — Lint code
- `npm run format` — Format code

## License

MIT
