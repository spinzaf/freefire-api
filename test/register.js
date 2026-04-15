const { FreeFireAPI } = require('../index');

// Generate random nickname for testing
function generateRandomNickname() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'Test';
    for (let i = 0; i < 5; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function testRegister() {
    console.log("Starting Register Test...");
    const api = new FreeFireAPI();

    // Test with specific region
    const region = process.argv[2] || 'IND';
    // Use provided nickname or generate random one
    const nickname = process.argv[3] || generateRandomNickname();

    try {
        console.log(`Registering new account in region: ${region}`);
        if (nickname) {
            console.log(`Using nickname: ${nickname}`);
        }

        const account = await api.register(region, nickname);

        console.log("\n--- Registration Success ---");
        console.log(`UID: ${account.uid}`);
        console.log(`Password: ${account.password}`);
        console.log(`Region: ${account.region}`);
        console.log(`Nickname: ${account.nickname}`);
        console.log(`OpenID: ${account.openId}`);

        if (account.token) {
            const tokenStr = String(account.token);
            console.log(`Session Token: ${tokenStr.substring(0, Math.min(20, tokenStr.length))}...`);
        }
        if (account.serverUrl) {
            console.log(`Server URL: ${account.serverUrl}`);
        }

        console.log("\n--- Account Configuration (JSON) ---");
        console.log(JSON.stringify({
            uid: account.uid,
            password: account.password,
            region: account.region
        }, null, 2));

    } catch (e) {
        console.error("\n[!] Registration failed:", e.message);
        // Don't exit with error - guest registration might be blocked in some regions
        // This is expected behavior
    }
}

testRegister();
