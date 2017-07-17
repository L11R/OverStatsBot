/**
 * Created by savely on 15.04.2017.
 */
require('console-stamp')(console, { pattern: 'HH:MM:ss.l'});

global.config = require('./config');

const image = require('./image');
const TelegramBot = require('node-telegram-bot-api');

global.R = require('ramda');
const bot = new TelegramBot(config.private.token, config.private.botconf);

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
		translate("error_message", {error: error.message.split('\n')[0] + ' ...'}), {parse_mode:'HTML'});
};

const inline = require('./inline');
const db = require('./db');

async function setLocale(msg) {
	try {
		const lang = await db.getUserLang(msg.from.id);
		translate.setLocale(lang.substr(0, 2));
	} catch (error) {
		console.warn(error.message);

		if (msg.from.language_code !== undefined)
			translate.setLocale(msg.from.language_code.substr(0, 2));
	}
}

bot.onText(/^\/lang (.+)/, async function (msg, match) {
	await setLocale(msg);
	try {
		const status = await db.updateUserLang(msg.from.id, match[1]);
		bot.sendMessage(msg.chat.id, translate("language_changed_message"));
	} catch (error) {
		throwError(error, msg.chat.id);
	}
});

bot.onText(/^\/start/i, async function (msg) {
	await setLocale(msg);
	if (msg.chat.id > 0)
		bot.sendMessage(msg.chat.id, translate("start_message"), {parse_mode:'HTML'});
});

bot.onText(/^\/help/i, async function (msg) {
	await setLocale(msg);
	if (msg.chat.id > 0)
		bot.sendMessage(msg.chat.id, translate("help_message"), {parse_mode:'HTML'});
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
		let pretty_bt, battletag, platform, param, sent;

		if (match[1] === undefined || match[2] === undefined)
			bot.sendMessage(msg.chat.id, translate("save_example_message"), {parse_mode:'HTML'});
		else {
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

			let lang = '';
			if (msg.from.language_code)
				lang = msg.from.language_code.substr(0, 2);
			else
				lang = 'en';

			const url = `http://owapi.net/api/v3/u/${encodeURIComponent(battletag)}/blob`;

			const user = {
				id: msg.from.id,
				username: msg.from.username,
				lang: lang,
				battletag: battletag,
				pretty_bt: pretty_bt,
				platform: platform,
				param: param,
				url: url
			};

			try {
				sent = await bot.sendMessage(msg.chat.id, translate("please_wait_saving_message"));
				const status = await db.save(user);

				bot.editMessageText(translate("saved_message"),
					{message_id: sent.message_id, chat_id: msg.chat.id});
			} catch (error) {
				console.warn(error.message);
				bot.editMessageText(translate("error_message", {error: error.message.split('\n')[0] + ' ...'}),
					{message_id: sent.message_id, chat_id: msg.chat.id, parse_mode: 'HTML'});
			}
		}
	}
});

/*
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
*/


bot.onText(/^\/update/i, async function (msg) {
	await setLocale(msg);
	if (msg.chat.id > 0) {
		let sent;

		try {
			sent = await bot.sendMessage(msg.chat.id, translate("please_wait_updating_message"));
			const status = await db.updateUserProfile(msg.from.id);
			bot.editMessageText(translate("updated_message"),
				{message_id: sent.message_id, chat_id: msg.chat.id});
		} catch (error) {
			console.warn(error.message);
			bot.editMessageText(translate("error_message", {error: error.message.split('\n')[0] + ' ...'}),
				{message_id: sent.message_id, chat_id: msg.chat.id, parse_mode: 'HTML'});
		}
	}
});

bot.onText(/^\/delete/i, async function (msg) {
	await setLocale(msg);
	if (msg.chat.id > 0) {
        try {
            const status = await db.delete(msg.from.id);
            if (status.deleted !== 0)
                bot.sendMessage(msg.chat.id, translate("deleted_message"));
            if (status.skipped !== 0)
                bot.sendMessage(msg.chat.id, translate("nothing_to_delete_message"));
        } catch (error) {
            throwError(error, msg.chat.id);
        }
    }
});

