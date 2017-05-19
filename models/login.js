NEWSCHEMA('Login').make(function(schema) {

	schema.define('email', 'Email', true);
	schema.define('password', 'String(30)', true);

	schema.addWorkflow('exec', function(error, model, options, callback, controller) {
		var user = F.global.users.findItem('email', model.email);
		if (user && user.password == model.password.sha1()) {
			if (user.blocked)
				error.push('error-user-blocked');
			else {
				controller.cookie(F.config.cookie, F.encrypt(user.id + '|' + controller.ip + '|' + F.datetime.getTime()), '1 month');
				NOSQL('users').counter.hit('all').hit(user.id);
			}
		} else
			error.push('error-user-credentials');
		callback(SUCCESS(true));
	});
});