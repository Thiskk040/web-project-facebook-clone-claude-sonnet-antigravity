const axios = require('axios');
const baseUrl = 'http://localhost:3000';

async function runTests() {
    console.log("=== Part 3 @Mention & Profile Testing ===");
    let uToken, uId, t1Token, t2Token;
    
    // Register poster and 2 targets
    try { await axios.post(`${baseUrl}/auth/register`, { username: "posterguy", password: "123" }); } catch(e) {}
    try { await axios.post(`${baseUrl}/auth/register`, { username: "target1", password: "123" }); } catch(e) {}
    try { await axios.post(`${baseUrl}/auth/register`, { username: "target2", password: "123" }); } catch(e) {}
    try { await axios.post(`${baseUrl}/auth/register`, { username: "fake_user", password: "123" }); } catch(e) {}
    
    uToken = (await axios.post(`${baseUrl}/auth/login`, { username: "posterguy", password: "123" })).data.token;
    t1Token = (await axios.post(`${baseUrl}/auth/login`, { username: "target1", password: "123" })).data.token;
    t2Token = (await axios.post(`${baseUrl}/auth/login`, { username: "target2", password: "123" })).data.token;

    console.log("Creating post with mentions...");
    // Create a post mentioning target1, target2, and a non-existent user
    const postContent = "Hello @target1 and @target2 and @ghostuser!";
    const pRes = await axios.post(`${baseUrl}/posts`, { content: postContent }, { headers: { Authorization: `Bearer ${uToken}` } });
    
    // Wait for async background inserts in DB to finish
    await new Promise(r => setTimeout(r, 1000));
    
    console.log("Checking Target1 Notifications...");
    const n1Res = await axios.get(`${baseUrl}/notifications`, { headers: { Authorization: `Bearer ${t1Token}` } });
    const tagNotif = n1Res.data.find(n => n.type === 'tag' && n.target_id === pRes.data.postId);
    if(tagNotif) console.log("SUCCESS: target1 received 'tag' notification");
    else console.log("FAIL: target1 did not receive 'tag' notification", n1Res.data);

    console.log("Checking Target2 Tagged Profile...");
    const t2ProfilePosts = await axios.get(`${baseUrl}/users/target2/tagged_posts`, { headers: { Authorization: `Bearer ${t2Token}` } });
    const foundTagged = t2ProfilePosts.data.find(p => p.id === pRes.data.postId);
    if(foundTagged) console.log("SUCCESS: target2 has the post in their tagged_posts profile tab");
    else console.log("FAIL: target2 did not have the post in tagged_posts");
}
runTests();
