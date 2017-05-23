/**
 * Created by savely on 15.04.2017.
 */
require('console-stamp')(console, { pattern: 'HH:MM:ss.l'});

global.config = require('./config');
global.parse_html = {parse_mode:'HTML'};

const image = require('./image');
const TelegramBot = require('node-telegram-bot-api');

global.r = require('rethinkdbdash')({
	db: 'overwatch',
	servers: [
		{host: '192.168.1.2', port: 28015}
	]
});

global.R = require('ramda');
global.bot = new TelegramBot(config.private.token, {
	webHook: {
		port: 5001
	}
});

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
	bot.sendMessage(id,
		`Что-то пошло не так...\n<code>${error.message.split('\n')[0] + ' ...'}</code>`, parse_html);
};

require('./inline')();

bot.onText(/^\/start/i, async function (msg) {
	const msg_status = await bot.sendMessage(msg.chat.id, 'Используйте /help, если не знаете что делать.', parse_html);

	if (msg.chat.id < 0)
		setTimeout(function () {
			bot.deleteMessage(msg.chat.id, msg.message_id);
			bot.deleteMessage(msg_status.chat.id, msg_status.message_id);
		}, 10000);
});

bot.onText(/^\/help/i, async function (msg) {
	const msg_status = await bot.sendMessage(msg.chat.id,
		'<b>OverStats 2.0</b> <code>by @kraso</code>\n\n' +
		'/guide - Инструкция по использованию!\n\n' +
		'/save <b>Example#1337 eu</b> - Сохраняет ваш актуальный профиль в базу c регионом Europe. Доступные варианты: ' +
		'<code>eu</code>, <code>us</code>, <code>kr</code>, <code>psn</code>, <code>xbl</code>\n' +
		'/update - Обновляет имеющийся профиль в базе до актуального\n' +
		'/delete - Полностью удаляет профиль и любую информацию из базы\n\n' +
		'/generate - Генерирует два изображения с вашей статистикой относительно других игроков, использующих бота\n' +
		'/show <code>[competitive/quickplay]</code> - Отображает эти изображения.\n\n' +
		'<i>[Временно]</i> /winratetop - Топ-10 в Быстрой Игре по винрейту\n' +
		'<i>[Временно]</i> /ratingtop - Топ-10 в Соревновательной Игре по рейтингу', parse_html);

	if (msg.chat.id < 0)
		setTimeout(function () {
			bot.deleteMessage(msg.chat.id, msg.message_id);
			bot.deleteMessage(msg_status.chat.id, msg_status.message_id);
		}, 10000);
});

bot.onText(/^\/guide/i, async function (msg) {
	const msg_status = await bot.sendMessage(msg.chat.id,
		'<b>Как пользоваться ботом</b>\n\n' +
		'1. Сохраняем профиль командой <code>/save</code> или обновляем уже сохраненный командой <code>/update</code>.\n\n' +
		'<i>Например:</i> <code>/save Example#1337 eu</code>.\n' +
		'Данная команда сохранит профиль с Battletag Example#1337 ' +
		'и регионом Europe. Помимо Европы можно указать Америку и Корею (<code>us</code> и <code>kr</code> ' +
		'соответственно). Если вы играете с приставки, то вместо региона нужно указать вашу платформу: ' +
		'<code>psn</code> (PS4) или <code>xbl</code> (Xbox One).\n\n' +
		'2. Генерируем изображения командой <code>/generate</code>. ' +
		'Проследите за тем, чтобы генерация прошла успешно.\n\n' +
		'3. Отображаем сгенерированные изображения, используя один из методов:\n\n' +
		'— Используйте inline-режим аналогичный ботам @gif, @vote, @like и другим.\n' +
		'— Используйте команду <code>/show [competitive/quickplay]</code>.\n\n' +
		'<i>Например:</i> <code>/show quickplay</code>.\n' +
		'Данная команда отобразит статистику по быстрой игре.\n\n' +
		'<b>Справка:</b> Процентное значение на изображении означает то, сколько игроков находятся выше вас. ' +
		'Например, если указано 25%, то это значит, что в боте зарегистрировано ещё 25% процентов игроков, которые имеют ' +
		'указанную характеристику, лучше чем у вас.\n\n' +
		'По всем вопросам пишите <a href="https://t.me/kraso">мне</a>.',
		{
			parse_mode: 'HTML',
			disable_web_page_preview: true
		});

	if (msg.chat.id < 0)
		setTimeout(function () {
			bot.deleteMessage(msg.chat.id, msg.message_id);
			bot.deleteMessage(msg_status.chat.id, msg_status.message_id);
		}, 10000);
});

