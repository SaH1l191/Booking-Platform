import express  from "express";
import dotenv from "dotenv";
import { appErrorHandler } from "./middlewares/error.middleware";
import v1Router from "./routers/v1/routes";
import { serverConfig } from "./config";
dotenv.config();

const app = express();
app.use(express.json());

app.use(v1Router);
app.use(appErrorHandler);
 
app.listen(serverConfig.port, () => {
  console.log(`Server running on port ${serverConfig.port}`);
});  