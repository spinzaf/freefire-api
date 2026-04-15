const fs = require('fs');
const path = require('path');

class CredentialManager {
    constructor(region) {
        this.region = region;
        this.pool = [];
        this.currentIndex = 0;
        
        this.usageData = {};
        this._loadPool();
    }

    
    _loadPool() {
        const credentialsDir = path.join(__dirname, '..', 'config', 'credentials');
        const filePath = path.join(credentialsDir, `${this.region}.yaml`);

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            const lines = content.split('\n');
            let currentAccount = null;
            
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('- uid:')) {
                    if (currentAccount) {
                        this.pool.push(currentAccount);
                    }
                    const uidMatch = trimmed.match(/uid:\s*"([^"]+)"/);
                    currentAccount = { uid: uidMatch ? uidMatch[1] : '' };
                } else if (trimmed.startsWith('password:') && currentAccount) {
                    const pwdMatch = trimmed.match(/password:\s*"([^"]+)"/);
                    if (pwdMatch) {
                        currentAccount.password = pwdMatch[1];
                    }
                }
            }
            
            if (currentAccount && currentAccount.password) {
                this.pool.push(currentAccount);
            }
            
            console.log(`[CredentialManager] Loaded ${this.pool.length} accounts for ${this.region}`);
        } catch (error) {
            console.error(`[CredentialManager] Failed to load credentials for ${this.region}:`, error.message);
            this.pool = [];
        }
    }

    
    isUsedForTarget(targetUid, guestUid) {
        if (!this.usageData[targetUid]) return false;
        return this.usageData[targetUid].used_guests && 
               this.usageData[targetUid].used_guests[guestUid] !== undefined;
    }

    
    markUsed(targetUid, guestUid) {
        if (!this.usageData[targetUid]) {
            this.usageData[targetUid] = { used_guests: {}, total_likes: 0 };
        }
        
        const now = new Date().toISOString();
        this.usageData[targetUid].used_guests[guestUid] = now;
        this.usageData[targetUid].total_likes = Object.keys(this.usageData[targetUid].used_guests).length;
        
    }

    
    getRandomCredential() {
        if (this.pool.length === 0) {
            return null;
        }
        
        const randomIndex = Math.floor(Math.random() * this.pool.length);
        return this.pool[randomIndex];
    }

    
    getNextCredential() {
        if (this.pool.length === 0) {
            return null;
        }
        const cred = this.pool[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.pool.length;
        return cred;
    }

    
    getNextForTarget(targetUid) {
        const available = this.pool.filter(acc => !this.isUsedForTarget(targetUid, acc.uid));
        
        if (available.length === 0) {
            return null; 
        }
        
        
        return available[0];
    }

    
    getMultipleForTarget(targetUid, count) {
        const available = this.pool.filter(acc => !this.isUsedForTarget(targetUid, acc.uid));
        return available.slice(0, count);
    }

    
    getAvailableCount(targetUid) {
        return this.pool.filter(acc => !this.isUsedForTarget(targetUid, acc.uid)).length;
    }

    
    getPoolSize() {
        return this.pool.length;
    }

    
    clearUsage(targetUid) {
        if (targetUid) {
            delete this.usageData[targetUid];
        } else {
            this.usageData = {};
        }
    }
}

module.exports = CredentialManager;
