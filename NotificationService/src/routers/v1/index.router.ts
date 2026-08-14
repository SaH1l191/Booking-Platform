import express from 'express';
const v1Router = express.Router();

v1Router.get('/error-test', (req, res) => {
  res.status(500).json({ success: false, message: "Dummy 500 Internal Server Error" });
});

export default v1Router;