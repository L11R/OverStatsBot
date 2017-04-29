/**
 * Created by savely on 15.04.2017.
 */
const image = require('./image');
const TelegramBot = require('node-telegram-bot-api');
const token = '310312986:AAGY8_okTSptA2eD4chZ0KX_pFRblbnr5Nw';

global.r = require('rethinkdbdash')();
global.R = require('ramda');
global.bot = new TelegramBot(token, { polling: true });
global.opts = {parse_mode: 'HTML'};

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

bot.onText(/^\/start/, function (msg) {
	bot.sendMessage(msg.chat.id, 'Используйте /help, если не знаете что делать.', opts);
});

bot.onText(/^\/help/, function (msg) {
	bot.sendMessage(msg.chat.id,
		'<b>OverStats 2.0</b> <code>by @kraso</code>\n\n' +
		'/save <b>Example#1337 eu</b> - Сохраняет ваш профиль в базу c регионом Europe. Доступные варианты: ' +
		'<code>eu</code>, <code>us</code>, <code>kr</code>, <code>psn</code>, <code>xbl</code>\n' +
		'/update - Обновляет имеющийся профиль в базе до актуального\n' +
		'/delete - Полностью удаляет профиль и любую информацию из базы\n' +
		'/generate <code>[quickplay/competitive]</code> - Генерирует изображение с вашей статистикой относительно других игроков, использующих бота\n' +
		'/cache <code>[quickplay/competitive]</code> - Тоже самое изображение, но из кэша\n' +
		'<i>[Временно]</i> /winratetop - Топ-10 в Быстрой Игре по винрейту\n' +
		'<i>[Временно]</i> /ratingtop - Топ-10 в Соревновательной Игре по рейтингу\n', opts);
});

bot.onText(/^\/save (.+)\s(.+)|^\/save/, function (msg, match) {
	let pretty_bt, battletag, platform, param;

	if (match[1] === undefined || match[2] === undefined)
		bot.sendMessage(msg.chat.id, 'Пример: <code>/save Example#1337 eu</code>\n' +
			'Доступные варианты: ' +
			'<code>eu</code>, <code>us</code>, <code>kr</code>, <code>psn</code>, <code>xbl</code>', opts);
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

		r.db('overwatch').table('users')
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
				bot.sendMessage(msg.chat.id, 'Сохранено.');
			})
			.catch(function (error) {
				console.log(error.message);
				bot.sendMessage(msg.chat.id,
					`Что-то пошло не так...\n<code>${error.message.split('\n')[0] + ' ...'}</code>`, opts);
			});
	}
});

bot.onText(/^\/update/, async function (msg) {
	const user = await r.db('overwatch').table('users').get(msg.from.id);

	let profile;
	try {
		profile = await r.http(`https://owapi.net/api/v3/u/${encodeURIComponent(user.battletag)}/blob`,
			{params: {platform: user.platform}})(user.param);
	} catch(error) {
		profile = null;

		console.warn(error.message);
		bot.sendMessage(msg.chat.id,
			`Что-то пошло не так...\n<code>${error.message.split('\n')[0] + ' ...'}</code>`, opts);
	}


	r.db('overwatch').table('users').get(msg.from.id)
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
				bot.sendMessage(msg.chat.id, 'Обновлено.', opts);
			if (status.skipped !== 0)
				bot.sendMessage(msg.chat.id, 'Изменения не внесены!', opts);
		})

		.catch(function (error) {
			console.warn(error.message);
			bot.sendMessage(msg.chat.id,
				`Что-то пошло не так...\n<code>${error.message.split('\n')[0] + ' ...'}</code>`, opts);
		});
});

bot.onText(/^\/delete/, function (msg) {
	r.db('overwatch').table('users').get(msg.from.id)
		.delete()

		.then(function (status) {
			console.log(status);
			if (status.deleted !== 0)
				bot.sendMessage(msg.chat.id, 'Профиль удален.');
			if (status.skipped !== 0)
				bot.sendMessage(msg.chat.id, 'Нечего удалять.');
		})

		.catch(function (error) {
			console.warn(error.message);
			bot.sendMessage(msg.chat.id,
				`Что-то пошло не так...\n<code>${error.message.split('\n')[0] + ' ...'}</code>` + ' ...', opts);
		});
});

