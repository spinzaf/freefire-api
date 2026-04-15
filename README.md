<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:1f2937,100:111827&height=180&section=header&text=Free%20Fire%20API&fontSize=48&fontColor=ffffff&animation=fadeIn" width="100%" alt="Free Fire API Hero" />
  <img src="https://dl.dir.freefiremobile.com/common/test/official/FF_SHORT_LOGO.PNG.png" width="120" alt="Free Fire Logo" />
</div>

# Free Fire API

A Node.js library to interact with Free Fire endpoints using Protobuf.

## Disclaimer
This project is **unofficial** and is not affiliated with Garena.


## Features

| Feature | Description |
|---------|-------------|
| Search | Find players by nickname |
| Profile | Get player info, level, likes |
| Stats | BR/CS stats (Career, Ranked) |
| Items | Equipped outfit, weapons, pet |
| Register | Create guest accounts |
| Like | Send likes using guest accounts |

## Install

```bash
npm install @spinzaf/freefire-api
```

## Quick Start

```js
const { FreeFireAPI } = require('@spinzaf/freefire-api');

const api = new FreeFireAPI();

// Search player
const players = await api.searchAccount('nickname');

// Get profile
const profile = await api.getPlayerProfile('12345678');

// Get stats
const stats = await api.getPlayerStats('12345678', 'br', 'career');
```

## API

### Search
```js
const results = await api.searchAccount('nickname');
```

### Profile
```js
const profile = await api.getPlayerProfile('uid');
// Returns: { nickname, level, region, likes, ... }
```

### Stats
```js
const br = await api.getPlayerStats('uid', 'br', 'career');
const cs = await api.getPlayerStats('uid', 'cs', 'ranked');
// mode: 'br' | 'cs'
// type: 'career' | 'ranked' | 'normal'
```

### Register Account
```js
// Create guest account
const account = await api.register('IND'); // region required
console.log(account);
// { uid, password, passwordHash, region, nickname }
```

### Send Likes
```js
const { LikeAPI } = require('@spinzaf/freefire-api');

const like = new LikeAPI();
await like.sendLikes('target_uid', 'IND', 100); // max 100/day
```

## Regions

Supported: `IND`, `SG`, `BR`, `US`, `RU`, `TH`, `VN`, `TW`, `ME`, `CIS`, `BD`

**Note:** Some regions (ID, PK) don't support guest registration.

## Custom Credentials (Optional)

Create `config/credentials.yaml`:
```yaml
UID: "your_uid"
PASSWORD: "your_password"
```

Or pass directly:
```js
await api.login('uid', 'password');
```

## Testing