bot.onText(/^\/winratetop/i, async function (msg) {
	await setLocale(msg);
	try {
		const top = await db.getWinrateTop();
		let text = '<b>Топ-10 по винрейту в Быстрой Игре</b>:\n';

		for (let i in top) {
			if (top[i].profile !== undefined) {
				if (top[i].username !== undefined)
					text += `${parseInt(i) + 1}. ${top[i].pretty_bt} (<code>@${top[i].username}</code>): ${top[i].profile.stats.quickplay.overall_stats.win_rate}%\n`;
				else
					text += `${parseInt(i) + 1}. ${top[i].pretty_bt}: ${top[i].profile.stats.quickplay.overall_stats.win_rate}%\n`
			}
		}

		bot.sendMessage(msg.chat.id, text, {parse_mode:'HTML'});
	} catch (error) {
		throwError(error, msg.chat.id);
	}
});

bot.onText(/^\/ratingtop/i, async function (msg) {
	await setLocale(msg);
	try {
		const top = await db.getRatingTop();
		let text = '<b>Топ-10 по рейтингу в Соревновательной Игре</b>:\n';

		for (let i in top) {
			if (top[i].profile !== undefined) {
				if (top[i].username !== undefined)
					text += `${parseInt(i) + 1}. ${top[i].pretty_bt} (<code>@${top[i].username}</code>): ${top[i].profile.stats.competitive.overall_stats.comprank}\n`;
				else
					text += `${parseInt(i) + 1}. ${top[i].pretty_bt}: ${top[i].profile.stats.competitive.overall_stats.comprank}\n`
			}
		}

		bot.sendMessage(msg.chat.id, text, {parse_mode:'HTML'});
	} catch (error) {
		throwError(error, msg.chat.id);
	}
});

function getCompetitiveRank(id, name, readableName, statsType, asc) {
	if (asc === undefined)
		asc = false;

	if (statsType === undefined)
		statsType = 'average_stats';

	return db.getRank({
		id: id, mode: 'competitive', statsType: statsType,
		name: name, readableName: readableName, asc: asc
	});
}

function getQuickplayRank(id, name, readableName, statsType, asc) {
	if (asc === undefined)
		asc = false;

	if (statsType === undefined)
		statsType = 'average_stats';

	return db.getRank({
		id: id, mode: 'quickplay', statsType: statsType,
		name: name, readableName: readableName, asc: asc
	});
}

function getHeroCompetitiveRank(id, name, readableName, hero, statsType, asc) {
	if (asc === undefined)
		asc = false;

	if (statsType === undefined)
		statsType = 'average_stats';

	return db.getRank({
		id: id, mode: 'competitive', hero: hero, statsType: statsType,
		name: name, readableName: readableName, asc: asc
	});
}

function getHeroQuickplayRank(id, name, readableName, hero, statsType, asc) {
	if (asc === undefined)
		asc = false;

	if (statsType === undefined)
		statsType = 'average_stats';

	return db.getRank({
		id: id, mode: 'quickplay', hero: hero, statsType: statsType,
		name: name, readableName: readableName, asc: asc
	});
}