bot.onText(/^\/save (.+)\s(.+)|^\/save/i, async function (msg, match) {
	let pretty_bt, battletag, platform, param, msg_status;

	if (match[1] === undefined || match[2] === undefined)
		msg_status = await bot.sendMessage(msg.chat.id, 'Пример: <code>/save Example#1337 eu</code>\n' +
			'Доступные варианты: ' +
			'<code>eu</code>, <code>us</code>, <code>kr</code>, <code>psn</code>, <code>xbl</code>', parse_html);
	else {
		msg_status = await bot.sendMessage(msg.chat.id, 'Пожалуйста подождите, идет сохранение...');
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
					battletag: battletag,
					pretty_bt: pretty_bt,
					platform: platform,
					param: param,
					profile: r.http(`https://owapi.net/api/v3/u/${encodeURIComponent(battletag)}/blob`,
						{
							params: {
								platform: platform
							}
						}
					)(param),
					profile_date: r.now(),
					lang: 'ru'
				},
				{conflict: 'update'}
			)
			.then(function (status) {
				console.log(status);
				bot.editMessageText('Сохранено!', { message_id: msg_status.message_id, chat_id: msg.chat.id });
			})
			.catch(function (error) {
				console.log(error.message);
				bot.editMessageText(`Что-то пошло не так...\n<code>${error.message.split('\n')[0] + ' ...'}</code>`,
					{message_id: msg_status.message_id, chat_id: msg.chat.id, parse_mode: 'HTML'});
			});
	}

	if (msg.chat.id < 0)
		setTimeout(function () {
			bot.deleteMessage(msg.chat.id, msg.message_id);
			bot.deleteMessage(msg_status.chat.id, msg_status.message_id);
		}, 10000);
});

bot.onText(/^\/update/i, async function (msg) {
	const msg_status = await bot.sendMessage(msg.chat.id, 'Пожалуйста подождите, идет обновление...');
	const user = await r.table('users').get(msg.from.id);

	let profile;
	try {
		profile = await r.http(`https://owapi.net/api/v3/u/${encodeURIComponent(user.battletag)}/blob`,
			{params: {platform: user.platform}})(user.param);
	} catch(error) {
		profile = null;

		console.warn(error.message);
		bot.editMessageText(`Что-то пошло не так...\n<code>${error.message.split('\n')[0] + ' ...'}</code>`,
			{message_id: msg_status.message_id, chat_id: msg.chat.id, parse_mode: 'HTML'});
	}


	r.table('users').get(msg.from.id)
		.update(
			// Условие
			r.branch(
				// Если профиль не null -- сохраняем, если null -- ничего не делаем.
				profile,
				{
					username: msg.from.username,
					profile: profile,
					profile_date: r.now()
				},
				{}
			)
		)

		.then(function (status) {
			console.log(status);
			if (status.replaced !== 0)
				bot.editMessageText('Обновлено!',
					{ message_id: msg_status.message_id, chat_id: msg.chat.id });
			if (status.skipped !== 0)
				bot.editMessageText('Изменения не внесены!',
					{ message_id: msg_status.message_id, chat_id: msg.chat.id });
		})

		.catch(function (error) {
			console.warn(error.message);
			bot.editMessageText(`Что-то пошло не так...\n<code>${error.message.split('\n')[0] + ' ...'}</code>`,
				{message_id: msg_status.message_id, chat_id: msg.chat.id, parse_mode: 'HTML'});
		});

	if (msg.chat.id < 0)
		setTimeout(function () {
			bot.deleteMessage(msg.chat.id, msg.message_id);
			bot.deleteMessage(msg_status.chat.id, msg_status.message_id);
		}, 10000);
});

bot.onText(/^\/delete/i, function (msg) {
	let msg_status;

	r.table('users').get(msg.from.id)
		.delete()

		.then(async function (status) {
			console.log(status);
			if (status.deleted !== 0)
				msg_status = await bot.sendMessage(msg.chat.id, 'Удалено!');
			if (status.skipped !== 0)
				msg_status = await bot.sendMessage(msg.chat.id, 'Нечего удалять.');
		})

		.catch(async function (error) {
			console.warn(error.message);
			msg_status = await bot.sendMessage(msg.chat.id,
				`Что-то пошло не так...\n<code>${error.message.split('\n')[0] + ' ...'}</code>` + ' ...', parse_html);
		});

	if (msg.chat.id < 0)
		setTimeout(function () {
			bot.deleteMessage(msg.chat.id, msg.message_id);
			bot.deleteMessage(msg_status.chat.id, msg_status.message_id);
		}, 10000);
});

