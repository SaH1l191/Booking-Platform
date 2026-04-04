import express from 'express'

const v1Router : express.Router = express.Router()

v1Router.get('/ping',(req: express.Request, res: express.Response) => {
    res.json({ message: 'pong!' })
})
export default v1Router