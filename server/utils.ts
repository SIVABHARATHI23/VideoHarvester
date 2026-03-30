import express, { type Express } from "express";
import { fileURLToPath } from "url";
import path, { dirname } from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export function serveStatic(app: Express) {
  // In the Docker container, dist/index.js is at /app/dist/index.js
  // and assets are at /app/dist/public
  const distPath = path.resolve(__dirname, "public");

  log(`Checking for static assets at: ${distPath}`);

  if (!fs.existsSync(distPath)) {
    log(`❌ WARNING: Static directory not found: ${distPath}`, "express");
    // Fallback to searching one level up just in case
    const fallbackPath = path.resolve(__dirname, "..", "dist", "public");
    if (fs.existsSync(fallbackPath)) {
       log(`✅ Found fallback at: ${fallbackPath}`, "express");
       app.use(express.static(fallbackPath));
       app.use("*", (_req, res) => {
         res.sendFile(path.resolve(fallbackPath, "index.html"));
       });
       return;
    }
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // Catch-all route to serve index.html for client-side routing
  app.use("*", (req, res, next) => {
    // If the request is for an asset that wasn't found, don't serve index.html
    if (req.path.includes('.') || req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
