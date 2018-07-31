const MSG_ONOFF = { type: 'online' };
const MSG_CDL = { type: 'cdl' };
const MSG_UNREAD = { type: 'unread' };
const MSG_TYPING = { type: 'typing' };
const MSG_MUTE = { type: 'mute' };
const SKIPFIELDS = { email: true, unread: true, recent: true, channels: true, password: true, ticks: true };

exports.install = function() {
	F.websocket('/', messages, ['json', 'authorize'], 3);
};

function messages() {

	var self = this;

	F.global.websocket = self;

	self.autodestroy(function() {
		F.global.websocket = null;
		F.global.refresh = null;
	});

	// Temporary method for refreshing data
	F.global.refresh = function() {
		MSG_CDL.channels = F.global.channels;
		MSG_CDL.users = F.global.users;
		var is = true;
		self.send(MSG_CDL, undefined, undefined, function(key, value) {
			if (is && key === 'channels') {
				is = false;
				return value;
			}
			return SKIPFIELDS[key] ? undefined : value;
		});
		F.emit('messenger.refresh', self);
	};

	self.on('open', function(client) {
		var was = client.user.online === true;
		var is = true;
		client.user.online = true;
		client.user.datelogged = F.datetime;
		client.user.mobile = client.req.mobile;
		MSG_CDL.channels = F.global.channels;
		MSG_CDL.users = F.global.users;

		client.send(MSG_CDL, undefined, function(key, value) {
			if (is && key === 'channels') {
				is = false;
				return value;
			}
			return SKIPFIELDS[key] ? undefined : value;
		});

		setTimeout(function() {
			MSG_ONOFF.id = client.user.id;
			MSG_ONOFF.online = true;
			MSG_ONOFF.datelogged = F.datetime;
			self.send(MSG_ONOFF);
		}, 500);

		!was && F.emit('messenger.open', self, client);
	});

	self.on('close', function(client) {
		if (self.find(n => n.user.id === client.user.id && n.id !== client.id))
			return;
		var was = client.user.online === false;
		client.user.online = false;
		MSG_ONOFF.id = client.user.id;
		MSG_ONOFF.online = false;
		MSG_ONOFF.datelogged = F.datetime;
		self.send(MSG_ONOFF);
		!was && F.emit('messenger.close', self, client);
	});

	self.on('message', function(client, message) {

		var iduser = client.user.id;
		F.emit('messenger.data', self, client, message);

		switch (message.type) {

			case 'unread':
				MSG_UNREAD.unread = client.user.unread;
				MSG_UNREAD.lastmessages = client.user.lastmessages;
				MSG_UNREAD.recent = undefined;
				client.send(MSG_UNREAD);
				break;

			case 'setunread':
				client.user.unread[message.id] = 1;
				MSG_UNREAD.unread = client.user.unread;
				MSG_UNREAD.lastmessages = client.user.lastmessages;
				MSG_UNREAD.recent = undefined;
				client.send(MSG_UNREAD);
				break;

			// Changed group (outside of channels and users)
			case 'nochat':
				client.threadtype = undefined;
				client.threadid = undefined;
				break;

			// Changed group
			case 'channel':
			case 'user':
				client.user.threadtype = client.threadtype = message.type;
				client.user.threadid = client.threadid = message.id;
				message.type === 'user' && iduser !== message.id && (client.user.recent[message.id] = true);
				client.user.unread[message.id] && (delete client.user.unread[message.id]);
				break;

			case 'mute':

				if (!client.threadid)
					return;

				if (client.user.mute) {
					if (client.user.mute[client.threadid])
						delete client.user.mute[client.threadid];
					else
						client.user.mute[client.threadid] = F.datetime.add('1 hour').getTime();
				} else {
					client.user.mute = {};
					client.user.mute[client.threadid] = F.datetime.add('1 hour').getTime();
				}

				client.user.mute[message.id];
				MSG_MUTE.body = client.user.mute;
				client.send(MSG_MUTE);
				break;

			case 'recent':
				delete client.user.recent[message.id];
				OPERATION('users.save', NOOP);
				break;

			// Starts typing
			case 'typing':

				if (client.user.blocked)
					return;

				MSG_TYPING.id = iduser;
				self.send(MSG_TYPING, (id, m) => m.user !== client.user && ((m.user.id === client.threadid && m.threadid === iduser) || (client.threadtype === 'channel' && m.threadtype === client.threadtype && m.threadid === client.threadid)));
				break;

			// Real message
			case 'message':
				!client.user.blocked && F.global.sendmessage(client, message);
				break;
		}
	});
}

