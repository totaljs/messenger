var MARKDOWN = {};
var REGEXP = {};

REGEXP.tag = /(<([^>]+)>)/ig;
REGEXP.smiles = /&lt;i\sclass=&quot;(smiles|fa).*?&lt;\/i&gt;/g;
REGEXP.users = /(\s|\<)?@[a-z0-9\-]+(\s|\>)?/g;
REGEXP.table = /<table/g;
REGEXP.quotes = /&quot;/g;
REGEXP.g = /&gt;/g;
REGEXP.l = /&lt;/g;
REGEXP.fa = /"fa\s/g;

marked.setOptions({ gfm: true, breaks: true, sanitize: true, tables: true });

$(document).ready(function() {
	setTimeout(function() {
		EMIT('resize');
	}, 100);
});

$(window).on('resize', function() {
	EMIT('resize');
});

ON('resize', function() {
	var $w = $(window);
	var height = $w.height();

	var msgbox = $('#messagebox');
	if (!msgbox.length)
		return;

	if (msgbox.hasClass('hidden'))
		msgbox = 0;
	else
		msgbox = msgbox.height();

	var header = $('#header').height();

	$('#content').css({ 'margin-top': header }).css('height', height - header - (msgbox));
	var tmp = $('#panel');
	tmp.css('height', height - tmp.offset().top);
});

function highlight(el) {
	$(el).find('pre code').each(function(i, block) {
		hljs.highlightBlock(block);
	});
	return el;
}

function scrollBottom() {
	var el = $('#content');
	el.scrollTop(el.get(0).scrollHeight);
}

Tangular.register('markdown', function(value) {
	var xss = marked_xss_parse(value, this.user.sa);

	MARKDOWN.message = this;
	MARKDOWN.html = marked(marked_features(xss.body)).replace(REGEXP.smiles, function(text) {
		return text.replace(REGEXP.l, '<').replace(REGEXP.g, '>').replace(REGEXP.quotes, '"');
	}).replace(/<img/g, '<img class="img-responsive"').replace(REGEXP.table, '<table class="table table-bordered"').replace(/<a\s/g, '<a target="_blank"');

	if (!MARKDOWN.html.replace(REGEXP.tag, '').trim())
		MARKDOWN.html = MARKDOWN.html.replace(REGEXP.fa, '"fa fa-2x ');

	MARKDOWN.html = MARKDOWN.html.replace(REGEXP.users, function(text) {
		var index = text.indexOf('@');
		var l = text.substring(text.length - 1);
		var u = current.users.findItem('linker', text.substring(index + 1).trim());
		if (l !== ' ' && l !== '>')
			l = '';
		return u ? ((text.substring(0, index) + '<a href="javascript:void(0)" class="b userlinker" data-linker="{2}">{1}</a>'.format(u.picture, Tangular.helpers.encode(u.name), u.linker)) + l) : text;
	}).trim();

	xss.body = MARKDOWN.html;
	MARKDOWN.html = marked_xss_inject(xss, this.user.sa);

	EMIT('messenger.render', MARKDOWN);
	return MARKDOWN.html;
});

function marked_xss_parse(body, can) {
	var xss_script = /<script.*?>.*?<\/script>/igm;
	var beg = -1;
	var obj = {};
	obj.body = body;
	obj.cache = [];

	if (!can)
		return obj;

	while (true) {
		beg = obj.body.indexOf('```xss', beg);
		if (beg === -1)
			return obj;
		var end = obj.body.indexOf('```', beg + 6);
		if (end === -1)
			return obj;
		obj.cache.push(obj.body.substring(beg + 6, end).replace(xss_script, ''));
		obj.body = obj.body.substring(0, beg) + '$$' + (obj.cache.length - 1) + '$$' + obj.body.substring(end + 3);
	}
}
function marked_xss_inject(obj, can) {

	return can ? obj.body.replace(/\$\$\d+\$\$/g, function(id) {
		return obj.cache[+id.replace(/\$/g, '')];
	}) : obj.body;
}

