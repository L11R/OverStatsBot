/**
 * Created by savely on 01.05.2017.
 */
module.exports = function () {
	// Основной цикл для обработки inline-запросов
	bot.on('inline_query', function (inlineQuery) {
		r.db('overwatch').table('users').get(inlineQuery.from.id).pluck(
			[
				'imgur_quickplay_link',
				'imgur_competitive_link',
				'quickplay_file_id',
				'competitive_file_id',
				'imgur_link'
			])
			.then(function (data) {
				let answer = [];

				if (data.imgur_quickplay_link)
					answer.push({
						id: '0',
						type: 'photo',
						title: 'Быстрая игра',
						photo_url: data.imgur_quickplay_link,
						thumb_url: 'http://i.imgur.com/DnHTlC2.jpg'
					});

				if (data.imgur_competitive_link)
					answer.push({
						id: '1',
						type: 'photo',
						title: 'Соревновательная игра',
						photo_url: data.imgur_competitive_link,
						thumb_url: 'http://i.imgur.com/iYnp6L3.jpg'
					});

				return bot.answerInlineQuery(inlineQuery.id, answer, {is_personal: true});
			})

			.then(function (status) {
				console.log(status);
			})

			.catch(function (error) {
				console.warn(error.message);
				bot.answerInlineQuery(inlineQuery.id, [], {
					switch_pm_text: 'Ты не сгенерировал изображения.',
					switch_pm_parameter: 'inline',
					is_personal: true
				})
					.then(function (status) {
						console.log(status);
					});
			});
	});
};