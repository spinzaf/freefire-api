const fs = require('fs');
const path = require('path');

function parseSimpleYaml(content) {
    const result = {};
    const lines = content.split(/\r?\n/);

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        const separatorIndex = line.indexOf(':');
        if (separatorIndex === -1) continue;

        const key = line.slice(0, separatorIndex).trim();
        let value = line.slice(separatorIndex + 1).trim();

        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        result[key] = value;
    }

    return result;
}

function loadYamlFile(filePath) {
    try {
        const yamlRaw = fs.readFileSync(filePath, 'utf8');
        return parseSimpleYaml(yamlRaw);
    } catch (error) {
        return {};
    }
}

function readConfigValue(config, key, fallback) {
    const value = config[key];
    if (value === undefined || value === null || value === '') return fallback;
    return String(value);
}

function requireConfigValue(config, key) {
    const value = readConfigValue(config, key, '');
    if (!value) {
        throw new Error(`Missing required setting in config/settings.yaml: ${key}`);
    }
    return value;
}

function loadDefaultCredentials() {
    const parsed = loadYamlFile(path.join(__dirname, '../config/credentials.yaml'));
    return {
        UID: readConfigValue(parsed, 'UID', ''),
        PASSWORD: readConfigValue(parsed, 'PASSWORD', '')
    };
}

function loadSettings() {
    const parsed = loadYamlFile(path.join(__dirname, '../config/settings.yaml'));

    return {
        AE: {
            MAIN_KEY: Buffer.from(requireConfigValue(parsed, 'AE_MAIN_KEY'), "binary"),
            MAIN_IV: Buffer.from(requireConfigValue(parsed, 'AE_MAIN_IV'), "binary")
        },
        HEADERS: {
            COMMON: {
                'User-Agent': requireConfigValue(parsed, 'HEADERS_COMMON_USER_AGENT'),
                'Connection': requireConfigValue(parsed, 'HEADERS_COMMON_CONNECTION'),
                'Accept-Encoding': requireConfigValue(parsed, 'HEADERS_COMMON_ACCEPT_ENCODING'),
                'Expect': requireConfigValue(parsed, 'HEADERS_COMMON_EXPECT'),
                'X-Unity-Version': requireConfigValue(parsed, 'HEADERS_COMMON_X_UNITY_VERSION'),
                'X-GA': requireConfigValue(parsed, 'HEADERS_COMMON_X_GA'),
                'ReleaseVersion': requireConfigValue(parsed, 'HEADERS_COMMON_RELEASE_VERSION'),
                'Content-Type': requireConfigValue(parsed, 'HEADERS_COMMON_CONTENT_TYPE')
            },
            GARENA_AUTH: {
                'User-Agent': requireConfigValue(parsed, 'HEADERS_GARENA_AUTH_USER_AGENT'),
                'Connection': requireConfigValue(parsed, 'HEADERS_GARENA_AUTH_CONNECTION'),
                'Accept-Encoding': requireConfigValue(parsed, 'HEADERS_GARENA_AUTH_ACCEPT_ENCODING')
            }
        },
        URLS: {
            GARENA_TOKEN: requireConfigValue(parsed, 'URL_GARENA_TOKEN'),
            GUEST_REGISTER: requireConfigValue(parsed, 'URL_GUEST_REGISTER'),
            MAJOR_LOGIN: requireConfigValue(parsed, 'URL_MAJOR_LOGIN'),
            MAJOR_REGISTER: requireConfigValue(parsed, 'URL_MAJOR_REGISTER'),
            SEARCH_PATH: requireConfigValue(parsed, 'URL_PATH_SEARCH'),
            PERSONAL_SHOW_PATH: requireConfigValue(parsed, 'URL_PATH_PERSONAL_SHOW'),
            PLAYER_STATS_PATH: requireConfigValue(parsed, 'URL_PATH_PLAYER_STATS'),
            PLAYER_CS_STATS_PATH: requireConfigValue(parsed, 'URL_PATH_PLAYER_CS_STATS')
        },
        GARENA_CLIENT: {
            CLIENT_ID: requireConfigValue(parsed, 'GARENA_CLIENT_ID'),
            CLIENT_SECRET: requireConfigValue(parsed, 'GARENA_CLIENT_SECRET')
        }
    };
}

const settings = loadSettings();
const paths = settings.URLS;

module.exports = {
    AE: settings.AE,
    HEADERS: settings.HEADERS,
    URLS: {
        GARENA_TOKEN: paths.GARENA_TOKEN,
        GUEST_REGISTER: paths.GUEST_REGISTER,
        MAJOR_LOGIN: paths.MAJOR_LOGIN,
        MAJOR_REGISTER: paths.MAJOR_REGISTER,
        SEARCH: (serverUrl) => `${serverUrl}${paths.SEARCH_PATH}`,
        PERSONAL_SHOW: (serverUrl) => `${serverUrl}${paths.PERSONAL_SHOW_PATH}`,
        PLAYER_STATS: (serverUrl) => `${serverUrl}${paths.PLAYER_STATS_PATH}`,
        PLAYER_CS_STATS: (serverUrl) => `${serverUrl}${paths.PLAYER_CS_STATS_PATH}`
    },
    GARENA_CLIENT: settings.GARENA_CLIENT,
    DEFAULT_CREDENTIALS: loadDefaultCredentials()
};
