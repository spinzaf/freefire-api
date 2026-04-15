const FreeFireAPI = require('../index');

async function testRegister() {
    console.log("Starting Register Test...");
    const api = new FreeFireAPI();

    // Test with specific region
    const region = process.argv[2] || 'IND';
    const nickname = process.argv[3] || null;

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
        process.exit(1);
    }
}

testRegister();
