import { Response } from 'express';


export function sendSuccess<T>(res: Response, data: T, message = 'OK',status = 200) {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
}


export function sendError(res: Response, status: number, message: string) {
  return res.status(status).json({
    success: false,
    message,
  });
}
