/**
 * Created by savely on 15.04.2017.
 */
require('console-stamp')(console, { pattern: 'HH:MM:ss.l'});

global.config = require('./config');
global.parse_html = {parse_mode:'HTML'};

const image = require('./image');
const TelegramBot = require('node-telegram-bot-api');

global.r = require('rethinkdbdash')(config.private.database);

global.R = require('ramda');
global.bot = new TelegramBot(config.private.token, config.private.botconf);

const translate = require('counterpart');
translate.setFallbackLocale('en');

translate.registerTranslations('en', require('counterpart/locales/en'));
translate.registerTranslations('en', require('./translations/en.json'));

translate.registerTranslations('ru', require('counterpart/locales/ru'));
translate.registerTranslations('ru', require('./translations/ru.json'));

global.hoursToTime = function (hours) {
	function hoursToMinutes(hours) {
		if (hours) {
			const time = (hours * 60);
			return Math.floor(time);
		}

		return 0;
	}

	if (hours) {
		const time = (hours * 60);
		const minutes = (`0${hoursToMinutes(hours)}`).slice(-2);
		const seconds = (`0${Math.floor((time % 1) * 60)}`).slice(-2);

		return `${minutes}:${seconds}`;
	}

	return 0;
};

global.throwError = function (error, id) {
	console.warn(error.message);
	return bot.sendMessage(id,
		translate("error_message", {error: error.message.split('\n')[0] + ' ...'}), parse_html);
};

require('./inline')();

async function setLocale(msg) {
	try {
		const lang = await r.table('users').get(msg.from.id)('lang');
		translate.setLocale(lang.substr(0, 2));
	} catch (error) {
		console.warn(error.message);

		if (msg.from.language_code !== undefined)
			translate.setLocale(msg.from.language_code.substr(0, 2));
	}
}

bot.onText(/^\/lang (.+)/, async function (msg, match) {
	await setLocale(msg);
	r.table('users').get(msg.from.id)
		.update({
			lang: match[1]
		})

		.then(function () {
			bot.sendMessage(msg.chat.id, translate("language_changed_message"));
		})

		.catch(function (error) {
			throwError(error, msg.chat.id);
		});
});

bot.onText(/^\/start/i, async function (msg) {
	await setLocale(msg);
	if (msg.chat.id > 0)
		bot.sendMessage(msg.chat.id, translate("start_message"), parse_html);
});

bot.onText(/^\/help/i, async function (msg) {
	await setLocale(msg);
	if (msg.chat.id > 0)
		bot.sendMessage(msg.chat.id, translate("help_message"), parse_html);
});

bot.onText(/^\/guide/i, async function (msg) {
	await setLocale(msg);
	if (msg.chat.id > 0)
		bot.sendMessage(msg.chat.id, translate("guide_message"),
			{
				parse_mode: 'HTML',
				disable_web_page_preview: true
			});
});

bot.onText(/^\/save (.+)\s(.+)|^\/save/i, async function (msg, match) {
	await setLocale(msg);
	if (msg.chat.id > 0) {
		let pretty_bt, battletag, platform, param, sended;

		if (match[1] === undefined || match[2] === undefined)
			bot.sendMessage(msg.chat.id, translate("save_example_message"), parse_html);
		else {
			sended = await bot.sendMessage(msg.chat.id, translate("please_wait_saving_message"));
			if (match[1].indexOf('-') > -1) {
				const temp = match[1].split('-');
				pretty_bt = temp[0] + '#' + temp[1];
			} else
				pretty_bt = match[1];

			if (match[1].indexOf('#') > -1) {
				const temp = match[1].split('#');
				battletag = temp[0] + '-' + temp[1];
			} else
				battletag = match[1];

			if (match[2] === 'eu' || match[2] === 'us' || match[2] === 'kr')
				platform = 'pc';
			else
				platform = match[2];

			if (match[2] === 'psn' || match[2] === 'xbl')
				param = 'any';
			else
				param = match[2];

			r.table('users')
				.insert(
					{
						id: msg.from.id,
						username: msg.from.username,
						lang: 'en',
						battletag: battletag,
						pretty_bt: pretty_bt,
						platform: platform,
						param: param,
						profile: r.http(`https://owapi.krasovsky.me/api/v3/u/${encodeURIComponent(battletag)}/blob`,
							{
								params: {
									platform: platform
								}
							}
						)(param)
					},
					{conflict: 'update'}
				)

				.then(function (status) {
					console.log(status);
					bot.editMessageText(translate("saved_message"), { message_id: sended.message_id, chat_id: msg.chat.id });
				})

				.catch(function (error) {
					console.log(error.message);
					bot.editMessageText(translate("error_message", {error: error.message.split('\n')[0] + ' ...'}),
						{message_id: sended.message_id, chat_id: msg.chat.id, parse_mode: 'HTML'});
				});
		}
	}
});

