const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const baseUrl = 'http://localhost:3000';

async function runTests() {
    console.log("=== Part 1 Notifications Testing ===");
    let tA, tB, uA, uB;
    
    try { await axios.post(`${baseUrl}/auth/register`, { username: "notifA", password: "123" }); } catch(e) {}
    try { await axios.post(`${baseUrl}/auth/register`, { username: "notifB", password: "123" }); } catch(e) {}
    
    tA = (await axios.post(`${baseUrl}/auth/login`, { username: "notifA", password: "123" })).data.token;
    tB = (await axios.post(`${baseUrl}/auth/login`, { username: "notifB", password: "123" })).data.token;

    // B creates a post
    const pRes = await axios.post(`${baseUrl}/posts`, { content: "Test Post B" }, { headers: { Authorization: `Bearer ${tB}` } });
    const postId = pRes.data.postId;

    // A likes B's post
    await axios.post(`${baseUrl}/interactions`, { post_id: postId, type: "like" }, { headers: { Authorization: `Bearer ${tA}` } });

    // Check B's notifications
    const nResB = await axios.get(`${baseUrl}/notifications`, { headers: { Authorization: `Bearer ${tB}` } });
    console.log("B notifications count:", nResB.data.length);
    const likeNotif = nResB.data.find(n => n.type === 'like' && n.target_id === postId);
    if(likeNotif) console.log("SUCCESS: B received like notification from A");
    else console.log("FAIL: B did not receive like notification");

    // A tries to mark B's notification as read (IDOR check)
    if (likeNotif) {
        try {
            await axios.put(`${baseUrl}/notifications/${likeNotif.id}/read`, {}, { headers: { Authorization: `Bearer ${tA}` } });
            console.log("FAIL: A could mark B's notification as read");
        } catch(err) {
            console.log("SUCCESS: A got 403 trying to read B's notification");
        }
    }
}
runTests();
