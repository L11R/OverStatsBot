const fabric = require('fabric').fabric;
const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');
const imgur = require('imgur');
const Gradient = require('gradient');

imgur.setClientId(config.private.imgur_client_id);

module.exports.generate = async function(data, pretty_bt, input, user_id, chat_id) {
	const canvas = fabric.createCanvasForNode(800, 600);
	const mode = input.mode;
	const ranks = input.ranks;

	console.log('Stats preparing!');
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
		doomfist: 'TEMP',
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

	console.log('Fonts activating!');
	// Fonts plug in
	const bignoodle_ot = opentype.loadSync('fonts/BigNoodleToo.ttf');
	const bignoodle_italic_ot = opentype.loadSync('fonts/BigNoodleTooOblique.ttf');
	const futura_ot = opentype.loadSync('fonts/FuturaPTBold.ttf');

	// Linux
	//const bignoodle = new canvas.Font('BigNoodleToo.ttf', __dirname + '/fonts/BigNoodleToo.ttf');
	//const bignoodle_italic = new canvas.Font('BigNoodleTooOblique.ttf', __dirname + '/fonts/BigNoodleTooOblique.ttf');
	//const futura =  new canvas.Font('FuturaPTBold.ttf', __dirname + '/fonts/FuturaPTBold.ttf');

	// Windows
	const bignoodle = new canvas.Font('BigNoodleToo', __dirname + '/fonts/BigNoodleToo.ttf');
	const bignoodle_italic = new canvas.Font('BigNoodleTooOblique', __dirname + '/fonts/BigNoodleTooOblique.ttf');
	const futura =  new canvas.Font('FuturaPTBold', __dirname + '/fonts/FuturaPTBold.ttf');

	// Fonts activating
	canvas.contextContainer.addFont(bignoodle);
	canvas.contextContainer.addFont(bignoodle_italic);
	canvas.contextContainer.addFont(futura);

	console.log('Image generation started!');

	// Background with heroes colors gradient
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

	// White background
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

	// Battletag and level/rank
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
		if (stats.comprank === null)
			tempValue = 'НЕИЗВЕСТНО';
		else
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

	// Heroes pics
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

					if (brightness > 200)
						timeColor = '#999';
					else
						timeColor = 'white';

					let timeTemp;
					if (heroesArr[i].timePlayed < 1)
						timeTemp = `${(heroesArr[i].timePlayed * 60).toFixed()}M`;
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

	// Stats
	const splitedRanks = R.splitEvery(5, ranks);
	const grad = Gradient(['#dd0000', '#dddd00', '#00dd00'], 100);
	const colors = grad.toArray('hexString');

	for (let raw in splitedRanks) {
		// First group
		const line1 = new fabric.Rect({
			width: canvas.width - 40,
			height: 1,
			left: 20,
			top: 355 + 130 * raw
		});

		const line2 = new fabric.Rect({
			width: canvas.width - 40,
			height: 1,
			left: 20,
			top: 405 + 130 * raw
		});

		canvas.add(line1);
		canvas.add(line2);

		for (let column in splitedRanks[raw]) {
			const name = new fabric.Text(splitedRanks[raw][column].name, {
				left: 20 + 155 * column,
				top: 330 + 130 * raw,
				fill: 'grey',
				fontFamily: 'BigNoodleToo',
				fontSize: 20
			});

			const value = new fabric.Text(splitedRanks[raw][column].value.toString(), {
				left: 20 + 155 * column,
				top: 355 + 130 * raw,
				fill: '#555',
				fontFamily: 'BigNoodleTooOblique',
				fontSize: 50
			});

			const rank = new fabric.Text(splitedRanks[raw][column].rank, {
				left: 20 + 155 * column,
				top: 410 + 130 * raw,
				fill: 'grey',
				fontFamily: 'BigNoodleToo',
				fontSize: 25
			});

			const rankBar = new fabric.Rect({
				left: 20 + 155 * column,
				top: 440 + 130 * raw,
				width: 140 - (parseInt(splitedRanks[raw][column].rank, 10) / 100 * 140),
				height: 4,
				fill: colors[100 - parseInt(splitedRanks[raw][column].rank, 10)]
			});

			const rankBarBackground = new fabric.Rect({
				left: 20 + 155 * column,
				top: 440 + 130 * raw,
				width: 140,
				height: 4,
				fill: 'grey'
			});

			canvas.add(name);
			canvas.add(value);
			canvas.add(rank);

			canvas.add(rankBarBackground);
			canvas.add(rankBar);
		}
	}

	console.log('Image generation completed!');
	const stream = canvas.createJPEGStream({
		quality: 90
	});

	console.log('Image rendered!');

	return new Promise(function (resolve, reject) {
		let temp = [];

		console.log('Stream started!');
		stream.on('data', function (chunk) {
			temp.push(chunk);
			console.log('Streaming...');
		});

		stream.on('end', function () {
			// Clean canvas to prevent memory leak!
			canvas.clear();

			// Create image buffer to send it directly to Telegram
			const buffer = Buffer.concat(temp);
			console.log('Stream ended, starting sending!');

			// Getting deletehash from DB and removing image from Imgur (yes, we save their space to keep it free)
			r.table('users').get(user_id).pluck('imgur')
				.then(function (res) {
					if (res.imgur !== undefined) {
						if (mode === 'quickplay' && res.imgur.quickplay.deletehash !== undefined)
							return imgur.deleteImage(res.imgur.quickplay.deletehash);
						else if (mode === 'competitive' && res.imgur.competitive.deletehash !== undefined)
							return imgur.deleteImage(res.imgur.competitive.deletehash);
					} else
						return 'First generation!';
				})

				.then(function(status) {
					console.log(status);
					// Uploading new image and saving link and deletehash
					return imgur.uploadBase64(buffer.toString('base64'))
				})

				.then(function (res) {
					console.log(res);
					let data = {};
					data.quickplay = {};
					data.competitive = {};

					if (mode === 'quickplay') {
						data.quickplay.link = res.data.link;
						data.quickplay.deletehash = res.data.deletehash;
					} else if (mode === 'competitive') {
						data.competitive.link = res.data.link;
						data.competitive.deletehash = res.data.deletehash;
					}

					return r.table('users').get(user_id)
						.update({
							imgur: data
						});
				})

				.then(function (status) {
					console.log(status);
					resolve(status);
				})

				.catch(function (error) {
					reject(error);
				});
		});
	});
};
