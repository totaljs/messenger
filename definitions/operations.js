const Fs = require('fs');

NEWOPERATION('users.save', function(error, value, callback) {
	callback(SUCCESS(true));
	setTimeout2('users.save', function() {
		Fs.writeFile(F.path.databases('users.json'), JSON.stringify(F.global.users), F.error());
	}, 500, 20);
});

NEWOPERATION('users.load', function(error, value, callback) {
	Fs.readFile(F.path.databases('users.json'), function(err, data) {
		if (err)
			F.global.users = [];
		else
			F.global.users = data.toString('utf8').parseJSON(true);

		for (var i = 0, length = F.global.users.length; i < length; i++) {
			var user = F.global.users[i];
			user.online = false;

			if (!user.department)
				user.department = 'Members';

			!user.lastmessages && (user.lastmessages = {});
			!user.blacklist && (user.blacklist = {});
			!user.theme && (user.theme = 'dark');

			// Cleaner for unhandled assignment
			delete user.recent[''];
			delete user.recent[user.id];
			delete user.unread[user.id];
			delete user.unread[''];
			delete user.lastmessages[''];
			delete user.lastmessages[user.id];
			delete user.recent['undefined'];
			delete user.unread['undefined'];
			delete user.lastmessages['undefined'];
		}

		callback(SUCCESS(true));
	});
});

// Performs notifications for unread messages
NEWOPERATION('users.notify', function(error, value, callback) {
	F.logger('notifications', 'begin');

	var has = false;

	F.global.users.wait(function(item, next) {

		if (!item.notifications)
			return next();

		var model = {};
		var count = 0;

		model.name = item.name;
		model.channels = [];
		model.users = [];
		model.has = false;

		Object.keys(item.unread).forEach(function(id) {
			var unread = F.global.channels.findItem('id', id);
			if (unread) {
				count += item.unread[id];
				model.channels.push({ item: unread, count: item.unread[id] });
				model.has = true;
				return;
			}

			unread = F.global.users.findItem('id', id);
			if (unread) {
				count += item.unread[id];
				model.users.push({ item: unread, count: item.unread[id] });
				model.has = true;
			}
		});

		if (model.has) {
			if (count === item.unreadcount)
				return next();
			item.unreadcount = count;
			has = true;
			F.logger('notifications', item.email, 'channels: ' + model.channels.length, 'users: ' + model.users.length);
			F.mail(item.email, '@({0}: unread messages)'.format(F.config.name), 'notification', model, next, '');
		} else
			next();

	}, function() {
		F.logger('notifications', 'end');
		has && OPERATION('users.save', NOOP);
	});

	callback(SUCCESS(true));
});

NEWOPERATION('channels.save', function(error, value, callback) {
	callback(SUCCESS(true));
	setTimeout2('users.save', function() {
		Fs.writeFile(F.path.databases('channels.json'), JSON.stringify(F.global.channels), F.error());
	}, 500);
});

NEWOPERATION('channels.load', function(error, value, callback) {
	Fs.readFile(F.path.databases('channels.json'), function(err, data) {
		if (err)
			F.global.channels = [];
		else
			F.global.channels = data.toString('utf8').parseJSON(true);
		callback(SUCCESS(true));
	});
});

NEWOPERATION('messages.cleaner', function(error, value, callback) {
	callback(SUCCESS(true));
	setTimeout2(value, function() {
		var db = NOSQL(value);
		var max = 200;
		db.count().callback(function(err, count) {
			if (count > max) {
				count = count - max;
				db.remove().prepare((doc, index) => index < count || doc.dateexpired < F.datetime);
			}
		});
	}, 30000);
});

const SEND_CLIENT = {};
const SEND_MESSAGE = {};

NEWOPERATION('send', function(error, value, callback) {

	// value.id = ID MESSAGE FOR UPDATE (OPTIONAL)
	// value.iduser = IDUSER;
	// value.idtarget = IDCHANNEL or IDUSER;
	// value.target = 'channel' or 'user';
	// value.body = 'MESSAGE in MARKDOWN';
	// value.users = [Array of ID users]; (OPTIONAL)
	// value.files = [{ name: String, url: String }]; (OPTIONAL)
	// value.idto = IDUSER; (OPTIONAL, can rewrite a private database between two users. Only for robots)
	// value.secret = Boolean;

	SEND_CLIENT.user = F.global.users.findItem('id', value.iduser);

	if (!SEND_CLIENT.user) {
		error.push('error-user-404');
		return callback();
	}

	SEND_CLIENT.threadid = value.idtarget;
	SEND_CLIENT.threadtype = value.target;

	value.users && value.users.indexOf(SEND_CLIENT.user.id) === -1 && value.users.push(SEND_CLIENT.user.id);

	SEND_MESSAGE.id = value.id;
	SEND_MESSAGE.body = value.body;
	SEND_MESSAGE.users = value.users || null;
	SEND_MESSAGE.files = value.files || null;
	SEND_MESSAGE.idto = value.idto;
	SEND_MESSAGE.secret = value.secret;

	F.global.sendmessage(SEND_CLIENT, SEND_MESSAGE);
	callback(SUCCESS(true));
});

F.wait('database');
F.on('ready', function() {
	setTimeout(() => F.wait('database'), 2000);
	OPERATION('users.load', NOOP);
	OPERATION('channels.load', NOOP);
});