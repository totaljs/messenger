const MSG_MUTE = { type: 'mute' };

// User's notifications
SCHEDULE('08:00', '1 day', function() {
	var time = ('1' + F.datetime.format('HHmm')).parseInt();
	(time > 10755 && time < 10825) && OPERATION('users.notify', NOOP);
});

// Clearing "mute" channel/user
F.on('service', function(counter) {

	// Each 30 minutes
	if (counter % 30 !== 0)
		return;

	var now = Date.now();
	var users = F.global.users;

	for (var i = 0, length = users.length; i < length; i++) {
		var user = users[i];

		if (!user.mute)
			continue;

		var count = 0;
		var is = false;

		Object.keys(user.mute).forEach(function(key) {
			if (user.mute[key] < now) {
				delete user.mute[key];
				is = true;
			} else
				count++;
		});

		if (is && user.online && F.global.websocket) {
			var tmp = F.global.websocket.find(n => n.user === user);
			if (tmp) {
				MSG_MUTE.body = user.mute;
				tmp.send(MSG_MUTE);
			}
		}

		!count && (user.mute = null);
	}
});