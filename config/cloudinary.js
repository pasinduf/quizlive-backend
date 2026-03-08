const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file buffer to Cloudinary with optional fixed public ID to optimize storage
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} folder - The Cloudinary folder name
 * @param {string} publicId - The record's unique ID for overwriting
 * @returns {Promise<string>} - The secure URL of the uploaded image
 */
const uploadToCloudinary = (fileBuffer, folder = 'quiz-app/players', publicId = null) => {
    return new Promise((resolve, reject) => {
        const options = {
            folder,
            resource_type: 'image',
            transformation: [
                { width: 200, height: 200, crop: 'fill', gravity: 'face' },
            ],
        };

        if (publicId) {
            options.public_id = publicId;
            options.overwrite = true;
            options.invalidate = true; // Invalidate CDN cache
        }

        const stream = cloudinary.uploader.upload_stream(
            options,
            (error, result) => {
                if (error) reject(error);
                else resolve(result.secure_url);
            }
        );
        stream.end(fileBuffer);
    });
};

module.exports = { cloudinary, uploadToCloudinary };