F.global.sendmessage = function(client, message) {

	if (!client.threadid || !client.threadtype)
		return;

	var self = F.global.websocket;
	var tmp, idchannel, is;
	var id = message.id;
	var iduser = client.user.id;

	message.id = id ? id : UID();
	message.datecreated = F.datetime = new Date();
	message.iduser = iduser;
	message.mobile = client.req ? client.req.mobile : false;
	message.robot = client.send ? false : true;

	if (message.secret)
		message.dateexpired = F.datetime.add('1 day');
	else
		message.secret = undefined;

	if (!message.type)
		message.type = 'message';

	id && (message.edited = true);
	client.user.lastmessages[client.threadid] = message.id;

	F.emit('messenger.message', self, client, message);
	NOSQL('messages').counter.hit('all').hit(iduser);

	// threadtype = "user" (direct message) or "channel"

	if (client.threadtype === 'user') {

		is = true;

		// Users can be logged from multiple devices
		self && self.send(message, function(id, n) {

			if (n === client)
				return false;

			// Target user
			if (n.threadid === iduser && n.user.id === client.threadid) {
				is = false;
				n.user.lastmessages[n.threadid] = message.id;
				return true;
			}

			// ROBOT
			if (!client.send && n.threadtype === 'user' && ((n.user.id === message.idto && n.user.threadid === client.threadid) || (n.user.id === client.threadid && n.user.threadid === message.idto))) {
				is = false;
				return true;
			}

			// !client.send (the messages is from "robot")
			return n.user.id === iduser && n.threadid === client.threadid;
		});

		if (is) {
			tmp = F.global.users.findItem('id', client.threadid);
			if (tmp && (!tmp.mute || !tmp.mute[iduser])) {

				if (tmp.unread[iduser])
					tmp.unread[iduser]++;
				else
					tmp.unread[iduser] = 1;

				tmp.recent[iduser] = true;

				if (tmp.online) {
					MSG_UNREAD.unread = tmp.unread;
					MSG_UNREAD.recent = tmp.recent;
					MSG_UNREAD.lastmessages = tmp.lastmessages;
					if (self) {
						tmp = self.find(n => n.user.id === tmp.id);
						tmp && tmp.send(MSG_UNREAD);
					}
				}

				OPERATION('users.save', NOOP);
			}
		}

		client.send && client.send(message);

	} else {

		tmp = {};
		idchannel = client.threadid;

		// Notify users in this channel
		self && self.send(message, function(id, m) {
			if (m.threadid === client.threadid && (!message.users || message.users[m.user.id])) {
				tmp[m.user.id] = true;
				m.user.lastmessages[m.threadid] = message.id;
				return true;
			}
		});

		// Set "unread" for users outside of this channel
		for (var i = 0, length = F.global.users.length; i < length; i++) {
			var user = F.global.users[i];
			if (!tmp[user.id] && (!user.blacklist || !user.blacklist[idchannel]) && (!user.mute || !user.mute[idchannel]) && (!user.channels || user.channels[idchannel]) && (!message.users || message.users[user.id])) {
				if (user.unread[idchannel])
					user.unread[idchannel]++;
				else
					user.unread[idchannel] = 1;
			}
		}

		self && self.all(function(m) {
			if (m.user.id !== iduser && m.threadid !== client.threadid && (!m.user.blacklist || !m.user.blacklist[client.threadid]) && (!m.user.mute || !m.user.mute[client.threadid]) && (!m.user.channels || m.user.channels[client.threadid]) && (!message.users || message.users[m.user.id])) {
				MSG_UNREAD.unread = m.user.unread;
				MSG_UNREAD.lastmessages = m.user.lastmessages;
				MSG_UNREAD.recent = undefined;
				m.send(MSG_UNREAD);
			}
		});

		OPERATION('users.save', NOOP);
	}

	// Saves message into the DB
	var dbname = client.threadtype === 'channel' ? client.threadtype + client.threadid : 'user' + F.global.merge(client.threadid, message.idto || iduser);

	message.type = undefined;
	message.idowner = client.threadid;
	message.search = message.body.keywords(true, true).join(' ');

	var db = NOSQL(dbname);
	var dbBackup = NOSQL(dbname + '-backup');

	if (id) {
		// Edited
		tmp = { body: message.body, edited: true, dateupdated: message.datecreated };
		db.modify(tmp).where('id', id).where('iduser', iduser);
		!message.secret && dbBackup.modify(tmp).where('id', id).where('iduser', iduser);
	} else {

		// New
		if (message.body === ':thumbs-up:')
			db.meta('likes', (db.meta('likes') || 0) + 1);
		else
			db.meta('likes', 0);

		db.insert(message);
		db.counter.hit('all').hit(client.user.id);
		!message.secret && dbBackup.insert(message);
		message.files && message.files.length && NOSQL(dbname + '-files').insert(message);
		OPERATION('messages.cleaner', dbname, NOOP);
	}
};
