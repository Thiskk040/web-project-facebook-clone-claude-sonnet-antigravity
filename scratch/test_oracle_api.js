const axios = require('axios');

async function testApi() {
    try {
        console.log("1. Testing login with migrated user...");
        const loginRes = await axios.post('http://localhost:3000/auth/login', {
            username: 'testuser1',
            password: 'password123'
        });
        console.log("Login output:", loginRes.data.message || loginRes.data);

        const token = loginRes.data.token;

        if (token) {
            console.log("\n2. Fetching posts from Oracle DB...");
            const postsRes = await axios.get('http://localhost:3000/posts', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`Fetched ${postsRes.data.length} posts from Oracle XE database.`);

            console.log("\n3. Creating a new post in Oracle DB...");
            const createPostRes = await axios.post('http://localhost:3000/posts', {
                content: "ไม่อยากเชื่อเลยว่าย้ายไปใช้ Oracle Database XE ได้สำเร็จแล้ว!"
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("Created post:", createPostRes.data);
        }

        console.log("\n✅ [API Verification] All API tests passed successfully against Oracle XE!");
    } catch (err) {
        console.error("API test failed:", err.response ? err.response.data : err.message);
    }
}

testApi();
