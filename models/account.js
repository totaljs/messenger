NEWSCHEMA('Account').make(function(schema) {

	schema.define('name', 'String(50)', true);
	schema.define('email', 'Email', true);
	schema.define('status', 'String(50)');
	schema.define('password', 'String(30)');
	schema.define('picture', 'String(30)');
	schema.define('notifications', Boolean);
	schema.define('theme', 'String(20)');

	schema.setSave(function(error, model, options, callback, controller) {

		var user = F.global.users.findItem('id', controller.user.id);
		if (user) {
			var notify = user.name !== model.name || user.picture !== model.picture && user.status !== model.status;
			user.name = model.name;
			user.email = model.email;
			user.picture = model.picture;
			user.notifications = model.notifications;
			user.status = model.status;
			user.theme = model.theme;
			model.password && !model.password.startsWith('****') && (user.password = model.password.sha1());
			OPERATION('users.save', NOOP);
			notify && F.global.refresh && F.global.refresh();
		}

		callback(SUCCESS(true));
	});

});