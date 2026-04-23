const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../../Config/cloudinary');

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

const upload = multer({ storage });

module.exports = upload;