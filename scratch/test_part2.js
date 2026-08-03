const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const baseUrl = 'http://localhost:3000';

async function runTests() {
    console.log("=== Part 2 Testing ===");

    let tA, tB, tC, uA, uB, uC;
    try { await axios.post(`${baseUrl}/auth/register`, { username: "friendA", password: "123" }); } catch(e) {}
    try { await axios.post(`${baseUrl}/auth/register`, { username: "friendB", password: "123" }); } catch(e) {}
    try { await axios.post(`${baseUrl}/auth/register`, { username: "friendC", password: "123" }); } catch(e) {}
    
    tA = (await axios.post(`${baseUrl}/auth/login`, { username: "friendA", password: "123" })).data; uA = tA.user; tA = tA.token;
    tB = (await axios.post(`${baseUrl}/auth/login`, { username: "friendB", password: "123" })).data; uB = tB.user; tB = tB.token;
    tC = (await axios.post(`${baseUrl}/auth/login`, { username: "friendC", password: "123" })).data; uC = tC.user; tC = tC.token;

    console.log("-> A sends request to B");
    try { await axios.post(`${baseUrl}/friend-request`, { addressee_id: uB.id }, { headers: { Authorization: `Bearer ${tA}` } }); } catch(e) {}
    
    console.log("-> B accepts request from A");
    try { await axios.put(`${baseUrl}/friend-request/accept`, { requester_id: uA.id }, { headers: { Authorization: `Bearer ${tB}` } }); } catch(e) {}

    console.log("-> A sends request to C");
    try { await axios.post(`${baseUrl}/friend-request`, { addressee_id: uC.id }, { headers: { Authorization: `Bearer ${tA}` } }); } catch(e) {}

    console.log("-> C rejects request from A");
    try { await axios.put(`${baseUrl}/friend-request/reject`, { requester_id: uA.id }, { headers: { Authorization: `Bearer ${tC}` } }); } catch(e) {}

    const db = new sqlite3.Database('./facebook.db');
    db.all("SELECT * FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)", [uA.id, uB.id, uA.id, uC.id], (err, rows) => {
        if (err) throw err;
        const accepted = rows.find(r => r.addressee_id === uB.id);
        const rejected = rows.find(r => r.addressee_id === uC.id);
        
        if (accepted && accepted.status === 'accepted') console.log("SUCCESS: A and B are 'accepted'");
        else console.log("FAIL: A and B status is", accepted ? accepted.status : "missing");
        
        if (!rejected) console.log("SUCCESS: A and C request was deleted (rejected)");
        else console.log("FAIL: A and C request still exists");
        
        db.close();
    });
}
runTests();