function marked_features(str) {
	var builder = [];
	var beg = 0;
	var skip = false;

	for (var i = 0, length = str.length; i < length; i++) {
		var c = String.fromCharCode(str.charCodeAt(i));

		if (c === '`') {
			!skip && builder.push(smilefy(mailify(urlify(str.substring(beg, i)))));
			skip = !skip;
			!skip && (beg = i + 1);
			builder.push(c);
		} else if (skip)
			builder.push(c);
	}

	var tmp = str.substring(beg, str.length);
	tmp && builder.push(smilefy(mailify(urlify(tmp))));
	return builder.join('');
}


function smilefy(str) {
	var db = { ':-)': 1, ':)': 1, ';)': 8, ':D': 0, '8)': 5, ':((': 7, ':(': 3, ':|': 2, ':P': 6, ':O': 4, ':*': 9, '+1': 10, '1': 11, '\/': 12 };
	return str.replace(/(\-1|[:;8O\-)DP(|\*]|\+1){1,3}/g, function(match) {
		if (match === '-1')
			return match;
		var smile = db[match.replace('-', '')];
		return smile === undefined ? match : '<i class="smiles smiles-' + smile + '"></i>';
	}).replace(/\:[a-z0-9\-]+\:/g, function(text) {
		return '<i class="fa fa-' + text.substring(1, text.length - 1) + '"></i>';
	});
}

function urlify(str, a) {
	return str.replace(/(((https?:\/\/)|(www\.))[^\s]+)/g, function(url, b, c) {

		// Check the markdown
		var l = url.substring(url.length - 1, url.length);
		var p = url.substring(url.length - 2, url.length - 1);

		if (l === ')' || l === '>' || p === ')' || p === '>')
			return url;

		var len = url.length;
		l = url.substring(len - 1);
		if (l === ')')
			return url;
		if (l === '.' || l === ',')
			url = url.substring(0, len - 1);
		else
			l = '';
		var raw = url;
		url = c === 'www.' ? 'http://' + url : url;
		return (a ? '<a href="{0}" target="_blank">{1}</a>'.format(url, raw) : '[' + raw + '](' + url + ')') + l;
	});
}

function mailify(str, a) {
	return str.replace(/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/g, function(m) {
		var len = m.length;
		var l = m.substring(len - 1);
		if (l === '.' || l === ',')
			m = m.substring(0, len - 1);
		else
			l = '';
		return (a ? '<a href="mailto:{0}">{0}</a>'.format(m) : '[' + m + '](mailto:' + m + ')') + l;
	});
}

function hashtagify(str) {
	var beg = -1;
	while (true) {
		beg = str.indexOf('#', beg);
		if (beg === -1)
			return str;

		var p = str.substring(beg - 1, beg);
		if (p && p !== ' ') {
			beg++;
			continue;
		}

		var end = str.length;

		for (var i = beg; i < beg + 15; i++) {
			var c = str.charCodeAt(i);
			switch (c) {
				case 32:
				case 44:
				case 45:
				case 46:
				case 58:
				case 59:
					end = i;
					break;
			}
		}

		var hash = str.substring(beg, end);
		str = str.replace(hash, '');
	}
}

function findfiles(str) {
	var match = str.match(/\[.*?\]\(\/download\/.*?\)/g);
	if (!match)
		return null;
	var files = [];
	for (var i = 0, length = match.length; i < length; i++) {
		var text = match[i].trim();
		var index = text.indexOf('(');
		var name = text.substring(1, index - 1);
		var url = text.substring(index + 1, text.length - 1);
		files.push({ name: name, url: url });
	}
	return files;
}

function findusers(str) {
	var match = str.match(REGEXP.users);
	if (!match)
		return null;
	var users = {};
	var is = false;
	for (var i = 0, length = match.length; i < length; i++) {
		var text = match[i].trim();
		var beg = text.indexOf('@');
		var end = text.indexOf(' ', beg);
		text = text.substring(beg + 1, end === -1 ? text.length : end);
		var user = current.users.findItem('linker', text);
		if (user) {
			is = true;
			users[user.id] = true;
		}
	}
	return is ? users : null;
}