function update(user_id) {
	return new Promise(async function (resolve, reject) {
		const user = await r.table('users').get(user_id);

		let profile;
		try {
			profile = await r.http(`https://owapi.krasovsky.me/api/v3/u/${encodeURIComponent(user.battletag)}/blob`,
				{params: {platform: user.platform}})(user.param);
		} catch (error) {
			profile = null;

			reject(error);
		}

		r.table('users').get(user_id)
			.update(
				// Условие
				r.branch(
					// Если профиль не null -- сохраняем, если null -- ничего не делаем.
					profile,
					{
						profile: profile,
					},
					{}
				)
			)

			.then(function (status) {
				resolve(status);
			})

			.catch(function (error) {
				reject(error);
			});
	});
}

setInterval(function () {
	r.table('users')
		.pluck('id')('id')

		.then(async function (res) {
			console.log(res);

			const promises = res.map(function (id) {
				return update(id);
			});

			const splitedPromises = R.splitEvery(3, promises);

			const startTotal = new Date().getTime();

			for (let i in splitedPromises) {
				const startCycle = new Date().getTime();
				try {
					const status = await Promise.all(splitedPromises[i]);
					console.log(status);
					console.warn(`CYCLE: ${((new Date().getTime()) - startCycle) / 1000}s`);
				} catch (error) {
					console.warn(error.message);
					console.warn(`CYCLE: ${((new Date().getTime()) - startCycle) / 1000}s`);
				}
			}

			console.warn(`TOTAL: ${((new Date().getTime()) - startTotal) / 1000}s`);
		})

		.catch(function (error) {
			console.warn(error.message);
		});
}, 1000 * 60 * 5);


bot.onText(/^\/update/i, async function (msg) {
	await setLocale(msg);
	if (msg.chat.id > 0) {
		const sended = await bot.sendMessage(msg.chat.id, translate("please_wait_updating_message"));

		update(msg.from.id)
			.then(function (res) {
				console.log(res);
				bot.editMessageText(translate("updated_message"),
					{message_id: sended.message_id, chat_id: msg.chat.id});
			})

			.catch(function (error) {
				console.warn(error.message);
				bot.editMessageText(translate("error_message", {error: error.message.split('\n')[0] + ' ...'}),
					{message_id: sended.message_id, chat_id: msg.chat.id, parse_mode: 'HTML'});
			})
	}
});

bot.onText(/^\/delete/i, async function (msg) {
	await setLocale(msg);
	if (msg.chat.id > 0) {
		r.table('users').get(msg.from.id)
			.delete()

			.then(function (status) {
				console.log(status);
				if (status.deleted !== 0)
					return bot.sendMessage(msg.chat.id, translate("deleted_message"));
				if (status.skipped !== 0)
					return bot.sendMessage(msg.chat.id, translate("nothing_to_delete_message"));
			})

			.catch(function (error) {
				throwError(error, msg.chat.id);
			});
	}
});

