import express from 'express';
import { redis, createServer, getServerPort } from '@devvit/web/server';
import { GameRedis } from './core/redis';
import { createApiRoutes, createInternalRoutes,  createMenuRoutes } from './routes';

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

const gameRedis = new GameRedis(redis);

// Create route handlers
const apiRoutes = createApiRoutes(gameRedis);
const internalRoutes = createInternalRoutes(gameRedis);
const menuRoutes = createMenuRoutes(gameRedis);

// Use route middleware
app.use(apiRoutes);
app.use(internalRoutes);
app.use(menuRoutes);

// Get port from environment variable with fallback
const port = getServerPort();

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);