bot.onText(/^\/generate/i, async function (msg) {
	await setLocale(msg);
	if (msg.chat.id > 1) {
		const id = msg.from.id;
		const user = await db.getUser(msg.from.id);

		let competitive = {
			hero: 'all',
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
			hero: 'all',
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

		let dva = {
			hero: 'dva',
			mode: 'quickplay',
			ranks: [
				getHeroQuickplayRank(id, 'critical_hits_average', 'КРИТ. ПОПАДЕНИЙ', 'dva'),
				getHeroQuickplayRank(id, 'damage_blocked_average', 'УРОНА ЗАБЛОКИРОВАНО', 'dva'),
				getHeroQuickplayRank(id, 'deaths_average', 'СМЕРТЕЙ', 'dva', undefined, true),
				getHeroQuickplayRank(id, 'eliminations_average', 'УБИЙСТВ', 'dva'),
				getHeroQuickplayRank(id, 'final_blows_average', 'СМЕРТЕЛЬНЫХ УДАРОВ', 'dva'),
				getHeroQuickplayRank(id, 'mechs_called_average', 'МЕХ ВЫЗВАНО', 'dva'),
				getHeroQuickplayRank(id, 'melee_final_blows_average', 'СМЕРТ. УДАРОВ В РУКОП.', 'dva'),
				getHeroQuickplayRank(id, 'objective_kills_average', 'УБИЙСТВ У ОБЪЕКТОВ', 'dva'),
				getHeroQuickplayRank(id, 'objective_time_average', 'ВЫПОЛНЕНИЕ ЗАДАЧ', 'dva'),
				getHeroQuickplayRank(id, 'self_destruct_kills_average', 'УБИЙСТВ САМОУНИЧТ.', 'dva'),
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

		try {
			dva.ranks = await Promise.all(dva.ranks);
			temp.push(dva);
			console.log(dva);
		} catch (error) {
			console.warn(error.message);
		}

		let text = translate("generation_progress_header_message");
		const startTotal = new Date().getTime();
		for (let i in temp) {
			const startCycle = new Date().getTime();

			try {
				await image.generate(user.profile, user.pretty_bt, temp[i], msg.from.id, msg.chat.id);
				text += translate("generation_done_message", {time: (new Date().getTime()) - startCycle, hero: temp[i].hero, mode: temp[i].mode});
			} catch (error) {
				console.warn(error.message);
				text += translate("generation_failed_message", {time: (new Date().getTime()) - startCycle, hero: temp[i].hero, mode: temp[i].mode});
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
			bot.sendMessage(msg.chat.id, translate("show_example_message"), {parse_mode:'HTML'});

		else {
			try {
				const user = await db.getUser(msg.from.id);

				if (user && user.imgur.quickplay.link && user.imgur.competitive.link) {
					let link;

					if (match[1] === 'quickplay')
						link = user.imgur.quickplay.link;
					else if (match[1] === 'competitive')
						link = user.imgur.competitive.link;

					bot.sendPhoto(msg.chat.id, link);
				} else
					bot.sendMessage(msg.chat.id, translate("show_error_message"));
			} catch (error) {
				throwError(error, msg.chat.id);
			}
		}
	}
});

bot.onText(/^\/links/, async function (msg) {
	await setLocale(msg);
	if (msg.chat.id > 0) {
		try {
			const user = await db.getUser(msg.from.id);

			let text = translate("links_header_message");
			if (user.imgur.quickplay.link)
				text += translate("links_quickplay_message", {link: user.imgur.quickplay.link});
			if (user.imgur.competitive.link)
				text += translate("links_competitive_message", {link: user.imgur.competitive.link});

			bot.sendMessage(msg.chat.id, text,
				{
					parse_mode: 'HTML',
					disable_web_page_preview: true
				});
		} catch (error) {
			throwError(error, msg.chat.id);
		}
	}
});

bot.onText(/^\/donate/, async function (msg) {
	await setLocale(msg);
	if (msg.chat.id > 0)
		bot.sendMessage(msg.chat.id, translate("donate_message"), {parse_mode: 'HTML'});
});

// Основной цикл для обработки inline-запросов
bot.on('inline_query', async function (iq) {
	try {
		const answer = await inline.init(iq.from.id);
		bot.answerInlineQuery(iq.id, answer, {is_personal: true});
	} catch (error) {
		bot.answerInlineQuery(iq.id, [], {
			switch_pm_text: 'Ты не сгенерировал изображения.',
			switch_pm_parameter: 'inline',
			is_personal: true
		})
	}
});

bot.on('message', function (msg) {
	console.log(msg);
});

db.initChanges();