bot.onText(/^\/winratetop/i, async function (msg) {
	await setLocale(msg);
	r.table('users')
		.orderBy(r.desc(r.row('profile')('stats')('quickplay')('overall_stats')('win_rate')))
		.limit(10)
		.then(function (users) {
			let top = '<b>Топ-10 по винрейту в Быстрой Игре</b>:\n';
			for (let i in users) {
				if (users[i].profile !== undefined) {
					if (users[i].username !== undefined)
						top += `${parseInt(i) + 1}. ${users[i].pretty_bt} (<code>@${users[i].username}</code>): ${users[i].profile.stats.quickplay.overall_stats.win_rate}%\n`;
					else
						top += `${parseInt(i) + 1}. ${users[i].pretty_bt}: ${users[i].profile.stats.quickplay.overall_stats.win_rate}%\n`
				}
			}
			return bot.sendMessage(msg.chat.id, top, parse_html);
		})

		.catch(function (error) {
			throwError(error, msg.chat.id);
		});
});

bot.onText(/^\/ratingtop/i, async function (msg) {
	await setLocale(msg);
	r.table('users')
		.orderBy(r.desc(r.row('profile')('stats')('competitive')('overall_stats')('comprank')))
		.limit(10)
		.then(function (users) {
			let top = '<b>Топ-10 по рейтингу в Соревновательной Игре</b>:\n';
			for (let i in users) {
				if (users[i].profile !== undefined) {
					if (users[i].username !== undefined)
						top += `${parseInt(i) + 1}. ${users[i].pretty_bt} (<code>@${users[i].username}</code>): ${users[i].profile.stats.competitive.overall_stats.comprank}\n`;
					else
						top += `${parseInt(i) + 1}. ${users[i].pretty_bt}: ${users[i].profile.stats.competitive.overall_stats.comprank}\n`
				}
			}
			return bot.sendMessage(msg.chat.id, top, parse_html);
		})

		.catch(function (error) {
			throwError(error, msg.chat.id);
		});
});

function getRank(obj) {
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
}

function getCompetitiveRank(id, name, readableName, statsType, asc) {
	if (asc === undefined)
		asc = false;

	if (statsType === undefined)
		statsType = 'average_stats';

	return getRank({
		id: id, mode: 'competitive', statsType: statsType,
		name: name, readableName: readableName, asc: asc
	});
}

function getQuickplayRank(id, name, readableName, statsType, asc) {
	if (asc === undefined)
		asc = false;

	if (statsType === undefined)
		statsType = 'average_stats';

	return getRank({
		id: id, mode: 'quickplay', statsType: statsType,
		name: name, readableName: readableName, asc: asc
	});
}

function getHeroCompetitiveRank(id, name, readableName, hero, statsType, asc) {
	if (asc === undefined)
		asc = false;

	if (statsType === undefined)
		statsType = 'average_stats';

	return getRank({
		id: id, mode: 'competitive', hero: hero, statsType: statsType,
		name: name, readableName: readableName, asc: asc
	});
}

function getHeroQuickplayRank(id, name, readableName, hero, statsType, asc) {
	if (asc === undefined)
		asc = false;

	if (statsType === undefined)
		statsType = 'average_stats';

	return getRank({
		id: id, mode: 'quickplay', hero: hero, statsType: statsType,
		name: name, readableName: readableName, asc: asc
	});
}

