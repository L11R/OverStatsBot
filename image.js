const Canvas = require('canvas');
const fs = require('fs');
const path = require('path');

const formatImageStats = function(data, battletag) {
	const stats = data['stats']['competitive']['overall_stats'];
	const moreStats = data['stats']['competitive']['game_stats'];
	const averageStats = data['stats']['competitive']['average_stats'];
	const heroesPlaytime = data['heroes']['playtime']['competitive'];
	const heroes = data['heroes']['stats']['competitive'];

	let level = stats['level'];
	let competitiveStats;

	// Get overall level
	if (typeof stats['prestige'] === 'number') {
		level += (stats['prestige'] * 100);
	}

	var heroesColors = {
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

	const heroesArr = Object.keys(heroesPlaytime).map((key) => ({
		name: key,
		timePlayed: heroesPlaytime[key],
	}));

	heroesArr.sort((a, b) => b.timePlayed - a.timePlayed);

	const image = Canvas.Image;
	const font = Canvas.Font;
	const canvas = new Canvas(1240, 740);
	const ctx = canvas.getContext('2d');

	// Подключение шрифта
	const bignoodle = new font('BigNoodleTooOblique', __dirname + '/../fonts/BigNoodleTooOblique.ttf');
	const futura = new font('Futura', __dirname + '/../fonts/FuturaPTBold.ttf');

	// Включение шрифта
	ctx.addFont(bignoodle);
	ctx.addFont(futura);

	ctx.font = '120px BigNoodleTooOblique';
	const battletagWidth = ctx.measureText(battletag).width;
	ctx.font = '90px BigNoodleTooOblique';
	const rankWidth = ctx.measureText(stats['comprank']).width;
	const levelWidth = ctx.measureText(level).width;

	ctx.fillStyle = "#fff";
	ctx.strokeStyle = getGradient(ctx, ctx.canvas.width, heroesColors[`${heroesArr[0].name}`], heroesColors[`${heroesArr[1].name}`], heroesColors[`${heroesArr[2].name}`], heroesColors[`${heroesArr[3].name}`], heroesColors[`${heroesArr[4].name}`]);
	ctx.lineWidth = 16;

	ctx.rect(8, 8, ctx.canvas.width - 16, 740 - 16);
	ctx.fill();
	ctx.stroke();

	let gradient;
	function getGradient(context, width, hero1, hero2, hero3, hero4, hero5) {
		gradient = context.createLinearGradient(0, 0, width, 0);
		gradient.addColorStop(0, hero1);
		gradient.addColorStop(1 / 4, hero2);
		gradient.addColorStop(2 / 4, hero3);
		gradient.addColorStop(3 / 4, hero4);
		gradient.addColorStop(1, hero5);

		return gradient;
	}

	ctx.textBaseline = 'hanging';
	ctx.font = '120px BigNoodleTooOblique';
	ctx.fillStyle = '#777';
	ctx.fillText(battletag, 40, 30);

	ctx.font = '90px BigNoodleTooOblique';
	ctx.fillStyle = '#7749a9';
	ctx.fillRect(90 + battletagWidth, 44, 120 + rankWidth, 100);

	ctx.fillStyle = '#a35435';
	ctx.fillRect(40 + battletagWidth + 90 + rankWidth + 80, 44, levelWidth + 40, 100);

	ctx.fillStyle = '#fff';
	ctx.fillText((stats['comprank'] || 0), 180 + battletagWidth, 46);
	ctx.fillText(level, 40 + battletagWidth + 90 + rankWidth + 90, 46);

	const img = new image;

	if (stats['comprank'] >= 0 && stats['comprank'] < 1500)
		img.src = fs.readFileSync(path.join(__dirname, 'images', 'rank', '1.png'));
	if (stats['comprank'] >= 1500 && stats['comprank'] < 2000)
		img.src = fs.readFileSync(path.join(__dirname, 'images', 'rank', '2.png'));
	if (stats['comprank'] >= 2000 && stats['comprank'] < 2500)
		img.src = fs.readFileSync(path.join(__dirname, 'images', 'rank', '3.png'));
	if (stats['comprank'] >= 2500 && stats['comprank'] < 3000)
		img.src = fs.readFileSync(path.join(__dirname, 'images', 'rank', '4.png'));
	if (stats['comprank'] >= 3000 && stats['comprank'] < 3500)
		img.src = fs.readFileSync(path.join(__dirname, 'images', 'rank', '5.png'));
	if (stats['comprank'] >= 3500 && stats['comprank'] < 4000)
		img.src = fs.readFileSync(path.join(__dirname, 'images', 'rank', '6.png'));
	if (stats['comprank'] >= 4000 && stats['comprank'] <= 5000)
		img.src = fs.readFileSync(path.join(__dirname, 'images', 'rank', '7.png'));

	ctx.drawImage(img, 90 + battletagWidth, 50, 90, 90);

	ctx.textBaseline = 'alphabetic';
	const dist_temp = 240;

	for (let i = 0; i < 5; i++) {
		// Рисуем серую подложку
		ctx.fillStyle = '#ccc';
		ctx.fillRect(40 + i * dist_temp, 180, 200, 200);

		// Рисуем фото героев
		img.src = fs.readFileSync(path.join(__dirname, '..', 'images', 'heroes', `${heroesArr[i].name}.png`));
		ctx.drawImage(img, 6, 75, 170, 170, 40 + i * dist_temp, 180, 200, 200);

		// Пишем время игры
		ctx.font = '40px Futura';
		ctx.fillStyle = '#777';
		ctx.textAlign = "left";
		ctx.fillText(`${Math.round(heroesArr[i].timePlayed * 10) / 10}H`, 40 + i * dist_temp, 430);

		// Пишем винрейт
		let name_temp;
		if (heroesArr[i].name == 'dva')
			name_temp = 'd.va';
		else
			name_temp = heroesArr[i].name;

		console.log(name_temp);
		console.log(heroes[`${name_temp}`]['general_stats']['games_won']);

		let winrate;
		if (heroes[`${name_temp}`]['general_stats']['games_won'] != undefined)
			winrate = Math.round(heroes[`${name_temp}`]['general_stats']['games_won'] / heroes[`${name_temp}`]['general_stats']['games_played'] * 100 * 10) / 10;
		else
			winrate = 0;

		if (winrate > 50)
			ctx.fillStyle = '#64a102';
		else
			ctx.fillStyle = '#be3012';

		ctx.textAlign = "right";
		ctx.fillText(`${winrate}%`, 240 + i * dist_temp, 430);
	}

	const statsNameArr = {
		1: 'Винрейт, %'.toUpperCase(),
		2: 'Убийств/смертей'.toUpperCase(),
		3: 'Нанесено урона'.toUpperCase(),
		4: 'Объем исцеления'.toUpperCase(),
		5: 'Убийств'.toUpperCase(),
		6: 'Убийств у объектов'.toUpperCase(),
		7: 'Одиночных убийств'.toUpperCase(),
		8: 'Выполнение задач'.toUpperCase(),
		9: 'Смертей'.toUpperCase(),
		10: 'Кол-во игр'.toUpperCase(),
	};

	const statsArr = {
		1: `${Math.round(stats['wins'] / stats['games'] * 100 * 100) / 100}`,
		2: `${moreStats['kpd']}`,
		3: `${averageStats['damage_done_avg']}`,
		4: `${averageStats['healing_done_avg']}`,
		5: `${averageStats['eliminations_avg']}`,
		6: `${averageStats['objective_kills_avg']}`,
		7: `${averageStats['solo_kills_avg']}`,
		8: `${hoursToMMSS(averageStats['objective_time_avg'])}`,
		9: `${averageStats['deaths_avg']}`,
		10: `${stats['games']}`,
	};

	const dist_temp = 240;
	const dist_temp2 = 130;
	ctx.textAlign = "left";
	ctx.fillStyle = '#777';
	ctx.font = '80px BigNoodleTooOblique';

	for (let i = 0; i < 2; i++) {
		ctx.fillRect(40, 500 + i * dist_temp2, 1160, 4);
		for (let j = 0; j < 5; j++) {
			if (i === 0) {
				ctx.font = '24px Futura';
				ctx.fillText(`${statsNameArr[j + 1]}`, 40 + j * dist_temp, 490 + i * dist_temp2);
				ctx.font = '80px BigNoodleTooOblique';
				ctx.fillText(`${statsArr[j + 1]}`, 40 + j * dist_temp, 570 + i * dist_temp2);
			}
			if (i === 1) {
				ctx.font = '24px Futura';
				ctx.fillText(`${statsNameArr[j + 6]}`, 40 + j * dist_temp, 490 + i * dist_temp2);
				ctx.font = '80px BigNoodleTooOblique';
				ctx.fillText(`${statsArr[j + 6]}`, 40 + j * dist_temp, 570 + i * dist_temp2);
			}
		}
	}

	return canvas.toBuffer();
};

module.exports = formatImageStats;
