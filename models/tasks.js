NEWSCHEMA('Task').make(function(schema) {

	schema.define('body', 'String(200)', true);

	schema.setQuery(function(error, options, callback, controller) {
		NOSQL('tasks').find().where('iduser', controller.user.id).callback((err, response) => callback(response));
	});

	schema.setSave(function(error, model, options, callback, controller) {
		model.id = UID();
		model.iduser = controller.user.id;
		model.datecreated = F.datetime;
		NOSQL('tasks').insert(model);
		callback(SUCCESS(true, model.id));
	});

	schema.addWorkflow('exec', function(error, model, options, callback, controller) {
		NOSQL('tasks').remove(F.path.databases('tasks-backup.nosql')).where('id', controller.id);
		callback(SUCCESS(true));
	});

});