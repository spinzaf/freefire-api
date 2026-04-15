const { FreeFireAPI } = require('../../index');
const fs = require('fs');
const path = require('path');

const REGIONS = ['IND', 'SG', 'PK', 'BR']; // Beberapa Negara gk support Create Guest
const ACCOUNTS_PER_REGION = 110; 
const DELAY_BETWEEN_ACCOUNTS = 5000;
const DELAY_BETWEEN_REGIONS = 10000;

const CREDENTIALS_DIR = path.join(__dirname, '..', 'config', 'credentials');

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function generateNickname() {
    const num = Math.floor(Math.random() * 9999) + 1;
    const padded = String(num).padStart(4, '0');
    return `Spinzaf${padded}`;
}

function countExistingAccounts(region) {
    const filePath = path.join(CREDENTIALS_DIR, `${region}.yaml`);
    try {
        if (!fs.existsSync(filePath)) return 0;
        const content = fs.readFileSync(filePath, 'utf8');
        const matches = content.match(/- uid:/g);
        return matches ? matches.length : 0;
    } catch (error) {
        return 0;
    }
}

function appendAccount(region, uid, password) {
    const filePath = path.join(CREDENTIALS_DIR, `${region}.yaml`);
    const entry = `- uid: "${uid}"\n  password: "${password}"\n`;
    
    try {
        if (fs.existsSync(filePath)) {
            fs.appendFileSync(filePath, entry, 'utf8');
        } else {
            fs.writeFileSync(filePath, entry, 'utf8');
        }
        return true;
    } catch (error) {
        console.error(`\n    [!] Failed to save account ${uid}:`, error.message);
        return false;
    }
}

async function registerAndSaveAccount(api, region, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const nickname = generateNickname();
            const account = await api.register(region, nickname);
            const saved = appendAccount(region, account.uid, account.passwordHash);
            
            return {
                success: true,
                uid: account.uid,
                saved: saved
            };
        } catch (error) {
            let errorDetail = error.message;
            if (error.response) {
                errorDetail += ` | Status: ${error.response.status}`;
                if (error.response.data) {
                    const responseData = typeof error.response.data === 'string' 
                        ? error.response.data 
                        : JSON.stringify(error.response.data).substring(0, 100);
                    errorDetail += ` | Response: ${responseData}`;
                }
            }
            if (error.stack) {
                const stackLine = error.stack.split('\n')[1]?.trim();
                if (stackLine) errorDetail += ` | At: ${stackLine}`;
            }
            
            if (error.message.includes('429') && attempt < maxRetries) {
                const waitTime = 30000 * attempt; // 30s, 60s, 90s
                console.log(`\n    [!] Rate limited (429). Waiting ${waitTime/1000}s before retry ${attempt}/${maxRetries}...`);
                await delay(waitTime);
            } else {
                return {
                    success: false,
                    error: errorDetail
                };
            }
        }
    }
    return { success: false, error: 'Max retries exceeded' };
}
ty
async function batchRegister() {
    console.log('='.repeat(70));
    console.log(' MASS REGISTRATION - 110 ACCOUNTS PER REGION (With Resume)');
    console.log(` Target: ${REGIONS.length} regions × ${ACCOUNTS_PER_REGION} accounts = ${REGIONS.length * ACCOUNTS_PER_REGION} total`);
    console.log('='.repeat(70));
    console.log('');

    if (!fs.existsSync(CREDENTIALS_DIR)) {
        fs.mkdirSync(CREDENTIALS_DIR, { recursive: true });
    }
    
    const api = new FreeFireAPI();
    let totalNewAccounts = 0;
    
    for (const region of REGIONS) {
        const existingCount = countExistingAccounts(region);
        const needed = ACCOUNTS_PER_REGION - existingCount;
        
        console.log(`\n[${region}] Status: ${existingCount}/${ACCOUNTS_PER_REGION} accounts exist`);
        
        if (needed <= 0) {
            console.log(`  ✓ ${region} already complete! Skipping...`);
            continue;
        }
        
        console.log(`  → Need to create ${needed} more accounts`);
        
        let successCount = 0;
        let failCount = 0;
        
        for (let i = 1; i <= needed; i++) {
            const currentTotal = existingCount + successCount;
            process.stdout.write(`  Progress: ${i}/${needed} (Total: ${currentTotal}/${ACCOUNTS_PER_REGION}) (${successCount}✓ ${failCount}✗)\r`);
            
            const result = await registerAndSaveAccount(api, region);
            
            if (result.success) {
                successCount++;
                totalNewAccounts++;
            } else {
                failCount++;
                console.log(`\n    [${i}] Failed: ${result.error}`);
            }
            
            // Rate limiting
            if (i < needed) {
                await delay(DELAY_BETWEEN_ACCOUNTS);
            }
        }
        
        console.log(`\n  ✓ ${region}: ${successCount} new accounts saved`);

        if (region !== REGIONS[REGIONS.length - 1]) {
            console.log(`  Waiting ${DELAY_BETWEEN_REGIONS/1000} seconds before next region...`);
            await delay(DELAY_BETWEEN_REGIONS);
        }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log(' MASS REGISTRATION COMPLETE');
    console.log('='.repeat(70));
    console.log(`New accounts created: ${totalNewAccounts}`);
    console.log(`Credentials saved to: config/credentials/*.yaml`);
    console.log('='.repeat(70));
}

batchRegister().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
