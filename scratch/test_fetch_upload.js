const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testUploads() {
    console.log("1. Checking if file exists on disk in uploads directory...");
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const files = fs.readdirSync(uploadsDir);
    console.log(`Found ${files.length} files in uploads directory.`);
    if (files.length > 0) {
        console.log("Sample files on disk:", files.slice(0, 5));
        
        const sampleFile = files[0];
        const url = `http://localhost:3000/uploads/${sampleFile}`;
        console.log(`\n2. Attempting HTTP GET request to backend: ${url}`);
        try {
            const res = await axios.get(url, { responseType: 'arraybuffer' });
            console.log(`HTTP Status: ${res.status} ${res.statusText}`);
            console.log("Response Headers:", res.headers);
            console.log(`Received ${res.data.length} bytes.`);
        } catch (err) {
            console.error("HTTP Request Failed:", err.message);
            if (err.response) {
                console.error("Status:", err.response.status);
                console.error("Headers:", err.response.headers);
            }
        }
    }
}

testUploads();
