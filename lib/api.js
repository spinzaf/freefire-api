const axios = require('axios');
const crypto = require('crypto');
const protoHandler = require('./protobuf');
const { AE, HEADERS, URLS, GARENA_CLIENT } = require('./constants');
const { processPlayerItems } = require('./utils');
const CredentialManager = require('./credential-manager');
const fs = require('fs');
const path = require('path');

class FreeFireAPI {
    constructor(region = null) {
        this.session = {
            token: null,
            serverUrl: null,
            openId: null,
            accountId: null
        };
        // region = null means use all regions (for non-like operations)
        // region = specific (e.g., 'IND') for like operations
        this.region = region;
        this.credentialManager = region ? new CredentialManager(region) : null;
        this.allCredentials = null; // Lazy load from all regions
    }

    // Set region for credential rotation (for like operations)
    setRegion(region) {
        this.region = region;
        this.credentialManager = new CredentialManager(region);
    }

    // Load credentials from ALL regions (for non-like operations)
    _loadAllCredentials() {
        if (this.allCredentials) return this.allCredentials;
        
        const credentialsDir = path.join(__dirname, '..', 'config', 'credentials');
        const allCreds = [];
        
        try {
            const files = fs.readdirSync(credentialsDir);
            for (const file of files) {
                if (file.endsWith('.yaml')) {
                    const filePath = path.join(credentialsDir, file);
                    const content = fs.readFileSync(filePath, 'utf8');
                    const lines = content.split('\n');
                    let currentAccount = null;
                    
                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (trimmed.startsWith('- uid:')) {
                            if (currentAccount) {
                                allCreds.push(currentAccount);
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
                        allCreds.push(currentAccount);
                    }
                }
            }
        } catch (error) {
            console.error('[API] Failed to load all credentials:', error.message);
        }
        
        this.allCredentials = allCreds;
        console.log(`[API] Loaded ${allCreds.length} credentials from all regions`);
        return allCreds;
    }

    // Get random credential from ALL regions (for non-like operations)
    _getRandomCredentialFromAll() {
        const creds = this._loadAllCredentials();
        if (creds.length === 0) {
            throw new Error('No credentials available in any region');
        }
        const randomIndex = Math.floor(Math.random() * creds.length);
        return creds[randomIndex];
    }

    // Login with random credential from ALL regions (for search, profile, stats)
    async loginWithRandomCredentialFromAll() {
        const cred = this._getRandomCredentialFromAll();
        console.log(`[API] Using random credential from all regions: ${cred.uid}`);
        return await this.login(cred.uid, cred.password);
    }

    // Login with random credential from specific region (for like)
    async loginWithRandomCredential() {
        if (!this.credentialManager) {
            // No specific region set, use all
            return await this.loginWithRandomCredentialFromAll();
        }
        const cred = this.credentialManager.getRandomCredential();
        if (!cred) {
            throw new Error(`No credentials available in pool for region ${this.region}`);
        }
        console.log(`[API] Using random credential from ${this.region}: ${cred.uid}`);
        return await this.login(cred.uid, cred.password);
    }

    /**
     * Authenticate with Garena using UID and Password
     * @param {string} uid - User ID
     * @param {string} password - Password
     */
    async login(uid, password) {
        if (!uid || !password) {
            throw new Error("Missing credentials. Please provide UID and PASSWORD to login(uid, password).");
        }

        // Step 1: Get Garena Token
        const garenaData = await this._getGarenaToken(uid, password);
        if (!garenaData || !garenaData.access_token) {
            throw new Error("Garena authentication failed: Invalid credentials or response");
        }

        // Step 2: Major Login
        const loginData = await this._majorLogin(garenaData.access_token, garenaData.open_id);
        if (!loginData || !loginData.token) {
            throw new Error("Major login failed: Empty token received");
        }

        this.session.token = loginData.token;
        this.session.serverUrl = loginData.serverUrl;
        this.session.openId = garenaData.open_id;
        this.session.accountId = loginData.accountid;

        return this.session;
    }

    async _getGarenaToken(uid, password) {
        const params = new URLSearchParams();
        params.append('uid', uid);
        params.append('password', password);
        params.append('response_type', 'token');
        params.append('client_type', '2');
        params.append('client_secret', GARENA_CLIENT.CLIENT_SECRET);
        params.append('client_id', GARENA_CLIENT.CLIENT_ID);

        try {
            const response = await axios.post(URLS.GARENA_TOKEN, params, {
                headers: HEADERS.GARENA_AUTH
            });
            return response.data;
        } catch (error) {
            throw new Error(`Garena Auth Request Failed: ${error.message}`);
        }
    }

    async _majorLogin(accessToken, openId) {
        const payload = {
            openid: openId,
            logintoken: accessToken,
            platform: "4"
        };

        const encryptedBody = await protoHandler.encode('MajorLogin.proto', 'request', payload, true);

        try {
            const response = await axios.post(URLS.MAJOR_LOGIN, encryptedBody, {
                headers: {
                    ...HEADERS.COMMON,
                    'Authorization': 'Bearer', // Specific to MajorLogin
                    'Content-Type': 'application/octet-stream'
                },
                responseType: 'arraybuffer'
            });

            return await protoHandler.decode('MajorLogin.proto', 'response', response.data);
        } catch (error) {
            throw new Error(`Major Login Request Failed: ${error.message}`);
        }
    }

    /**
     * Search for accounts by name (fuzzy search)
     * @param {string} keyword 
     * @returns {Promise<Array>} List of matching accounts
     */
    async searchAccount(keyword) {
        // Auto-login with random credential if not authenticated
        if (!this.session.token) {
            await this.loginWithRandomCredential();
        }

        if (keyword.length < 3) {
            throw new Error("Search keyword must be at least 3 characters long.");
        }

        const payload = { keyword: String(keyword) };
        const encryptedBody = await protoHandler.encode('SearchAccountByName.proto', 'SearchAccountByName.request', payload, true);

        const url = URLS.SEARCH(this.session.serverUrl);

        try {
            const response = await axios.post(url, encryptedBody, {
                headers: {
                    ...HEADERS.COMMON,
                    'Authorization': `Bearer ${this.session.token}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                responseType: 'arraybuffer'
            });

            const data = await protoHandler.decode('SearchAccountByName.proto', 'SearchAccountByName.response', response.data);
            return data.infos; // Field name is 'infos' in proto
        } catch (error) {
            throw new Error(`Search Failed: ${error.message}`);
        }
    }

    /**
     * Get detailed player profile (Personal Show)
     * @param {number|string} uid 
     * @returns {Promise<Object>} Player data including profile, guild, etc.
     */
    async getPlayerProfile(uid) {
        await this._checkSession();

        const payload = {
            accountId: Number(uid),
            callSignSrc: 7,
            needGalleryInfo: true
        };

        const encryptedBody = await protoHandler.encode('PlayerPersonalShow.proto', 'request', payload, true);
        const url = URLS.PERSONAL_SHOW(this.session.serverUrl);

        try {
            const response = await axios.post(url, encryptedBody, {
                headers: {
                    ...HEADERS.COMMON,
                    'Authorization': `Bearer ${this.session.token}`
                },
                responseType: 'arraybuffer'
            });

            return await protoHandler.decode('PlayerPersonalShow.proto', 'response', response.data);
        } catch (error) {
            throw new Error(`Get Profile Failed: ${error.message}`);
        }
    }

    /**
     * Get player items (outfit, weapons, skills, pet)
     * @param {number|string} uid 
     */
    async getPlayerItems(uid) {
        const profile = await this.getPlayerProfile(uid);
        if (!profile) return null;
        return processPlayerItems(profile);
    }

    /**
     * Get Player Stats
     * @param {number|string} uid 
     * @param {'br'|'cs'} mode - Battle Royale or Clash Squad
     * @param {'career'|'ranked'|'normal'} matchType 
     */
    async getPlayerStats(uid, mode = 'br', matchType = 'career') {
        // Auto-login with random credential if not authenticated
        if (!this.session.token) {
            await this.loginWithRandomCredential();
        }

        const modeLower = mode.toLowerCase();
        const typeUpper = matchType.toUpperCase();

        let matchMode = 0;
        let url = '';
        let protoFile = '';
        let payload = { accountid: Number(uid) };

        if (modeLower === 'br') {
            const types = { 'CAREER': 0, 'NORMAL': 1, 'RANKED': 2 };
            matchMode = types[typeUpper] !== undefined ? types[typeUpper] : 0;
            url = URLS.PLAYER_STATS(this.session.serverUrl);
            protoFile = 'PlayerStats.proto';
            payload.matchmode = matchMode;
        } else {
            const types = { 'CAREER': 0, 'NORMAL': 1, 'RANKED': 6 };
            matchMode = types[typeUpper] !== undefined ? types[typeUpper] : 0;
            url = URLS.PLAYER_CS_STATS(this.session.serverUrl);
            protoFile = 'PlayerCSStats.proto';
            payload.gamemode = 15; // CS default
            payload.matchmode = matchMode;
        }

        const encryptedBody = await protoHandler.encode(protoFile, 'request', payload, true);

        try {
            const response = await axios.post(url, encryptedBody, {
                headers: {
                    ...HEADERS.COMMON,
                    'Authorization': `Bearer ${this.session.token}`
                },
                responseType: 'arraybuffer'
            });

            return await protoHandler.decode(protoFile, 'response', response.data);
        } catch (error) {
            throw new Error(`Get Stats Failed: ${error.message}`);
        }
    }
    // ----- Auto login if no session with random credential from ALL regions (for non-like)
    async _checkSession() {
        if (!this.session.token || !this.session.serverUrl) {
            await this.loginWithRandomCredentialFromAll();
        }
    }

    /**
     * Register a new guest account
     * @param {string} region - Region code (e.g., 'IND', 'SG', 'ID', etc.)
     * @param {string} [nickname] - Optional nickname (auto-generated if not provided)
     * @returns {Promise<Object>} Registered account info with uid and password
     */
    async register(region, nickname = null) {
        // Step 1: Generate random password
        const password = this._generateRandomPassword();
        const passwordHash = crypto.createHash('sha256').update(password).digest('hex').toUpperCase();

        // Step 2: Guest Register
        const uid = await this._guestRegister(passwordHash);
        if (!uid) {
            throw new Error('Guest registration failed');
        }

        // Step 3: Get Garena Token
        const garenaData = await this._getGarenaTokenForRegister(uid, passwordHash);
        if (!garenaData || !garenaData.access_token) {
            throw new Error('Token grant failed after registration');
        }

        // Step 4: Major Register (creates the account with nickname)
        const autoNickname = nickname || `Spinzaf${Math.floor(Math.random() * 9999) + 1}`;
        const registerData = await this._majorRegister(
            autoNickname,
            garenaData.access_token,
            garenaData.open_id,
            region
        );

        if (!registerData.success) {
            throw new Error(`Major registration failed: ${registerData.error || 'Unknown error'}`);
        }

        // Return simple result like Python: uid and password (password_hash)
        return {
            uid: uid,
            password: password,
            passwordHash: passwordHash,
            region: region,
            nickname: autoNickname
        };
    }

    _generateRandomPassword() {
        return Math.floor(Math.random() * 9000000000) + 1000000000 + '';
    }

    async _guestRegister(passwordHash) {
        const params = new URLSearchParams();
        params.append('password', passwordHash);
        params.append('client_type', '2');
        params.append('source', '2');
        params.append('app_id', GARENA_CLIENT.CLIENT_ID);

        const signature = crypto
            .createHmac('sha256', GARENA_CLIENT.CLIENT_SECRET)
            .update(params.toString())
            .digest('hex');

        try {
            const response = await axios.post(URLS.GUEST_REGISTER, params, {
                headers: {
                    ...HEADERS.GARENA_AUTH,
                    'Authorization': `Signature ${signature}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            return response.data?.uid;
        } catch (error) {
            throw new Error(`Guest Register Failed: ${error.message}`);
        }
    }

    async _getGarenaTokenForRegister(uid, passwordHash) {
        const params = new URLSearchParams();
        params.append('uid', uid);
        params.append('password', passwordHash);
        params.append('response_type', 'token');
        params.append('client_type', '2');
        params.append('client_secret', GARENA_CLIENT.CLIENT_SECRET);
        params.append('client_id', GARENA_CLIENT.CLIENT_ID);

        try {
            const response = await axios.post(URLS.GARENA_TOKEN, params, {
                headers: HEADERS.GARENA_AUTH
            });
            return response.data;
        } catch (error) {
            throw new Error(`Token Grant Failed: ${error.message}`);
        }
    }

    _xorEncryptOpenId(openId) {
        const k = [0, 0, 0, 2, 0, 1, 7, 0, 0, 0, 0, 0, 2, 0, 1, 7, 0, 0, 0, 0, 0, 2, 0, 1, 7, 0, 0, 0, 0, 0, 2, 0];
        const bytes = Buffer.from(openId, 'utf8');
        const result = Buffer.alloc(bytes.length);
        for (let i = 0; i < bytes.length; i++) {
            result[i] = bytes[i] ^ k[i % k.length] ^ 48;
        }
        return result;
    }

    // Encode varint (unsigned) for manual protobuf encoding
    _encodeVarint(n) {
        const result = [];
        while (n > 0x7F) {
            result.push((n & 0x7F) | 0x80);
            n >>= 7;
        }
        result.push(n);
        return Buffer.from(result);
    }

    // Encode protobuf field manually (matching Python implementation)
    _encodeField(fieldNum, value) {
        // Varint encoding for integers (wire type 0)
        if (typeof value === 'number' && Number.isInteger(value)) {
            const tag = (fieldNum << 3) | 0;
            const varint = this._encodeVarint(value);
            return Buffer.concat([this._encodeVarint(tag), varint]);
        }
        // Length-delimited for strings/bytes (wire type 2)
        const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
        const tag = (fieldNum << 3) | 2;
        return Buffer.concat([
            this._encodeVarint(tag),
            this._encodeVarint(bytes.length),
            bytes
        ]);
    }

    // Manual protobuf encode matching Python's ep() function
    _manualProtobufEncode(data) {
        const parts = [];
        for (const [fieldNum, value] of Object.entries(data).sort((a, b) => a[0] - b[0])) {
            parts.push(this._encodeField(parseInt(fieldNum), value));
        }
        return Buffer.concat(parts);
    }

    async _majorRegister(nickname, accessToken, openId, region) {
        const encryptedOpenId = this._xorEncryptOpenId(openId);

        // Build payload matching Python's format: {1: nick, 2: at, 3: oid, 5: 102000007, 6: 4, 7: 1, 13: 1, 14: e(oid), 15: region, 16: 1}
        const payload = {
            1: nickname,
            2: accessToken,
            3: openId,
            5: 102000007,
            6: 4,
            7: 1,
            13: 1,
            14: encryptedOpenId,
            15: region,
            16: 1
        };

        // Manual protobuf encode
        const protoBytes = this._manualProtobufEncode(payload);

        // AES encrypt (matching Python's aes(ep(pf).hex()))
        const { encrypt } = require('./crypto');
        const encryptedBody = encrypt(protoBytes);

        try {
            const response = await axios.post(URLS.MAJOR_REGISTER, encryptedBody, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'X-Unity-Version': '2018.4.11f1',
                    'X-GA': 'v1 1',
                    'ReleaseVersion': 'OB53',
                    'Content-Type': 'application/octet-stream',
                    'User-Agent': HEADERS.GARENA_AUTH['User-Agent'],
                    'Host': 'loginbp.ggblueshark.com',
                    'Connection': 'Keep-Alive',
                    'Accept-Encoding': 'gzip'
                },
                responseType: 'arraybuffer',
                validateStatus: () => true // Don't throw on non-2xx status
            });

            // Check response status
            if (response.status === 200) {
                return { success: true };
            }
            
            // Get error details from response
            let errorDetail = `HTTP ${response.status}`;
            try {
                if (response.data) {
                    const responseStr = response.data.toString('hex').substring(0, 100);
                    errorDetail += ` | Response: ${responseStr}`;
                }
            } catch (e) {}
            
            return { success: false, error: errorDetail };
        } catch (error) {
            return { success: false, error: `Request failed: ${error.message}` };
        }
    }

    // Simple protobuf decoder for response
    _manualProtobufDecode(buffer) {
        const result = {};
        let offset = 0;

        while (offset < buffer.length) {
            // Read tag
            let tag = 0;
            let shift = 0;
            while (true) {
                const byte = buffer[offset++];
                tag |= (byte & 0x7F) << shift;
                shift += 7;
                if ((byte & 0x80) === 0) break;
            }

            const fieldNum = tag >> 3;
            const wireType = tag & 0x07;

            if (wireType === 0) {
                // Varint
                let value = 0;
                shift = 0;
                while (true) {
                    const byte = buffer[offset++];
                    value |= (byte & 0x7F) << shift;
                    shift += 7;
                    if ((byte & 0x80) === 0) break;
                }
                result[fieldNum] = value;
            } else if (wireType === 2) {
                // Length-delimited
                let length = 0;
                shift = 0;
                while (true) {
                    const byte = buffer[offset++];
                    length |= (byte & 0x7F) << shift;
                    shift += 7;
                    if ((byte & 0x80) === 0) break;
                }
                result[fieldNum] = buffer.slice(offset, offset + length).toString('utf8');
                offset += length;
            }
        }

        // MajorRegister response fields:
        // Field 1 = status code (1 = success)
        // Field 3 = account ID (signed int, needs conversion)
        // Other fields = various flags (mostly 1)
        const statusCode = result[1] ?? 0;
        const accountId = result[3] ?? 0;

        return {
            code: statusCode,
            message: statusCode === 1 ? 'Success' : 'Failed',
            accountId: accountId,
            serverUrl: ''
        };
    }
}

module.exports = FreeFireAPI;
