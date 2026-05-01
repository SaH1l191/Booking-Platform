import { Queue } from "bullmq"
import { getRedis } from "../config/redis.config"


export const MAIL_QUEUE  = "queue-mail" 

export const mailQueue = new Queue(MAIL_QUEUE,{
    connection :getRedis()
})