/**
 * Created by savely on 01.05.2017.
 */
const db = require('./db');

module.exports.init = function (id) {
	return new Promise(async function (resolve, reject) {
		try {
			const imgur = await db.getUserImages(id);

			let answer = [];

			if (imgur.quickplay.all.link)
				answer.push({
					id: '0',
					type: 'photo',
					title: 'Быстрая игра',
					photo_url: imgur.quickplay.all.link,
					thumb_url: 'http://i.imgur.com/DnHTlC2.jpg'
				});

			if (imgur.competitive.all.link)
				answer.push({
					id: '1',
					type: 'photo',
					title: 'Соревновательная игра',
					photo_url: imgur.competitive.all.link,
					thumb_url: 'http://i.imgur.com/iYnp6L3.jpg'
				});

			resolve(answer);
		} catch (error) {
			reject(error);
		}
	});
};