bot.onText(/^\/winratetop/i, function (msg) {
	let msg_status;

	r.table('users')
		.orderBy(r.desc(r.row('profile')('stats')('quickplay')('overall_stats')('win_rate')))
		.limit(10)
		.then(async function (users) {
			let top = '<b>Топ-10 по винрейту в Быстрой Игре</b>:\n';
			for (let i in users) {
				if (users.hasOwnProperty(i)) {
					if (users[i].profile !== undefined) {
						if (users[i].username !== undefined)
							top += `${parseInt(i) + 1}. ${users[i].pretty_bt} (<code>@${users[i].username}</code>): ${users[i].profile.stats.quickplay.overall_stats.win_rate}%\n`;
						else
							top += `${parseInt(i) + 1}. ${users[i].pretty_bt}: ${users[i].profile.stats.quickplay.overall_stats.win_rate}%\n`
					}
				}
			}
			await bot.sendMessage(msg.chat.id, top, parse_html);
		});

	if (msg.chat.id < 0)
		setTimeout(function () {
			bot.deleteMessage(msg.chat.id, msg.message_id);
			bot.deleteMessage(msg_status.chat.id, msg_status.message_id);
		}, 10000);
});

bot.onText(/^\/ratingtop/i, function (msg) {
	let msg_status;

	r.table('users')
		.orderBy(r.desc(r.row('profile')('stats')('competitive')('overall_stats')('comprank')))
		.limit(10)
		.then(async function (users) {
			let top = '<b>Топ-10 по рейтингу в Соревновательной Игре</b>:\n';
			for (let i in users) {
				if (users.hasOwnProperty(i)) {
					if (users[i].profile !== undefined) {
						if (users[i].username !== undefined)
							top += `${parseInt(i) + 1}. ${users[i].pretty_bt} (<code>@${users[i].username}</code>): ${users[i].profile.stats.competitive.overall_stats.comprank}\n`;
						else
							top += `${parseInt(i) + 1}. ${users[i].pretty_bt}: ${users[i].profile.stats.competitive.overall_stats.comprank}\n`
					}
				}
			}
			msg_status = bot.sendMessage(msg.chat.id, top, parse_html);
		});

	if (msg.chat.id < 0)
		setTimeout(function () {
			bot.deleteMessage(msg.chat.id, msg.message_id);
			bot.deleteMessage(msg_status.chat.id, msg_status.message_id);
		}, 10000);
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
	const id = msg.from.id;
	const user = await r.table('users').get(id);

	const competitiveRanks = [
		getCompetitiveRank(id, 'damage_done_avg', 'НАНЕСЕНО УРОНА'),
		getCompetitiveRank(id, 'deaths_avg', 'СМЕРТЕЙ', undefined, true),
		getCompetitiveRank(id, 'eliminations_avg', 'УБИЙСТВ'),
		getCompetitiveRank(id, 'final_blows_avg', 'СМЕРТЕЛЬНЫХ УДАРОВ'),
		getCompetitiveRank(id, 'healing_done_avg', 'ОБЪЕМ ИСЦЕЛЕНИЯ'),
		getCompetitiveRank(id, 'melee_final_blows_avg', 'СМЕРТ. УДАРОВ В РУКОП.'),
		getCompetitiveRank(id, 'objective_kills_avg', 'УБИЙСТВ У ОБЪЕКТОВ'),
		getCompetitiveRank(id, 'objective_time_avg', 'ВЫПОЛНЕНИЕ ЗАДАЧ'),
		getCompetitiveRank(id, 'solo_kills_avg', 'ОДИНОЧНЫХ УБИЙСТВ'),
		getCompetitiveRank(id, 'time_spent_on_fire_avg', 'ВРЕМЯ В УДАРЕ'),
		'competitive'
	];

	const quickplayRanks = [
		//getHeroQuickplayRank(id, 'damage_blocked_average', 'УРОНА ЗАБЛОКИРОВАНО', 'dva'),
		getQuickplayRank(id, 'damage_done_avg', 'НАНЕСЕНО УРОНА'),
		getQuickplayRank(id, 'deaths_avg', 'СМЕРТЕЙ', undefined, true),
		getQuickplayRank(id, 'eliminations_avg', 'УБИЙСТВ'),
		getQuickplayRank(id, 'final_blows_avg', 'СМЕРТЕЛЬНЫХ УДАРОВ'),
		getQuickplayRank(id, 'objective_kills_avg', 'УБИЙСТВ У ОБЪЕКТОВ'),
		getQuickplayRank(id, 'objective_time_avg', 'ВЫПОЛНЕНИЕ ЗАДАЧ'),
		getQuickplayRank(id, 'solo_kills_avg', 'ОДИНОЧНЫХ УБИЙСТВ'),
		getQuickplayRank(id, 'time_spent_on_fire_avg', 'ВРЕМЯ В УДАРЕ'),
		getQuickplayRank(id, 'kpd', 'УБИЙСТВ/СМЕРТЕЙ', 'game_stats'),
		getQuickplayRank(id, 'win_rate', 'ВИНРЕЙТ, %', 'overall_stats'),
		'quickplay'
	];

	const msg_status = await bot.sendMessage(msg.chat.id, 'Пожалуйста подождите, идет генерация...');

	let competitive, quickplay, tempRanks = [];

	try {
		competitive = await Promise.all(competitiveRanks);
		tempRanks.push(competitive);
	} catch(error) {
		console.warn(error.message);
	}

	try {
		quickplay = await Promise.all(quickplayRanks);
		tempRanks.push(quickplay);
	} catch(error) {
		console.warn(error.message);
	}

	let text = 'Процесс генерации:\n<pre>';
	const startTotal = new Date().getTime();
	for (let i in tempRanks) {
		if (tempRanks.hasOwnProperty(i)) {
			const startCycle = new Date().getTime();
			try {
				await image.generate(user.profile, user.pretty_bt, tempRanks[i], msg.from.id, msg.chat.id);
				text += `${(new Date().getTime()) - startCycle} ms: ${tempRanks[i][tempRanks[i].length - 1]} done!️\n`;
			} catch (error) {
				console.warn(error.message);
				text += `${(new Date().getTime()) - startCycle} ms: ${tempRanks[i][tempRanks[i].length - 1]} failed!\n`;
			}
			await bot.editMessageText(`${text}Total: ${(new Date().getTime()) - startTotal} ms</pre>`,
				{message_id: msg_status.message_id, chat_id: msg.chat.id, parse_mode: 'HTML'});
		}
	}

	if (msg.chat.id < 0)
		setTimeout(function () {
			bot.deleteMessage(msg.chat.id, msg.message_id);
			bot.deleteMessage(msg_status.chat.id, msg_status.message_id);
		}, 10000);
});

