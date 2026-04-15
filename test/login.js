const { FreeFireAPI } = require('../index');

async function testLogin() {
    console.log("Starting Login Test...");
    const api = new FreeFireAPI(); 
    try {
        const session = await api.loginWithRandomCredentialFromAll();
        console.log("Login success!");
        console.log(`Token: ${session.token.substring(0, 20)}...`);
        console.log(`OpenID: ${session.openId}`);
    } catch (e) {
        console.error("Login failed:", e.message);
    }
}

testLogin();
