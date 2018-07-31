NEWSCHEMA('Favorite').make(function(schema) {

	schema.define('id', 'UID', true);
	schema.define('iduser', 'UID', true);
	schema.define('datecreated', Date, true);
	schema.define('mobile', Boolean);
	schema.define('search', 'String(100)');
	schema.define('body', 'String(1500)', true);

	schema.setQuery(function(error, options, callback, controller) {
		NOSQL('favorites').find().make(function(builder) {
			builder.where('idowner', controller.user.id);
			builder.sort('datecreated', true);
			builder.callback((err, response) => callback(response));
		});
	});

	schema.setSave(function(error, model, options, callback, controller) {
		model.idowner = controller.user.id;
		NOSQL('favorites').insert(model, true).make(function(builder) {
			builder.where('id', model.id);
			builder.where('idowner', model.idowner);
			builder.callback(function(err) {
				callback(SUCCESS(true));
			});
		});
	});

	schema.setRemove(function(error, options, callback, controller) {
		NOSQL('favorites').remove().make(function(builder) {
			builder.where('id', controller.id);
			builder.where('idowner', controller.user.id);
			builder.callback(function() {
				callback(SUCCESS(true));
			});
		});
	});

});