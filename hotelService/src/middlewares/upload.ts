import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinaryConnect from "../config/cloudinary";
import multer from 'multer'

const storage = new CloudinaryStorage({
    cloudinary: cloudinaryConnect,
    params: {
        folder: 'hotel-images',
        allowedFormats: ['jpg', 'png', "jpeg", "gif", "webp"],
        transformation: [
            { width: 800, height: 600, crop: "limit" },
            { quality: "auto" }
        ],
    } as any
})

export const upload = multer({
    storage,
    limits: {
        fileSize: 1024 * 1024 * 5,
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true)
        } else {
            cb(new Error("Please upload only images"))
        }
    }
})
