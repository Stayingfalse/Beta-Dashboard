# Beta Dashboard

This is a Next.js app scaffolded to run both frontend and backend (API routes) within a single Docker container. It is configured for external MongoDB connection using environment variables.

## Getting Started

1. Copy `.env.example` to `.env` and set your `MONGODB_URI`.
2. Build and run with Docker Compose:
   ```powershell
   docker-compose up --build
   ```
3. The app will be available at [http://localhost:3000](http://localhost:3000)

## API Example
- Visit [http://localhost:3000/api/hello](http://localhost:3000/api/hello) to test the backend API route.

## Development
- To run locally without Docker:
   ```powershell
   npm install
   npm run dev
   ```

## Containerization
- The `Dockerfile` and `docker-compose.yml` are set up for production deployment.
- Environment variables are used for MongoDB connection.

---

This project uses Next.js App Router, TypeScript, Tailwind CSS, and ESLint.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
