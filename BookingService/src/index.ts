import express  from "express";
import dotenv from "dotenv";
import { appErrorHandler } from "./middlewares/error.middleware.js";
import v1Router from "./routers/v1/routes.js";
import { serverConfig } from "./config/index.js";
dotenv.config();

const app = express();
app.use(express.json());

app.use(v1Router);
app.use(appErrorHandler);
 
app.listen(serverConfig.port, () => {
  console.log(`Server running on port ${serverConfig.port}`);
});  
//docker run -d --name my-redis -p 6379:6379 redis:latest   