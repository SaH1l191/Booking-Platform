import express from "express";
import logger from "./config/logger";
import { serverConfig } from "./config";
import { appErrorHandler, genericErrorHandler } from "./middlewares/error.middleware";
import v1Router from "./routers/v1/index.router";
import sequelize from "./db/models/sequelize"; 

const app = express();
const PORT = process.env.PORT || 5000;



app.use(express.json());
app.get("/", (req, res) => res.send("Welcome"))
app.use('/api/v1', v1Router);
app.use(appErrorHandler)
app.use(genericErrorHandler)


app.listen(PORT, async () => {
  logger.info(`Server is running on http://localhost:${serverConfig.PORT}`);
  logger.info(`Press Ctrl+C to stop the server.`);

  try{
    await sequelize.authenticate();  
  }catch (error ){
    logger.error('Unable to connect to the database:', error);
  }
}); 