bot.onText(/^\/winratetop/, function (msg) {
	r.db('overwatch').table('users')
		.orderBy(r.desc(r.row('profile')('stats')('quickplay')('overall_stats')('win_rate')))
		.limit(10)
		.then(function (users) {
			let top = '<b>Топ-10 по винрейту в Быстрой Игре</b>:\n';
			for (let i in users) {
				if (users[i].profile !== undefined) {
					if (users[i].username !== undefined)
						top += `${parseInt(i) + 1}. ${users[i].pretty_bt} (<code>@${users[i].username}</code>): ${users[i].profile.stats.quickplay.overall_stats.win_rate}%\n`
					else
						top += `${parseInt(i) + 1}. ${users[i].pretty_bt}: ${users[i].profile.stats.quickplay.overall_stats.win_rate}%\n`
				}
			}
			bot.sendMessage(msg.chat.id, top, opts);
		});
});

bot.onText(/^\/ratingtop/, function (msg) {
	r.db('overwatch').table('users')
		.orderBy(r.desc(r.row('profile')('stats')('competitive')('overall_stats')('comprank')))
		.limit(10)
		.then(function (users) {
			let top = '<b>Топ-10 по рейтингу в Соревновательной Игре</b>:\n';
			for (let i in users) {
				if (users[i].profile !== undefined) {
					if (users[i].username !== undefined)
						top += `${parseInt(i) + 1}. ${users[i].pretty_bt} (<code>@${users[i].username}</code>): ${users[i].profile.stats.competitive.overall_stats.comprank}\n`
					else
						top += `${parseInt(i) + 1}. ${users[i].pretty_bt}: ${users[i].profile.stats.competitive.overall_stats.comprank}\n`
				}
			}
			bot.sendMessage(msg.chat.id, top, opts);
		});
});

function getRank(obj) {
	if (obj.asc === undefined)
		obj.asc = false;

	return new Promise(function(resolve, reject) {
		r.expr({
			// Значение поля
			value: r.db('overwatch').table('users').get(obj.id)('profile')('stats')(obj.mode)(obj.statsType)(obj.name),
			// Общее число записей в таблице.
			count: r.db('overwatch').table('users').count(),
			// Позиция в топе по нужному параметру в зависимости от условия по возрастанию или убыванию.
			position: r.branch(
				r.expr(obj.asc).eq(true),
				r.db('overwatch').table('users')
					.orderBy(r.asc(r.row('profile')('stats')(obj.mode)(obj.statsType)(obj.name))),
				r.db('overwatch').table('users')
					.orderBy(r.desc(r.row('profile')('stats')(obj.mode)(obj.statsType)(obj.name)))
			)
				.offsetsOf(r.row('id').eq(obj.id))
				.nth(0)
		})
			.then(function (res) {
				let value;
				if (obj.name.indexOf('time') > -1)
					value = (parseFloat(res.value) * 3600).toFixed();
				else
					value = Number(res.value.toFixed(2));

				const rank = Number((100 - (1 - (res.position / res.count)) * 100).toFixed(2));

				resolve({name: obj.readableName, value: value, rank: rank, count: res.count, position: res.position});
			})
			.catch(function (error) {
				reject(error);
			});
});
}

