const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Error: Images Only (jpeg, jpg, png, webp, gif)!"));
    }
});

function validateMagicBytes(filePath) {
    try {
        if (!fs.existsSync(filePath)) return false;
        const buffer = Buffer.alloc(12);
        const fd = fs.openSync(filePath, 'r');
        const bytesRead = fs.readSync(fd, buffer, 0, 12, 0);
        fs.closeSync(fd);

        if (bytesRead < 4) return false;

        // PNG: 89 50 4E 47
        if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
            return true;
        }

        // JPEG: FF D8 FF
        if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
            return true;
        }

        // GIF: 47 49 46 38 ('GIF8')
        if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
            return true;
        }

        // WEBP: RIFF (0..3) ... WEBP (8..11) (STRICTLY RIFF+WEBP ONLY)
        if (bytesRead >= 12 &&
            buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
            buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
            return true;
        }

        return false;
    } catch (err) {
        return false;
    }
}

function validateImageMagicBytes(req, res, next) {
    const filesToValidate = [];
    if (req.file) filesToValidate.push(req.file);
    if (req.files) {
        if (Array.isArray(req.files)) {
            filesToValidate.push(...req.files);
        } else {
            Object.values(req.files).forEach(fileArr => {
                if (Array.isArray(fileArr)) filesToValidate.push(...fileArr);
            });
        }
    }

    for (const file of filesToValidate) {
        if (!validateMagicBytes(file.path)) {
            try {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            } catch (unlinkErr) {}
            return res.status(400).json({ error: "Invalid file content: Magic byte validation failed" });
        }
    }
    next();
}

upload.validateMagicBytes = validateMagicBytes;
upload.validateImageMagicBytes = validateImageMagicBytes;

module.exports = upload;