function newest(a, b) {
	return a.substring(0, 14).parseInt() >= b.substring(0, 14).parseInt();
}

Tangular.register('body', function(value) {
	return smilefy(urlify(mailify(value.replace(/\`.*?\`/g, function(text) {
		return '<code>' + text.replace(/\`/g, '') + '</code>';
	}), true), true));
});

Tangular.register('def', function(value, def) {
	return value === '' || value == null ? def : value;
});

function marked_video(selector) {
	selector.find('.lang-video').each(function() {
		var el = $(this);
		var html = el.html();
		if (html.indexOf('youtube') !== -1)
			el.parent().replaceWith('<div class="video-container"><div class="video"><iframe src="https://www.youtube.com/embed/' + Tangular.helpers.encode(html.split('v=')[1] || '') + '" frameborder="0" allowfullscreen></iframe></div></div>');
		else if (html.indexOf('vimeo') !== -1)
			el.parent().replaceWith('<div class="video-container"><div class="video"><iframe src="//player.vimeo.com/video/' + Tangular.helpers.encode(html.substring(html.lastIndexOf('/') + 1)) + '" frameborder="0" allowfullscreen></iframe></div></div>');
	});
}

function marked_iframe(selector) {
	selector.find('.lang-iframe').each(function() {
		var el = $(this);
		el.parent().replaceWith('<div class="iframe"><iframe src="' + Tangular.helpers.encode(el.html()) + '" frameborder="0"></iframe></div>');
	});
}

// CodeMirror Autosuggest
// https://github.com/samdark/codemirror-autosuggest

(function (mod) {
	mod(CodeMirror);
})(function (CodeMirror) {
	'use strict';
	CodeMirror.defineOption('autoSuggest', [], function (cm, value) {
		cm.on('inputRead', function (cm, change) {
			var mode = cm.getModeAt(cm.getCursor());
			for (var i = 0, len = value.length; i < len; i++) {
				if (mode.name === value[i].mode && change.text[0] === value[i].startChar) {
					(function(i) {
						cm.showHint({
							completeSingle: false,
							hint: function (cm) {
								var cur = cm.getCursor();
								var token = cm.getTokenAt(cur);
								var start = token.start + 1;
								var end = token.end;
								return {
									list: value[i].listCallback(cm.getValue().substring(start, end)),
									from: CodeMirror.Pos(cur.line, start),
									to: CodeMirror.Pos(cur.line, end)
								};
							}
						});
					})(i);
				}
			}
		});
	});
});

// CodeMirror PlaceHolder
// https://codemirror.net/addon/display/placeholder.js
!function(a){"object"==typeof exports&&"object"==typeof module?a(require("../../lib/codemirror")):"function"==typeof define&&define.amd?define(["../../lib/codemirror"],a):a(CodeMirror)}(function(a){function b(a){a.state.placeholder&&(a.state.placeholder.parentNode.removeChild(a.state.placeholder),a.state.placeholder=null)}function c(a){b(a);var c=a.state.placeholder=document.createElement("pre");c.style.cssText="height: 0; overflow: visible",c.className="CodeMirror-placeholder";var d=a.getOption("placeholder");"string"==typeof d&&(d=document.createTextNode(d)),c.appendChild(d),a.display.lineSpace.insertBefore(c,a.display.lineSpace.firstChild)}function d(a){f(a)&&c(a)}function e(a){var d=a.getWrapperElement(),e=f(a);d.className=d.className.replace(" CodeMirror-empty","")+(e?" CodeMirror-empty":""),e?c(a):b(a)}function f(a){return 1===a.lineCount()&&""===a.getLine(0)}a.defineOption("placeholder","",function(c,f,g){var h=g&&g!=a.Init;if(f&&!h)c.on("blur",d),c.on("change",e),c.on("swapDoc",e),e(c);else if(!f&&h){c.off("blur",d),c.off("change",e),c.off("swapDoc",e),b(c);var i=c.getWrapperElement();i.className=i.className.replace(" CodeMirror-empty","")}f&&!c.hasFocus()&&d(c)})});