bot.onText(/^\/show (.+)|^\/show/i, async function (msg, match) {
	let msg_status;

	if (match[1] === undefined)
		bot.sendMessage(msg.chat.id, 'Пример: <code>/show competitive</code>\n' +
			'Доступные параметры: ' +
			'<code>quickplay</code>, <code>competitive</code>', parse_html);
	else {
		r.table('users')
			.get(msg.from.id)

			.then(async function (profile) {
				if (profile !== null
					&& profile.imgur_quickplay_link !== null
					&& profile.imgur_competitive_link !== null) {

					let link;
					if (match[1] === 'quickplay')
						link = profile.imgur_quickplay_link;
					else if (match[1] === 'competitive')
						link = profile.imgur_competitive_link;

					msg_status = await bot.sendPhoto(msg.chat.id, link)
						.catch(function (error) {
							throwError(error, msg.chat.id);
						});
				} else
					msg_status = await bot.sendMessage(msg.chat.id, 'Изображения не сгенерированы! /guide');
			})

			.catch(function (error) {
				throwError(error, msg.chat.id);
			});
	}

	if (msg.chat.id < 0)
		setTimeout(function () {
			bot.deleteMessage(msg.chat.id, msg.message_id);
			bot.deleteMessage(msg_status.chat.id, msg_status.message_id);
		}, 10000);
});

bot.onText(/^\/links/, function (msg) {
	let msg_status;

	r.table('users').get(msg.from.id)
		.then(async function (res) {
			let text = '<b>Ссылки на Imgur</b>:\n';
			if (res.imgur_quickplay_link !== undefined)
				text += `Быстрая: ${res.imgur_quickplay_link}\n`;
			if (res.imgur_competitive_link !== undefined)
				text += `Соревновательная: ${res.imgur_competitive_link}\n`;

			msg_status = await bot.sendMessage(msg.chat.id, text,
				{
					parse_mode: 'HTML',
					disable_web_page_preview: true
				})
		});

	if (msg.chat.id < 0)
		setTimeout(function () {
			bot.deleteMessage(msg.chat.id, msg.message_id);
			bot.deleteMessage(msg_status.chat.id, msg_status.message_id);
		}, 10000);
});

bot.on('message', function (msg) {
	console.log(msg);
});
