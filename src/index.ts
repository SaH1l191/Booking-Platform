import express from 'express' 
import { loadEnv } from './config/index.ts'
import v1Router from './router/v1/index.ts'
import { appErrorHandler } from './middlewares/error.middleware.ts'

loadEnv()

const app = express()
app.use(express.json())

app.use('/api/v1',v1Router)


app.use(appErrorHandler); 

app.listen(3000, () => {
    console.log('Server started on port 3000')
})

