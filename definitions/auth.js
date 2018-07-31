const SESSION = {};

F.onAuthorize = function(req, res, flags, next) {

	var cookie = req.cookie(F.config.cookie);
	if (!cookie)
		return next(false);

	var id = F.decrypt(cookie, false);
	id && (id = id.substring(0, id.indexOf('|')));
	if (!id)
		return next(false);

	if (SESSION[id] && !SESSION[id].blocked) {
		SESSION[id].ticks = F.datetime;
		return next(true, SESSION[id]);
	}

	var user = F.global.users.findItem('id', id);
	if (user && !user.blocked) {
		user.ticks = F.datetime;
		user.datelogged = F.datetime;
		OPERATION('users.save', NOOP);
		SESSION[id] = user;
		next(true, user);
	} else
		next(false);
};

F.on('service', function(counter) {
	if (counter % 5 !== 0)
		return;
	var ticks = F.datetime.add('-10 mintes');
	Object.keys(SESSION).forEach(function(key) {
		if (SESSION[key].ticks < ticks)
			delete SESSION[key];
	});
});