r = require('rethinkdbdash')(config.private.database);

module.exports = {
	save: function (user) {
		return new Promise(async function (resolve, reject) {
			try {
				const url = `https://owapi.krasovsky.me/api/v3/u/${encodeURIComponent(user.battletag)}/blob`;
				const profile = await r.http(url,
					{
						params: {
							platform: user.platform
						}
					}
				)(user.param);


				const status = r.table('users')
					.insert(
						{
							id: user.id,
							username: user.username,
							lang: user.lang,
							battletag: user.battletag,
							pretty_bt: user.pretty_bt,
							platform: user.platform,
							param: user.param,
							profile: r.http(user.url,
								{
									params: {
										platform: user.platform
									}
								}
							)(user.param)
						},
						{conflict: 'update'}
					);

				resolve(status);
			} catch (error) {
				reject(error);
			}
		});
	},

	updateUserProfile: function (id) {
		return new Promise(async function (resolve, reject) {
			try {
				const user = await r.table('users').get(id);
				const url = `https://owapi.krasovsky.me/api/v3/u/${encodeURIComponent(user.battletag)}/blob`;
				const profile = await r.http(url,
					{
						params: {
							platform: user.platform
						}
					}
				)(user.param);

				const status = await r.table('users')
					.get(id)
					.update({
						profile: profile
					});

				resolve(status);
			} catch (error) {
				reject(error);
			}
		});
	},

	updateUserLang: function (id, lang) {
		return r.table('users')
			.get(id)
			.update({
				lang: lang
			})
	},

	getUser: function (id) {
		return r.table('users')
			.get(id);
	},

	getUserLang: function (id) {
		return r.table('users')
			.get(id)('lang');
	},

	getUserImages: function (id) {
		return r.table('users')
			.get(id)('imgur');
	},

	delete: function (id) {
		return r.table('users')
			.get(id)
			.delete();
	},

	getRank: function (obj) {
		if (obj.hero === undefined)
			obj.hero = false;

		if (obj.asc === undefined)
			obj.asc = false;

		return new Promise(function(resolve, reject) {
			r.expr({
				// Значение поля
				value: r.branch(
					r.expr(obj.hero).eq(false),
					r.table('users').get(obj.id)('profile')('stats')(obj.mode)(obj.statsType)(obj.name),
					r.table('users').get(obj.id)('profile')('heroes')('stats')(obj.mode)(obj.hero)(obj.statsType)(obj.name)
				),
				// Общее число записей в таблице.
				count: r.table('users').count(),
				// Позиция в топе по нужному параметру в зависимости от условия по возрастанию или убыванию.
				position: r.branch(
					r.expr(obj.hero).eq(false),
					r.branch(
						r.expr(obj.asc).eq(true),
						r.table('users')
							.orderBy(r.asc(r.row('profile')('stats')(obj.mode)(obj.statsType)(obj.name))),
						r.table('users')
							.orderBy(r.desc(r.row('profile')('stats')(obj.mode)(obj.statsType)(obj.name)))
					),
					r.branch(
						r.expr(obj.asc).eq(true),
						r.table('users')
							.orderBy(r.asc(r.row('profile')('heroes')('stats')(obj.mode)(obj.hero)(obj.statsType)(obj.name))),
						r.table('users')
							.orderBy(r.desc(r.row('profile')('heroes')('stats')(obj.mode)(obj.hero)(obj.statsType)(obj.name)))
					)
				)
					.offsetsOf(r.row('id').eq(obj.id))
					.nth(0)
			})
				.then(function (res) {
					let value;
					if (obj.name.indexOf('time') > -1)
						value = hoursToTime(parseFloat(res.value));
					else
						value = parseFloat(res.value);

					const rank = (Number((100 - (1 - (res.position / res.count)) * 100).toFixed(2))).toString() + '%';

					resolve({name: obj.readableName, value: value, rank: rank, count: res.count, position: res.position});
				})
				.catch(function (error) {
					console.warn(error.message);
					resolve({name: obj.readableName, value: "НЕИЗВ.", rank: 'НЕИЗВЕСТНО', count: null, position: null});
				});
		});
	},

	// TEMPORARY
	getWinrateTop: function () {
		return r.table('users')
			.orderBy(r.desc(r.row('profile')('stats')('quickplay')('overall_stats')('win_rate')))
			.limit(10);
	},

	getRatingTop: function () {
		return r.table('users')
			.orderBy(r.desc(r.row('profile')('stats')('competitive')('overall_stats')('comprank')))
			.limit(10);
	},

	initChanges: function () {
		r.table('users').changes()
			.filter(r.row('new_val')('profile').ne(r.row('old_val')('profile')))
			.then(function (cursor) {
				cursor.each(async function (err, row) {
					if (err) new Error(err);

					console.log('Feed change detected!');

					await setLocale({from: {id: row.old_val.id}})
					if (row.old_val && row.new_val && row.old_val.profile && row.new_val.profile) {
						const oldStats = row.old_val.profile.stats.competitive.overall_stats;
						const newStats = row.new_val.profile.stats.competitive.overall_stats;

						oldStats.level = oldStats.level + oldStats.prestige * 100;
						newStats.level = newStats.level + newStats.prestige * 100;

						const diffStats = {
							comprank: newStats.comprank - oldStats.comprank,
							games: newStats.games - oldStats.games,
							level: newStats.level - oldStats.level,
							losses: newStats.losses - oldStats.losses,
							ties: newStats.ties - oldStats.ties,
							wins: newStats.wins - oldStats.wins,
						};

						function addInfo(name, oldInfo, newInfo, diffInfo) {
							let text = `${name}\n<code>${oldInfo} | ${newInfo} |`;
							if (diffInfo > 0)
								text += ` +${diffInfo} 📈\n</code>`;
							else if (diffInfo === 0)
								text += ` ${diffInfo} —\n</code>`;
							else
								text += ` ${diffInfo} 📉\n</code>`;
							return text;
						}

						let text = translate("report_header");

						text += addInfo(translate("report_rating"), oldStats.comprank, newStats.comprank, diffStats.comprank);
						text += addInfo(translate("report_wins"), oldStats.wins, newStats.wins, diffStats.wins);
						text += addInfo(translate("report_losses"), oldStats.losses, newStats.losses, diffStats.losses);
						text += addInfo(translate("report_ties"), oldStats.ties, newStats.ties, diffStats.ties);
						text += addInfo(translate("report_level"), oldStats.level, newStats.level, diffStats.level);

						bot.sendMessage(row.old_val.id, text, {parse_mode: 'HTML'});
					}
				});
			});
	}
};