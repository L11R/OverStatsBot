# OverStatsBot

Telegram bot for Overwatch inspired by [overwatch-telegram-bot](https://github.com/chesterhow/overwatch-telegram-bot).
Powered by [RethinkDB](https://rethinkdb.com) and [OWAPI](https://owapi.net).

Needs Node.js 7+, because of using async/await construction in the code.

### How to deploy
1. Install Node 7+ and RethinkDB.
2. Create database `overwatch` and `users` table in GUI ([localhost:8080](http://localhost:8080)) _(if you can, you can do it directly in code)_.
3. `git clone https://github.com/Lord-Protector/OverStatsBot.git`
4. `npm install`
5. Create file config.js in the root and paste it:
```javascript
module.exports.private = {
	token: 'YOUR_TONEN',
	imgur_client_id: 'YOUR_CLIENT_ID',
	database: {
		    db: 'overwatch',
        	servers: [{host: 'IP', port: 28015}]
    	},
    botconf: {polling:true} // or Webhooks
};
```
Of course you will should to get token from [@BotFather](https://t.me/BotFather) and 
client_id from Imgur [here](https://api.imgur.com/oauth2/addclient) (anonymous usage is enough for us).

### Roadmap
- [x] Image generation for quick and competitive games
- [x] Add DB for saving profiles
- [x] Add inline mode support for sharing profile pictures
- [x] Localization on other languages (Contributors are Welcome!)
- [ ] Image generation for dedicated heroes
- [ ] Ability to use two and more account at once
- [ ] Ability to save profile snapshots everyday (for example) to plot some graphs

**Feel free to commit and write me PM [here](https://t.me/kraso)!**
