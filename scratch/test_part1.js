const axios = require('axios');
const baseUrl = 'http://localhost:3000';

async function runTests() {
    console.log("=== Part 1 Testing ===");

    let tokenA, tokenB, userA, userB;
    try { await axios.post(`${baseUrl}/auth/register`, { username: "part1A", password: "123" }); } catch(e) {}
    try { await axios.post(`${baseUrl}/auth/register`, { username: "part1B", password: "123" }); } catch(e) {}
    
    let res = await axios.post(`${baseUrl}/auth/login`, { username: "part1A", password: "123" });
    tokenA = res.data.token; userA = res.data.user;
    
    res = await axios.post(`${baseUrl}/auth/login`, { username: "part1B", password: "123" });
    tokenB = res.data.token; userB = res.data.user;

    // Create post as User B
    const postRes = await axios.post(`${baseUrl}/posts`, { content: "User B post" }, { headers: { Authorization: `Bearer ${tokenB}` } });
    const postId = postRes.data.postId;
    console.log(`User B created post ID: ${postId}`);

    // User A tries to delete User B's post
    try {
        await axios.delete(`${baseUrl}/posts/${postId}`, { headers: { Authorization: `Bearer ${tokenA}` } });
        console.log("FAIL: User A successfully deleted User B's post (Should not happen)");
    } catch (err) {
        console.log(`SUCCESS: User A got ${err.response.status} when trying to delete User B's post. Error: ${err.response.data.error}`);
    }

    // User B deletes own post
    try {
        await axios.delete(`${baseUrl}/posts/${postId}`, { headers: { Authorization: `Bearer ${tokenB}` } });
        console.log(`SUCCESS: User B deleted own post ID: ${postId}`);
    } catch (err) {
        console.log("FAIL: User B could not delete own post.");
    }

    // Suggested Users Logic
    try {
        const suggestRes = await axios.get(`${baseUrl}/users/suggested`, { headers: { Authorization: `Bearer ${tokenA}` } });
        console.log("User A suggested users (Should not include User A):", suggestRes.data.map(u => u.username));
        if (suggestRes.data.find(u => u.username === 'part1A')) console.log("FAIL: Suggested self");
        else console.log("SUCCESS: Did not suggest self");
    } catch(err) {
        console.log("FAIL Suggested Users:", err.message);
    }
}

runTests();
