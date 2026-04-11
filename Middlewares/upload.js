const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../Config/cloudinary');

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'profile_pictures',
        allowedFormats: ['jpg', 'png', 'jpeg']
    }
});

console.log("Multer Cloudinary Storage initialized");

const upload = multer({ storage });

module.exports = upload;