```bash
npm run test:all          # All tests
npm run test:search       # Search only
npm run test:register     # Register test
npm run test:like 123456789 IND 5  # Send 5 likes
```
## Example Testing Response
```
============================================================
 RUNNING ALL TESTS
============================================================

[TEST] Login...
Loaded 27989 items into database.
Starting Login Test...
[API] Loaded 261 credentials from all regions
[API] Using random credential from all regions: 4718573403
Login success!
Token: eyJhbGciOiJIUzI1NiIs...
OpenID: e07de22b7e01ad288c0d5c3d6d9b1b37
[✓] Login PASSED

[TEST] Search...
Loaded 27989 items into database.
Starting Search Test for 'folaa'...
[API] Loaded 261 credentials from all regions
[API] Using random credential from all regions: 4718549327
Found 10 players.
Top Result: Folaa (UID: 16778836)
[1] Folaa - UID: 16778836 - LVL: 3
[2] FolAa_66 - UID: 1943283579 - LVL: 46
[3] Folaa_golgem - UID: 14576052221 - LVL: 17
[4] folaa_ji - UID: 9436868269 - LVL: 7
[5] Folaa- - UID: 2357144535 - LVL: 1
[6] FOLAA-khna9 - UID: 2359319137 - LVL: 1
[7] Folaa! - UID: 8638700824 - LVL: 7
[8] folaa!! - UID: 8341924255 - LVL: 17
[9] folaa..... - UID: 6973843243 - LVL: 2
[10] folaa***** - UID: 5824293752 - LVL: 5
[✓] Search PASSED

[TEST] Profile...
Loaded 27989 items into database.
Starting Profile Test for UID: 12345678...
[API] Loaded 261 credentials from all regions
[API] Using random credential from all regions: 4718550346

--- Basic Info ---
Nickname: FB:ㅤ@GMRemyX
Level: 68
EXP: 2381543
Region: SG
Likes: 3799818
Created At: 12/7/2017, 5:19:29 AM
Last Login: 4/15/2026, 10:30:22 AM

--- Pet Info ---
Pet Name: SiNo
Pet Level: 7
[✓] Profile PASSED

[TEST] Stats...
Loaded 27989 items into database.
Starting Stats Test for UID: 16207002...
Fetching BR Career...
[API] Loaded 261 credentials from all regions
[API] Using random credential from all regions: 4718575604

--- BR Career ---
Solo: {"accountid":"16207002","gamesplayed":1059,"wins":88,"kills":2783,"detailedstats":{"deaths":971,"top10times":0,"topntimes":280,"distancetravelled":3233791,"survivaltime":459258,"revives":0,"highestkills":20,"damage":816313,"roadkills":47,"headshots":1459,"headshotkills":633,"knockdown":0,"pickups":58931}}
Duo: {"accountid":"16207002","gamesplayed":462,"wins":80,"kills":1383,"detailedstats":{"deaths":382,"top10times":0,"topntimes":144,"distancetravelled":1547115,"survivaltime":217364,"revives":98,"highestkills":22,"damage":487692,"roadkills":48,"headshots":960,"headshotkills":367,"knockdown":1320,"pickups":32172}}
Squad: {"accountid":"16207002","gamesplayed":6675,"wins":1236,"kills":16853,"detailedstats":{"deaths":5439,"top10times":0,"topntimes":2077,"distancetravelled":27153330,"survivaltime":3261428,"revives":1310,"highestkills":34,"damage":7579602,"roadkills":122,"headshots":13227,"headshotkills":4101,"knockdown":18491,"pickups":602207}}
Fetching BR Ranked...

--- BR Ranked ---
Solo: {"accountid":"16207002","gamesplayed":4,"wins":0,"kills":14,"detailedstats":{"deaths":4,"top10times":0,"topntimes":1,"distancetravelled":8912,"survivaltime":862,"revives":0,"highestkills":7,"damage":3661,"roadkills":0,"headshots":6,"headshotkills":3,"knockdown":0,"pickups":312}}      
Duo: {"accountid":"16207002","gamesplayed":1,"wins":0,"kills":0,"detailedstats":{"deaths":1,"top10times":0,"topntimes":0,"distancetravelled":2791,"survivaltime":232,"revives":0,"highestkills":0,"damage":0,"roadkills":0,"headshots":0,"headshotkills":0,"knockdown":0,"pickups":42}}
Squad: {"accountid":"16207002","gamesplayed":217,"wins":11,"kills":778,"detailedstats":{"deaths":206,"top10times":0,"topntimes":18,"distancetravelled":605333,"survivaltime":55263,"revives":5,"highestkills":18,"damage":322794,"roadkills":0,"headshots":577,"headshotkills":190,"knockdown":889,"pickups":15286}}
Fetching CS Career...

--- CS Career ---
Data: {
  "csstats": {
    "accountid": "16207002",
    "gamesplayed": 3119,
    "wins": 1794,
    "kills": 12605,
    "detailedstats": {
      "mvpcount": 1005,
      "doublekills": 2191,
      "triplekills": 843,
      "fourkills": 167,
      "damage": 5479860,
      "headshotkills": 3938,
      "knockdowns": 14399,
      "revivals": 844,
      "assists": 5527,
      "deaths": 10029,
      "streakwins": 0,
      "throwingkills": 0,
      "onegamemostdamage": 0,
      "onegamemostkills": 0,
      "ratingpoints": 0,
      "ratingenabledgames": 0,
      "headshotcount": 0,
      "hitcount": 0
    }
  }
}
Fetching CS Ranked...

--- CS Ranked ---
Data: {
  "csstats": {
    "accountid": "16207002",
    "gamesplayed": 0,
    "wins": 0,
    "kills": 0,
    "detailedstats": {
      "mvpcount": 0,
      "doublekills": 0,
      "triplekills": 0,
      "fourkills": 0,
      "damage": 0,
      "headshotkills": 0,
      "knockdowns": 0,
      "revivals": 0,
      "assists": 0,
      "deaths": 0,
      "streakwins": 0,
      "throwingkills": 0,
      "onegamemostdamage": 0,
      "onegamemostkills": 0,
      "ratingpoints": 0,
      "ratingenabledgames": 0,
      "headshotcount": 0,
      "hitcount": 0
    }
  }
}
[✓] Stats PASSED

[TEST] Items...
Loaded 27989 items into database.
Starting Items Test for UID: 12345678...
Getting Player Items...
[API] Loaded 261 credentials from all regions
[API] Using random credential from all regions: 4718567085

--- Summary ---
Nickname: FB:ㅤ@GMRemyX
UID: 12345678
Outfit Items: 1
Weapon Items: 0
Skills Equipped: 5
Skills: 214049006, 205000455, 211000016, 203000543, 204000103
Pet Name: SiNo
Pet ID: Poring

--- First 5 Outfits ---
- Unknown Item (ID: 50)
[✓] Items PASSED

[TEST] Like...
Loaded 27989 items into database.
==================================================
 FREE FIRE - AUTO LIKE PROFILE
==================================================
Target UID: 616257968
Region: IND
Likes to send: 1

[CredentialManager] Loaded 109 accounts for IND
[LikeAPI] Available guests for 616257968: 109/109
[LikeAPI] Planning to send 1 likes to 616257968 using IND guests
[LikeAPI] Progress: 1/1 (0✓ 0✗)
[LikeAPI] Completed: 1/1 likes sent successfully

==================================================
 RESULT
==================================================
Success: 1/1
Failed: 0
Remaining guests: 108

Sent 1 likes to 616257968. 108 guests remaining.
==================================================
[✓] Like PASSED

============================================================
 TEST SUMMARY
============================================================
[✓] Login: PASS
[✓] Search: PASS
[✓] Profile: PASS
[✓] Stats: PASS
[✓] Items: PASS
[✓] Like: PASS
============================================================
Passed: 6/6
Failed: 0/6
============================================================

[✓] ALL TESTS PASSED
```

## Mass Registration

```bash
node test/dev/register.js
```

Auto-saves to `config/credentials/{region}.yaml`. Resume supported.

## Project

- `lib/api.js` - Core API
- `lib/like.js` - Like feature
- `config/settings.yaml` - Headers & URLs
- `config/credentials/` - Guest accounts

## Credits

- **Spinzaf** - Node.js Rewrite
- **0xMe** - Original Python Developer

## License

GPL-3.0
