const fabric = require('fabric').fabric;
const canvas = fabric.createCanvasForNode(800, 600);
const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');

module.exports.generate = async function(data, pretty_bt, ranks, mode, user_id, chat_id) {
	let stats, moreStats, averageStats, overallStats, heroesPlaytime, heroes;

	if (mode === 'quickplay') {
		stats = data['stats']['quickplay']['overall_stats'];
		moreStats = data['stats']['quickplay']['game_stats'];
		averageStats = data['stats']['quickplay']['average_stats'];
		overallStats = data['stats']['quickplay']['overall_stats'];
		heroesPlaytime = data['heroes']['playtime']['quickplay'];
		heroes = data['heroes']['stats']['competitive'];
	} else if (mode === 'competitive') {
		stats = data['stats']['competitive']['overall_stats'];
		moreStats = data['stats']['competitive']['game_stats'];
		averageStats = data['stats']['competitive']['average_stats'];
		overallStats = data['stats']['competitive']['overall_stats'];
		heroesPlaytime = data['heroes']['playtime']['competitive'];
		heroes = data['heroes']['stats']['competitive'];
	}

	let level = stats['level'];
	if (typeof stats['prestige'] === 'number') {
		level += (stats['prestige'] * 100);
	}

	const heroesColors = {
		ana: '#47699e',
		bastion: '#5a724f',
		dva: '#fc78bd',
		genji: '#80fb00',
		hanzo: '#b2a765',
		junkrat: '#f7b216',
		lucio: '#66c516',
		mccree: '#a62626',
		mei: '#459af0',
		mercy: '#faf2ad',
		orisa: '#438a41',
		pharah: '#0056bc',
		reaper: '#5d0016',
		reinhardt: '#7c8a8b',
		roadhog: '#ad6e16',
		soldier76: '#425175',
		sombra: '#4f26a9',
		symmetra: '#76b4c8',
		torbjorn: '#ba4b3d',
		tracer: '#de7900',
		widowmaker: '#8a3d8f',
		winston: '#8f92ad',
		zarya: '#f65da6',
		zenyatta: '#fcee5a'
	};

	const heroesArr = Object.keys(heroesPlaytime).map(function (key) {
		return {
			name: key,
			timePlayed: heroesPlaytime[key]
		}
	});

	heroesArr.sort(function (a, b) {
		return b.timePlayed - a.timePlayed
	});

	// Подключение шрифта
	const bignoodle_ot = opentype.loadSync('fonts/BigNoodleToo.ttf');
	const bignoodle_italic_ot = opentype.loadSync('fonts/BigNoodleTooOblique.ttf');
	const futura_ot = opentype.loadSync('fonts/FuturaPTBold.ttf');

	const bignoodle = new canvas.Font('BigNoodleToo', __dirname + '/fonts/BigNoodleToo.ttf');
	const bignoodle_italic = new canvas.Font('BigNoodleTooOblique', __dirname + '/fonts/BigNoodleTooOblique.ttf');
	const futura =  new canvas.Font('Futura', __dirname + '/fonts/FuturaPTBold.ttf');

	// Включение шрифта
	canvas.contextContainer.addFont(bignoodle);
	canvas.contextContainer.addFont(bignoodle_italic);
	canvas.contextContainer.addFont(futura);

	// Обводка и белый фон

	let outline = new fabric.Rect({
		width: canvas.width,
		height: canvas.height
	});

	outline.setGradient('fill', {
		x2: outline.width,
		colorStops: {
			0:    heroesColors[heroesArr[0].name],
			0.25: heroesColors[heroesArr[1].name],
			0.5:  heroesColors[heroesArr[2].name],
			0.75: heroesColors[heroesArr[3].name],
			1:    heroesColors[heroesArr[4].name]
		}
	});

	canvas.add(outline);

	const background = new fabric.Rect({
		left: 10, top: 10,
		fill: 'white',
		init: function () {
			this.width = outline.width - this.left * 2;
			this.height = outline.height - this.top * 2;
			return this;
		}
	}.init());

	canvas.add(background);

	// Battletag и уровень/ранк

	const battletag = new fabric.Text(pretty_bt, {
		left: 20, top: 20,
		fill: '#555',
		fontFamily: 'BigNoodleTooOblique',
		fontSize: 50
	});

	canvas.add(battletag);

	let tempValue = 0;
	if (mode === 'quickplay')
		tempValue = level.toString();
	else if (mode === 'competitive')
		tempValue = stats.comprank.toString();

	const rank_width = bignoodle_ot.getAdvanceWidth(tempValue, 50);

	const value = new fabric.Text(tempValue, {
		left: canvas.width - rank_width - 25,
		top: 20,
		fill: 'white',
		fontFamily: 'BigNoodleToo',
		fontSize: 50
	});

	const rect = new fabric.Rect({
		init: function () {
			if (mode === 'quickplay')
				this.fill = '#a35435';
			else if (mode === 'competitive')
				this.fill = '#7749a9';
			this.left = canvas.width - this.width - 20;
			return this;
		},
		top: value.top,
		width: rank_width + 10,
		height: value.height - 5,
	}.init());

	canvas.add(rect);
	canvas.add(value);

	// Картинки героев

	for (let i = 0; i < 5; i++) {
		function addImage() {
			return new Promise(function (resolve) {
				fabric.Image.fromURL(`images/heroes/${heroesArr[i].name}.png`, function (img) {
					img.set({
						left: 20 + 155 * i,
						top: 80,
						width: 140,
						height: 240
					});

					const background = new fabric.Rect({
						left: img.left,
						top: img.top,
						width: img.width,
						height: img.height,
						fill: '#ccc'
					});

					const panel = new fabric.Rect({
						left: img.left - 1,
						top: img.top + 200,
						width: img.width + 1,
						height: img.height - 200,
						fill: heroesColors[heroesArr[i].name]
					});

					let timeColor;

					const regexp = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(heroesColors[heroesArr[i].name]);
					const result = {
						r: parseInt(regexp[1], 16),
						g: parseInt(regexp[2], 16),
						b: parseInt(regexp[3], 16)
					};

					const brightness = Math.sqrt(
						result.r * result.r * 0.241 +
						result.g * result.g * 0.691 +
						result.b * result.b * 0.068
					);

					if (brightness > 220)
						timeColor = '#999';
					else
						timeColor = 'white';

					let timeTemp;
					if (heroesArr[i].timePlayed < 1)
						timeTemp = `${heroesArr[i].timePlayed * 60}M`;
					else
						timeTemp = `${heroesArr[i].timePlayed.toFixed()}H`;

					const timePlayed = new fabric.Text(timeTemp, {
						left: img.left + img.width - 10 - bignoodle_ot.getAdvanceWidth(timeTemp, 30),
						top: img.top + img.height - 35,
						fill: timeColor,
						fontFamily: 'BigNoodleToo',
						fontSize: 30
					});

					canvas.add(background);
					canvas.add(img);
					canvas.add(panel);
					canvas.add(timePlayed);

					resolve();
				});
			});
		}
		await addImage();
	}

	// Статы

	let tempStats;
	if (mode === 'quickplay')
		tempStats = [
			{
				key: ranks[0].name,
				value: averageStats['damage_done_avg'],
				rank: `${ranks[0].rank}%`
			},
			{
				key: ranks[1].name,
				value: averageStats['deaths_avg'],
				rank: `${ranks[1].rank}%`
			},
			{
				key: ranks[2].name,
				value: averageStats['eliminations_avg'],
				rank: `${ranks[2].rank}%`
			},
			{
				key: ranks[3].name,
				value: averageStats['final_blows_avg'],
				rank: `${ranks[3].rank}%`
			},
			{
				key: ranks[4].name,
				value: averageStats['healing_done_avg'],
				rank: `${ranks[4].rank}%`
			},
			{
				key: ranks[5].name,
				value: averageStats['melee_final_blows_avg'],
				rank: `${ranks[5].rank}%`
			},
			{
				key: ranks[6].name,
				value: averageStats['objective_kills_avg'],
				rank: `${ranks[6].rank}%`
			},
			{
				key: ranks[7].name,
				value: hoursToTime(averageStats['objective_time_avg']),
				rank: `${ranks[7].rank}%`
			},
			{
				key: ranks[8].name,
				value: averageStats['solo_kills_avg'],
				rank: `${ranks[8].rank}%`
			},
			{
				key: ranks[9].name,
				value: hoursToTime(averageStats['time_spent_on_fire_avg']),
				rank: `${ranks[9].rank}%`
			}
		];
	else if (mode === 'competitive')
		tempStats = [
			{
				key: ranks[0].name,
				value: averageStats['damage_done_avg'],
				rank: `${ranks[0].rank}%`
			},
			{
				key: ranks[1].name,
				value: averageStats['deaths_avg'],
				rank: `${ranks[1].rank}%`
			},
			{
				key: ranks[2].name,
				value: averageStats['eliminations_avg'],
				rank: `${ranks[2].rank}%`
			},
			{
				key: ranks[3].name,
				value: averageStats['final_blows_avg'],
				rank: `${ranks[3].rank}%`
			},
			{
				key: ranks[4].name,
				value: averageStats['objective_kills_avg'],
				rank: `${ranks[4].rank}%`
			},
			{
				key: ranks[5].name,
				value: hoursToTime(averageStats['objective_time_avg']),
				rank: `${ranks[5].rank}%`
			},
			{
				key: ranks[6].name,
				value: averageStats['solo_kills_avg'],
				rank: `${ranks[6].rank}%`
			},
			{
				key: ranks[7].name,
				value: hoursToTime(averageStats['time_spent_on_fire_avg']),
				rank: `${ranks[7].rank}%`
			},
			{
				key: ranks[8].name,
				value: moreStats['kpd'],
				rank: `${ranks[8].rank}%`
			},
			{
				key: ranks[9].name,
				value: overallStats['win_rate'],
				rank: `${ranks[9].rank}%`
			}
		];

	// First group

	const line0 = new fabric.Rect({
		width: canvas.width - 40,
		height: 1,
		left: 20,
		top: 355
	});

	const line1 = new fabric.Rect({
		width: canvas.width - 40,
		height: 1,
		left: 20,
		top: 405
	});

	// Second group

	const line2 = new fabric.Rect({
		width: canvas.width - 40,
		height: 1,
		left: 20,
		top: 485
	});

	const line3 = new fabric.Rect({
		width: canvas.width - 40,
		height: 1,
		left: 20,
		top: 535
	});

	canvas.add(line0);
	canvas.add(line1);
	canvas.add(line2);
	canvas.add(line3);

	for (let column = 0; column < tempStats.length / 2; column++) {
		// First group

		const key0 = new fabric.Text(tempStats[column].key, {
			left: 20 + 155 * column,
			top: 330 + 100 * 0,
			fill: 'grey',
			fontFamily: 'BigNoodleToo',
			fontSize: 20
		});

		const value0 = new fabric.Text(tempStats[column].value.toString(), {
			left: 20 + 155 * column,
			top: 355 + 100 * 0,
			fill: '#555',
			fontFamily: 'BigNoodleTooOblique',
			fontSize: 50
		});

		const rank0 = new fabric.Text(tempStats[column].rank.toString(), {
			left: 20 + 155 * column,
			top: 410 + 100 * 0,
			fill: 'grey',
			fontFamily: 'BigNoodleToo',
			fontSize: 30
		});

		// Second group

		const key1 = new fabric.Text(tempStats[column + 5].key, {
			left: 20 + 155 * column,
			top: 360 + 100 * 1,
			fill: 'grey',
			fontFamily: 'BigNoodleToo',
			fontSize: 20
		});

		const value1 = new fabric.Text(tempStats[column + 5].value.toString(), {
			left: 20 + 155 * column,
			top: 385 + 100 * 1,
			fill: '#555',
			fontFamily: 'BigNoodleTooOblique',
			fontSize: 50
		});

		const rank1 = new fabric.Text(tempStats[column + 5].rank, {
			left: 20 + 155 * column,
			top: 440 + 100 * 1,
			fill: 'grey',
			fontFamily: 'BigNoodleToo',
			fontSize: 30
		});

		canvas.add(key0);
		canvas.add(value0);
		canvas.add(rank0);

		canvas.add(key1);
		canvas.add(value1);
		canvas.add(rank1);
	}

	const stream = canvas.createPNGStream();
	let temp = [];

	stream.on('data', function (chunk) {
		temp.push(chunk);
	});

	stream.on('end', function () {
		const buffer = Buffer.concat(temp);
		bot.sendPhoto(chat_id, buffer)
			.then(function (status) {
				let quickplay_file_id, competitive_file_id;
				if (mode === 'quickplay')
					quickplay_file_id = status.photo[status.photo.length - 1].file_id;
				else if (mode === 'competitive')
					competitive_file_id = status.photo[status.photo.length - 1].file_id;
				r.db('overwatch').table('users').get(user_id)
					.update({
						quickplay_file_id: quickplay_file_id,
						competitive_file_id: competitive_file_id,
						file_date: r.now()
					})

					.then(function (status) {
						console.log(status);
					})

					.catch(function (error) {
						console.warn(error.message);
						bot.sendMessage(msg.chat.id,
							`Что-то пошло не так...\n<code>${error.message.split('\n')[0] + ' ...'}</code>`, opts);
					})
			})

			.catch(function (error) {
				bot.sendMessage(msg.chat.id,
					`Что-то пошло не так...\n<code>${error.message.split('\n')[0] + ' ...'}</code>`, opts);
				});
	});
};