bot.onText(/^\/generate/i, async function (msg) {
	await setLocale(msg);
	if (msg.chat.id > 1) {
		const id = msg.from.id;
		const user = await r.table('users').get(id);

		let competitive = {
			mode: 'competitive',
			ranks: [
				getCompetitiveRank(id, 'deaths_avg', translate('deaths_avg'), undefined, true),
				getCompetitiveRank(id, 'eliminations_avg', translate('eliminations_avg')),
				getCompetitiveRank(id, 'final_blows_avg', translate('final_blows_avg')),
				getCompetitiveRank(id, 'healing_done_avg', translate('healing_done_avg')),
				getCompetitiveRank(id, 'melee_final_blows_avg', translate('melee_final_blows_avg')),
				getCompetitiveRank(id, 'objective_kills_avg', translate('objective_kills_avg')),
				getCompetitiveRank(id, 'objective_time_avg', translate('objective_time_avg')),
				getCompetitiveRank(id, 'solo_kills_avg', translate('solo_kills_avg')),
				getCompetitiveRank(id, 'time_spent_on_fire_avg', translate('time_spent_on_fire_avg')),
			]
		};

		let quickplay = {
			mode: 'quickplay',
			ranks: [
				getQuickplayRank(id, 'deaths_avg', translate('deaths_avg'), undefined, true),
				getQuickplayRank(id, 'eliminations_avg', translate('eliminations_avg')),
				getQuickplayRank(id, 'final_blows_avg', translate('final_blows_avg')),
				getQuickplayRank(id, 'objective_kills_avg', translate('objective_kills_avg')),
				getQuickplayRank(id, 'objective_time_avg', translate('objective_time_avg')),
				getQuickplayRank(id, 'solo_kills_avg', translate('solo_kills_avg')),
				getQuickplayRank(id, 'time_spent_on_fire_avg', translate('time_spent_on_fire_avg')),
				getQuickplayRank(id, 'kpd', translate('kpd'), 'game_stats'),
				getQuickplayRank(id, 'win_rate', translate('win_rate'), 'overall_stats'),
			]
		};

		const sended = await bot.sendMessage(msg.chat.id, translate("please_wait_generation_message"));

		let temp = [];

		try {
			competitive.ranks = await Promise.all(competitive.ranks);
			temp.push(competitive);
			console.log(competitive);
		} catch (error) {
			console.warn(error.message);
		}

		try {
			quickplay.ranks = await Promise.all(quickplay.ranks);
			temp.push(quickplay);
			console.log(quickplay);
		} catch (error) {
			console.warn(error.message);
		}

		let text = translate("generation_progress_header_message");
		const startTotal = new Date().getTime();
		for (let i in temp) {
			const startCycle = new Date().getTime();
			try {
				await image.generate(user.profile, user.pretty_bt, temp[i], msg.from.id, msg.chat.id);
				text += translate("generation_done_message", {time: (new Date().getTime()) - startCycle, mode: temp[i].mode});
			} catch (error) {
				console.warn(error.message);
				text += translate("generation_failed_message", {time: (new Date().getTime()) - startCycle, mode: temp[i].mode});
			}
			await bot.editMessageText(translate("generation_total_message", {text: text, time: (new Date().getTime()) - startTotal}),
				{message_id: sended.message_id, chat_id: msg.chat.id, parse_mode: 'HTML'});
		}
	}
});

bot.onText(/^\/show (.+)|^\/show/i, async function (msg, match) {
	await setLocale(msg);
	if (msg.chat.id > 0) {
		if (match[1] === undefined)
			bot.sendMessage(msg.chat.id, translate("show_example_message"), parse_html);

		else {
			r.table('users')
				.get(msg.from.id)

				.then(function (profile) {
					if (profile !== null
						&& profile.imgur.quickplay.link !== null
						&& profile.imgur.competitive.link !== null) {

						let link;
						if (match[1] === 'quickplay')
							link = profile.imgur.quickplay.link;
						else if (match[1] === 'competitive')
							link = profile.imgur.competitive.link;

						return bot.sendPhoto(msg.chat.id, link);
					} else
						return bot.sendMessage(msg.chat.id, translate("show_error_message"));
				})

				.catch(function (error) {
					throwError(error, msg.chat.id);
				});
		}
	}
});

bot.onText(/^\/links/, async function (msg) {
	await setLocale(msg);
	if (msg.chat.id > 0) {
		r.table('users').get(msg.from.id)
			.then(function (res) {
				let text = translate("links_header_message");
				if (res.imgur.quickplay.link !== undefined)
					text += translate("links_quickplay_message", {link: res.imgur.quickplay.link});
				if (res.imgur.competitive.link !== undefined)
					text += translate("links_competitive_message", {link: res.imgur.competitive.link});

				bot.sendMessage(msg.chat.id, text,
					{
						parse_mode: 'HTML',
						disable_web_page_preview: true
					});
			});
	}
});

bot.onText(/^\/donate/, async function (msg) {
	await setLocale(msg);
	if (msg.chat.id > 0)
		bot.sendMessage(msg.chat.id, translate("donate_message"), {parse_mode: 'HTML'});
});

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

bot.onText(/^\/test/, function (msg) {
	bot.sendMessage(msg.chat.id, '@48756093 (Savely)')
});

bot.on('message', function (msg) {
	console.log(msg);
});
