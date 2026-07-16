const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const sqlite3 = require('sqlite3').verbose();

// Prepare test files
fs.writeFileSync('dummy.txt', 'This is a text file');
const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 'a'); // 6MB
fs.writeFileSync('large_image.jpg', largeBuffer);

const baseUrl = 'http://localhost:3000';

async function runTests() {
    let token = '';

    console.log("=== 1. Auth & Error Handling ===");
    try {
        await axios.post(`${baseUrl}/auth/register`, { username: "testuser1" });
    } catch (e) {
        console.log("Register without password:", e.response.status, JSON.stringify(e.response.data));
    }

    try {
        const res = await axios.post(`${baseUrl}/auth/register`, { username: "testuser1", password: "password123" });
        console.log("Register valid:", res.status, JSON.stringify(res.data));
    } catch(e) {
        if(e.response && e.response.data.error === 'Username already exists') {
             console.log("Register valid: Already registered (Continuing)");
        } else {
             console.log("Register valid Error:", e.response ? e.response.data : e.message);
        }
    }

    try {
        const res = await axios.post(`${baseUrl}/auth/login`, { username: "testuser1", password: "password123" });
        token = res.data.token;
        console.log("Login valid, token received:", !!token);
    } catch(e) {
        console.log("Login Error:", e.message);
    }

    try {
        await axios.get(`${baseUrl}/posts`);
    } catch (e) {
        console.log("Access without token:", e.response.status, JSON.stringify(e.response.data));
    }

    try {
        await axios.get(`${baseUrl}/posts`, { headers: { Authorization: 'Bearer invalid_token_123' } });
    } catch (e) {
        console.log("Access with invalid token:", e.response.status, JSON.stringify(e.response.data));
    }

    try {
        const res = await axios.get(`${baseUrl}/posts`, { headers: { Authorization: `Bearer ${token}` } });
        console.log("Access with valid token:", res.status);
    } catch (e) {
        console.log("Access with valid token Error:", e.message);
    }

    console.log("\n=== 2. Schema Constraints (Friendships) ===");
    try {
        await axios.post(`${baseUrl}/auth/register`, { username: "testuser2", password: "password123" });
    } catch(e) {}

    try {
        const res = await axios.post(`${baseUrl}/friend-request`, { addressee_id: 2 }, { headers: { Authorization: `Bearer ${token}` } });
        console.log("Friend request 1:", res.status, JSON.stringify(res.data));
    } catch(e) {
        if(e.response && e.response.data.error.includes('already exists')) {
             console.log("Friend request 1: Already exists (Continuing)");
        } else {
             console.log("Friend request 1 error:", e.response ? e.response.data : e.message);
        }
    }

    try {
        await axios.post(`${baseUrl}/friend-request`, { addressee_id: 2 }, { headers: { Authorization: `Bearer ${token}` } });
    } catch(e) {
        console.log("Friend request duplicate:", e.response.status, JSON.stringify(e.response.data));
    }

    console.log("\n=== 3. Multer Image Upload (Type and Size) ===");
    try {
        const formTxt = new FormData();
        formTxt.append('content', 'text post');
        formTxt.append('image', fs.createReadStream('dummy.txt'));
        await axios.post(`${baseUrl}/posts`, formTxt, { headers: { ...formTxt.getHeaders(), Authorization: `Bearer ${token}` } });
    } catch (e) {
        console.log("Upload .txt file:", e.response.status, JSON.stringify(e.response.data));
    }

    try {
        const formImg = new FormData();
        formImg.append('content', 'large post');
        formImg.append('image', fs.createReadStream('large_image.jpg'), { filename: 'large_image.jpg', contentType: 'image/jpeg' });
        await axios.post(`${baseUrl}/posts`, formImg, { headers: { ...formImg.getHeaders(), Authorization: `Bearer ${token}` } });
    } catch (e) {
        console.log("Upload >5MB file:", e.response.status, JSON.stringify(e.response.data));
    }

    console.log("\n=== 4. DB Inspection (Bcrypt, Updated_at, Indexes) ===");
    const db = new sqlite3.Database('./facebook.db');
    db.serialize(() => {
        db.get("SELECT password_hash FROM users WHERE username = 'testuser1'", (err, row) => {
            if (row) {
                const isHashed = row.password_hash.startsWith('$2a$') || row.password_hash.startsWith('$2b$');
                console.log("Bcrypt hash check:", isHashed ? "PASS (is hashed)" : "FAIL (plain text)", "| Hash preview:", row.password_hash.substring(0, 15) + "...");
            }
        });
        db.all("PRAGMA table_info(posts)", (err, rows) => {
            console.log("Posts table has updated_at:", rows.some(r => r.name === 'updated_at') ? "PASS" : "FAIL");
        });
        db.all("PRAGMA table_info(comments)", (err, rows) => {
            console.log("Comments table has updated_at:", rows.some(r => r.name === 'updated_at') ? "PASS" : "FAIL");
        });
        db.all("PRAGMA index_list(posts)", (err, rows) => {
            console.log("Posts indexes include idx_posts_user_id:", rows.some(r => r.name === 'idx_posts_user_id') ? "PASS" : "FAIL");
        });
        db.all("PRAGMA index_list(interactions)", (err, rows) => {
            console.log("Interactions indexes include idx_interactions_post_id:", rows.some(r => r.name === 'idx_interactions_post_id') ? "PASS" : "FAIL");
        });
    });
    
    // Cleanup
    setTimeout(() => {
        db.close();
        fs.unlinkSync('dummy.txt');
        fs.unlinkSync('large_image.jpg');
    }, 500);
}

runTests();
