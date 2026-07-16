const axios = require('axios');
const baseUrl = 'http://localhost:3000';

async function runTests() {
    console.log("=== Part 2 Search Testing ===");
    let token, user;
    
    // Register some users
    try { await axios.post(`${baseUrl}/auth/register`, { username: "searchman", password: "123" }); } catch(e) {}
    try { await axios.post(`${baseUrl}/auth/register`, { username: "supersearch", password: "123" }); } catch(e) {}
    try { await axios.post(`${baseUrl}/auth/register`, { username: "otherguy", password: "123" }); } catch(e) {}
    
    token = (await axios.post(`${baseUrl}/auth/login`, { username: "searchman", password: "123" })).data.token;

    // Search for 'search'
    const res = await axios.get(`${baseUrl}/users/search?q=search`, { headers: { Authorization: `Bearer ${token}` } });
    console.log("Results for 'search':", res.data);
    
    const includesSelf = res.data.find(u => u.username === 'searchman');
    if(includesSelf) console.log("FAIL: Search returned self");
    else console.log("SUCCESS: Search did not return self");
    
    const includesOther = res.data.find(u => u.username === 'otherguy');
    if(includesOther) console.log("FAIL: Search returned unmatched user");
    else console.log("SUCCESS: Search filtered unmatched user");
    
    const hasPassword = res.data.some(u => u.password_hash || u.email);
    if(hasPassword) console.log("FAIL: Search returned sensitive info");
    else console.log("SUCCESS: Search did not return sensitive info");
}
runTests();