bot.onText(/^\/generate (.+)|^\/generate/, async function (msg, match) {
	if (match[1] === undefined)
		bot.sendMessage(msg.chat.id, 'Пример: <code>/generate competitive</code>\n' +
			'Доступные параметры: ' +
			'<code>quickplay</code>, <code>competitive</code>', opts);
	else {
		const id = msg.from.id;

		const profile = await r.db('overwatch').table('users').get(id);
		let text = undefined;

		let arrayOfPromises = [];
		if (match[1] === 'quickplay') {
			text = `<b>${profile.pretty_bt}</b>\n`;
			arrayOfPromises	= [
				getRank({id: id, mode: match[1], statsType: 'average_stats',
					name: 'damage_done_avg', readableName: 'НАНЕСЕНО УРОНА'}),
				getRank({id: id, mode: match[1], statsType: 'average_stats',
					name: 'deaths_avg', readableName: 'СМЕРТЕЙ', asc: true}),
				getRank({id: id, mode: match[1], statsType: 'average_stats',
					name: 'eliminations_avg', readableName: 'УБИЙСТВ'}),
				getRank({id: id, mode: match[1], statsType: 'average_stats',
					name: 'final_blows_avg', readableName: 'СМЕРТЕЛЬНЫХ УДАРОВ'}),
				getRank({id: id, mode: match[1], statsType: 'average_stats',
					name: 'healing_done_avg', readableName: 'ОБЪЕМ ИСЦЕЛЕНИЯ'}),
				getRank({id: id, mode: match[1], statsType: 'average_stats',
					name: 'melee_final_blows_avg', readableName: 'СМЕРТ. УДАРОВ В РУКОП.'}),
				getRank({id: id, mode: match[1], statsType: 'average_stats',
					name: 'objective_kills_avg', readableName: 'УБИЙСТВ У ОБЪЕКТОВ'}),
				getRank({id: id, mode: match[1], statsType: 'average_stats',
					name: 'objective_time_avg', readableName: 'ВЫПОЛНЕНИЕ ЗАДАЧ'}),
				getRank({id: id, mode: match[1], statsType: 'average_stats',
					name: 'solo_kills_avg', readableName: 'ОДИНОЧНЫХ УБИЙСТВ'}),
				getRank({id: id, mode: match[1], statsType: 'average_stats',
					name: 'time_spent_on_fire_avg', readableName: 'ВРЕМЯ В УДАРЕ'})
			];
			text += 'Указаны средние значения в Быстрой Игре\n\n';
		} else if (match[1] === 'competitive') {
			text = `<b>${profile.pretty_bt}</b>\n`;
			arrayOfPromises = [
				getRank({id: id, mode: match[1], statsType: 'average_stats',
					name: 'damage_done_avg', readableName: 'НАНЕСЕНО УРОНА'}),
				getRank({id: id, mode: match[1], statsType: 'average_stats',
					name: 'deaths_avg', readableName: 'СМЕРТЕЙ', asc: true}),
				getRank({id: id, mode: match[1], statsType: 'average_stats',
					name: 'eliminations_avg', readableName: 'УБИЙСТВ'}),
				getRank({id: id, mode: match[1], statsType: 'average_stats',
					name: 'final_blows_avg', readableName: 'СМЕРТЕЛЬНЫХ УДАРОВ'}),
				getRank({id: id, mode: match[1], statsType: 'average_stats',
					name: 'objective_kills_avg', readableName: 'УБИЙСТВ У ОБЪЕКТОВ'}),
				getRank({id: id, mode: match[1], statsType: 'average_stats',
					name: 'objective_time_avg', readableName: 'ВЫПОЛНЕНИЕ ЗАДАЧ'}),
				getRank({id: id, mode: match[1], statsType: 'average_stats',
					name: 'solo_kills_avg', readableName: 'ОДИНОЧНЫХ УБИЙСТВ'}),
				getRank({id: id, mode: match[1], statsType: 'average_stats',
					name: 'time_spent_on_fire_avg', readableName: 'ВРЕМЯ В УДАРЕ'}),
				getRank({id: id, mode: match[1], statsType: 'game_stats',
					name: 'kpd', readableName: 'УБИЙСТВ/СМЕРТЕЙ'}),
				getRank({id: id, mode: match[1], statsType: 'overall_stats',
					name: 'win_rate', readableName: 'ВИНРЕЙТ, %'})
			];
			text += 'Указаны средние значения в Соревновательной Игре\n\n';
		}

		Promise.all(arrayOfPromises)
			.then(function (res) {
				r.db('overwatch').table('users').get(msg.from.id)
					.then(async function (user) {
						try {
							const status = await bot.sendMessage(msg.chat.id, 'Пожалуйста подождите, идет генерация...');
							await image.generate(user.profile, user.pretty_bt, res, match[1], msg.from.id, msg.chat.id);
							bot.editMessageText('Готово!', { message_id: status.message_id, chat_id: msg.chat.id })
						} catch (error) {
							console.warn(error.message);
							bot.sendMessage(msg.chat.id,
								`Что-то пошло не так...\n<code>${error.message.split('\n')[0] + ' ...'}</code>`, opts);
						}
					});
			})

			.catch(function (error) {
				console.warn(error.message);
				bot.sendMessage(msg.chat.id,
					`Что-то пошло не так...\n<code>${error.message.split('\n')[0] + ' ...'}</code>`, opts);
			});
	}
});

bot.onText(/^\/cache (.+)|^\/cache/, async function (msg, match) {
	if (match[1] === undefined)
		bot.sendMessage(msg.chat.id, 'Пример: <code>/cache competitive</code>\n' +
			'Доступные параметры: ' +
			'<code>quickplay</code>, <code>competitive</code>', opts);
	else {
		const profile = await r.db('overwatch').table('users').get(msg.from.id);

		let file_id;
		if (match[1] === 'quickplay')
			file_id = profile.quickplay_file_id;
		else if (match[1] === 'competitive')
			file_id = profile.competitive_file_id;

		bot.sendPhoto(msg.chat.id, file_id)
			.catch(function (error) {
				console.warn(error.message);
				bot.sendMessage(msg.chat.id,
					`Что-то пошло не так...\n<code>${error.message.split('\n')[0] + ' ...'}</code>`, opts);
			});
	}
});

bot.on('message', function (msg) {
	//bot.forwardMessage(48756093, msg.chat.id, msg.message_id);
	console.log(msg);
});