import multer from 'multer';
import { CloudinaryStorage  } from 'multer-storage-cloudinary';
import cloudinary from '../../Config/cloudinary.js';

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: (req, file) => {
            // Organize uploads based on route
            if (req.originalUrl.includes('/admin')) {
                return 'products';
            }
            return 'profiles';
        },
        allowedFormats: ['jpg', 'png', 'jpeg', 'webp']
    }
});

console.log("Multer Cloudinary Storage initialized");

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (jpg, jpeg, png, webp) are allowed!'), false);
    }
};

const upload = multer({ 
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

export default upload;