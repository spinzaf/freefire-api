const axios = require('axios');
const crypto = require('crypto');
const { URLS, HEADERS, AE, GARENA_CLIENT } = require('./constants');
const CredentialManager = require('./credential-manager');

class LikeAPI {
    constructor() {
        this.credentialManagers = {};
    }

    
    _getCredentialManager(region) {
        if (!this.credentialManagers[region]) {
            this.credentialManagers[region] = new CredentialManager(region);
        }
        return this.credentialManagers[region];
    }

    
    _getBaseUrl(region) {
        const regionUpper = region.toUpperCase();
        if (regionUpper === 'IND') {
            return 'https://client.ind.freefiremobile.com';
        } else if (['BR', 'US', 'SAC', 'NA'].includes(regionUpper)) {
            return 'https://client.us.freefiremobile.com';
        } else {
            return 'https://clientbp.ggblueshark.com';
        }
    }

    
    async _login(uid, password) {
        try {
            
            const params = new URLSearchParams();
            params.append('uid', uid);
            params.append('password', password);
            params.append('response_type', 'token');
            params.append('client_type', '2');
            params.append('client_secret', GARENA_CLIENT.CLIENT_SECRET);
            params.append('client_id', GARENA_CLIENT.CLIENT_ID);

            const tokenResponse = await axios.post(URLS.GARENA_TOKEN, params, {
                headers: HEADERS.GARENA_AUTH
            });

            if (!tokenResponse.data || !tokenResponse.data.access_token) {
                return null;
            }

            const accessToken = tokenResponse.data.access_token;
            const openId = tokenResponse.data.open_id;

            
            const protoHandler = require('./protobuf');
            const loginPayload = {
                openid: openId,
                logintoken: accessToken,
                platform: "4"
            };

            const encryptedBody = await protoHandler.encode('MajorLogin.proto', 'request', loginPayload, true);

            const loginResponse = await axios.post(URLS.MAJOR_LOGIN, encryptedBody, {
                headers: {
                    ...HEADERS.COMMON,
                    'Authorization': 'Bearer',
                    'Content-Type': 'application/octet-stream'
                },
                responseType: 'arraybuffer'
            });

            const loginData = await protoHandler.decode('MajorLogin.proto', 'response', loginResponse.data);
            
            if (loginData && loginData.token) {
                return {
                    jwt: loginData.token,
                    serverUrl: loginData.serverUrl,
                    accountId: loginData.accountid
                };
            }
            return null;
        } catch (error) {
            console.log(`[LikeAPI] Login error: ${error.message}`);
            return null;
        }
    }

    
    _createLikePayload(targetUid, region) {
        
        
        
        const fields = [];
        
        
        const targetBytes = Buffer.from(targetUid, 'utf8');
        fields.push(Buffer.concat([
            Buffer.from([0x0a, targetBytes.length]), 
            targetBytes
        ]));
        
        
        const regionBytes = Buffer.from(region, 'utf8');
        fields.push(Buffer.concat([
            Buffer.from([0x12, regionBytes.length]), 
            regionBytes
        ]));
        
        const payload = Buffer.concat(fields);
        
        
        const { encrypt } = require('./crypto');
        return encrypt(payload);
    }

    
    async _sendLikeWithGuest(guest, targetUid, region) {
        try {
            
            const auth = await this._login(guest.uid, guest.password);
            if (!auth) {
                return { success: false, error: 'Login failed' };
            }

            
            const serverUrl = auth.serverUrl || this._getBaseUrl(region);

            
            const payload = this._createLikePayload(targetUid, region);
            const headers = {
                'User-Agent': HEADERS.COMMON['User-Agent'],
                'Connection': HEADERS.COMMON['Connection'],
                'Accept-Encoding': HEADERS.COMMON['Accept-Encoding'],
                'Content-Type': 'application/octet-stream',
                'Expect': HEADERS.COMMON['Expect'],
                'Authorization': `Bearer ${auth.jwt}`,
                'X-Unity-Version': HEADERS.COMMON['X-Unity-Version'],
                'X-GA': HEADERS.COMMON['X-GA'],
                'ReleaseVersion': HEADERS.COMMON['ReleaseVersion']
            };

            
            const response = await axios.post(`${serverUrl}/LikeProfile`, payload, {
                headers: headers,
                timeout: 30000,
                responseType: 'arraybuffer'
            });

            if (response.status === 200) {
                return { success: true };
            } else {
                return { success: false, error: `HTTP ${response.status}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    
    async sendLikes(targetUid, region, likeCount = 100) {
        const cm = this._getCredentialManager(region);
        const baseUrl = this._getBaseUrl(region);
        
        
        const availableCount = cm.getAvailableCount(targetUid);
        console.log(`[LikeAPI] Available guests for ${targetUid}: ${availableCount}/${cm.getPoolSize()}`);
        
        
        const maxDaily = 100;
        const requestedLikes = Math.min(likeCount, maxDaily);
        const plannedLikes = Math.min(requestedLikes, availableCount);
        
        if (plannedLikes === 0) {
            return {
                success: false,
                message: 'No available guests left for this target. All guests have been used.',
                successCount: 0,
                failedCount: 0
            };
        }
        
        console.log(`[LikeAPI] Planning to send ${plannedLikes} likes to ${targetUid} using ${region} guests`);
        
        
        const guests = cm.getMultipleForTarget(targetUid, plannedLikes);
        
        let successCount = 0;
        let failedCount = 0;
        
        
        for (let i = 0; i < guests.length; i++) {
            const guest = guests[i];
            process.stdout.write(`[LikeAPI] Progress: ${i + 1}/${guests.length} (${successCount}✓ ${failedCount}✗)\r`);
            
            const result = await this._sendLikeWithGuest(guest, targetUid, region);
            
            if (result.success) {
                successCount++;
                cm.markUsed(targetUid, guest.uid);
            } else {
                failedCount++;
                console.log(`\n[LikeAPI] Guest ${guest.uid} failed: ${result.error}`);
            }
            
            
            if (i < guests.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log(`\n[LikeAPI] Completed: ${successCount}/${guests.length} likes sent successfully`);
        
        return {
            success: successCount > 0,
            successCount: successCount,
            failedCount: failedCount,
            remainingGuests: cm.getAvailableCount(targetUid),
            message: `Sent ${successCount} likes to ${targetUid}. ${cm.getAvailableCount(targetUid)} guests remaining.`
        };
    }
}

module.exports = LikeAPI;
