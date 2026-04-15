const { FreeFireAPI } = require('../index');

async function testProfile() {
    const targetUid = process.argv[2] || "12345678";
    console.log(`Starting Profile Test for UID: ${targetUid}...`);

    const api = new FreeFireAPI();
    try {
        const profile = await api.getPlayerProfile(targetUid);
        if (profile && profile.basicinfo) {
            console.log(`\n--- Basic Info ---`);
            console.log(`Nickname: ${profile.basicinfo.nickname}`);
            console.log(`Level: ${profile.basicinfo.level}`);
            console.log(`EXP: ${profile.basicinfo.exp}`);
            console.log(`Region: ${profile.basicinfo.region}`);
            console.log(`Likes: ${profile.basicinfo.liked}`);
            console.log(`Created At: ${new Date(profile.basicinfo.createat * 1000).toLocaleString()}`);
            console.log(`Last Login: ${new Date(profile.basicinfo.lastloginat * 1000).toLocaleString()}`);

            if (profile.claninfo) {
                console.log(`\n--- Clan Info ---`);
                console.log(`Clan Name: ${profile.claninfo.clanname}`);
                console.log(`Clan ID: ${profile.claninfo.clanid}`);
            }

            if (profile.petinfo) {
                console.log(`\n--- Pet Info ---`);
                console.log(`Pet Name: ${profile.petinfo.name}`);
                console.log(`Pet Level: ${profile.petinfo.level}`);
            }

        } else {
            console.log("Profile data incomplete or not found.");
        }
    } catch (e) {
        console.error("Profile test failed:", e.message);
    }
}

testProfile();
