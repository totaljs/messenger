exports.install = function() {
	F.route('/*', ['authorize']);
	F.route('/*', 'login', ['unauthorize']);
};