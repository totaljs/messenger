COMPONENT('searchbox', function() {
	var self = this;
	var icon;

	self.noValidate();
	self.make = function() {
		self.classes('search');
		self.html('<span><i class="fa fa-search"></i></span><div><input type="text" placeholder="{0}" data-jc-bind=""{1} /></div>'.format(self.attr('data-placeholder') || '', self.attr('data-enter') === 'true' ? ' data-jc-keypress="false"' : ''));
		icon = self.find('.fa');
		self.event('click', '.fa-times', function() {
			self.set('');
		});
	};

	self.getter2 = self.setter2 = function(value) {
		icon.toggleClass('fa-search', value ? false : true).toggleClass('fa-times', value ? true : false);
	};
});

COMPONENT('click', function() {
	var self = this;

	self.readonly();

	self.click = function() {
		var value = self.attr('data-value');
		if (typeof(value) === 'string')
			self.set(self.parser(value));
		else
			self.get(self.attr('data-jc-path'))(self);
	};

	self.make = function() {
		self.event('click', self.click);
		var enter = self.attr('data-enter');
		enter && $(enter).on('keydown', 'input', function(e) {
			e.keyCode === 13 && setTimeout(function() {
				!self.element.get(0).disabled && self.click();
			}, 100);
		});
	};
});

COMPONENT('exec', function() {
	var self = this;
	self.readonly();
	self.blind();
	self.make = function() {
		self.event('click', self.attr('data-selector') || '.exec', function() {
			var el = $(this);
			var attr = el.attr('data-exec');
			var path = el.attr('data-path');
			attr && EXEC(attr, el);
			path && SET(path, new Function('return ' + el.attr('data-value'))());
		});
	};
});

COMPONENT('message', function() {
	var self = this;
	var is = false;
	var visible = false;
	var timer;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.element.addClass('ui-message hidden');

		self.element.on('click', 'button', function() {
			self.hide();
		});

		$(window).on('keyup', function(e) {
			visible && e.keyCode === 27 && self.hide();
		});
	};

	self.warning = function(message, icon, fn) {
		if (typeof(icon) === 'function') {
			fn = icon;
			icon = undefined;
		}
		self.callback = fn;
		self.content('ui-message-warning', message, icon || 'fa-warning');
	};

	self.info = function(message, icon, fn) {

		if (typeof(icon) === 'function') {
			fn = icon;
			icon = undefined;
		}

		self.callback = fn;
		self.content('ui-message-info', message, icon || 'fa-check-circle');
	};

	self.success = function(message, icon, fn) {

		if (typeof(icon) === 'function') {
			fn = icon;
			icon = undefined;
		}

		self.callback = fn;
		self.content('ui-message-success', message, icon || 'fa-check-circle');
	};

	self.hide = function() {
		self.callback && self.callback();
		self.element.removeClass('ui-message-visible');
		timer && clearTimeout(timer);
		timer = setTimeout(function() {
			visible = false;
			self.element.addClass('hidden');
		}, 1000);
	};

	self.content = function(cls, text, icon) {
		!is && self.html('<div><div class="ui-message-body"><div class="text"></div><hr /><button>' + (self.attr('data-button') || 'Close') + '</button></div></div>');
		timer && clearTimeout(timer);
		visible = true;
		self.element.find('.ui-message-body').removeClass().addClass('ui-message-body ' + cls);
		self.element.find('.fa').removeClass().addClass('fa ' + icon);
		self.element.find('.text').html(text);
		self.element.removeClass('hidden');
		setTimeout(function() {
			self.element.addClass('ui-message-visible');
		}, 5);
	};
});

COMPONENT('validation', function() {

	var self = this;
	var path;
	var elements;

	self.readonly();

	self.make = function() {
		elements = self.find(self.attr('data-selector') || 'button');
		elements.prop({ disabled: true });
		self.evaluate = self.attr('data-if');
		path = self.path.replace(/\.\*$/, '');
		self.watch(self.path, self.state, true);
	};

	self.state = function() {
		var disabled = DISABLED(path);
		if (!disabled && self.evaluate)
			disabled = !EVALUATE(self.path, self.evaluate);
		elements.prop({ disabled: disabled });
	};
});

COMPONENT('checkbox', function() {

	var self = this;
	var input;
	var isRequired = self.attr('data-required') === 'true';

	self.validate = function(value) {
		var type = typeof(value);
		if (input.prop('disabled') || !isRequired)
			return true;
		value = type === 'undefined' || type === 'object' ? '' : value.toString();
		return value === 'true' || value === 'on';
	};

	self.required = function(value) {
		self.find('span').toggleClass('ui-checkbox-label-required', value === true);
		isRequired = value;
		return self;
	};

	!isRequired && self.noValid();

	self.make = function() {
		self.classes('ui-checkbox');
		self.html('<div><i class="fa fa-check"></i></div><span{1}>{0}</span>'.format(self.html(), isRequired ? ' class="ui-checkbox-label-required"' : ''));
		self.event('click', function() {
			self.dirty(false);
			self.getter(!self.get(), 2, true);
		});
	};

	self.setter = function(value) {
		self.toggle('ui-checkbox-checked', value ? true : false);
	};
});

COMPONENT('dropdown', function() {

	var self = this;
	var isRequired = self.attr('data-required') === 'true';
	var select;
	var container;

	self.validate = function(value) {

		if (select.prop('disabled') || !isRequired)
			return true;

		var type = typeof(value);
		if (type === 'undefined' || type === 'object')
			value = '';
		else
			value = value.toString();

		EMIT('reflow', self.name);

		switch (self.type) {
			case 'currency':
			case 'number':
				return value > 0;
		}

		return value.length > 0;
	};

	!isRequired && self.noValid();

	self.required = function(value) {
		self.find('.ui-dropdown-label').toggleClass('ui-dropdown-label-required', value);
		self.noValid(!value);
		isRequired = value;
		!value && self.state(1, 1);
	};

	self.render = function(arr) {

		var builder = [];
		var value = self.get();
		var template = '<option value="{0}"{1}>{2}</option>';
		var propText = self.attr('data-source-text') || 'name';
		var propValue = self.attr('data-source-value') || 'id';
		var emptyText = self.attr('data-empty');

		emptyText !== undefined && builder.push('<option value="">{0}</option>'.format(emptyText));

		for (var i = 0, length = arr.length; i < length; i++) {
			var item = arr[i];
			if (item.length)
				builder.push(template.format(item, value === item ? ' selected="selected"' : '', item));
			else
				builder.push(template.format(item[propValue], value === item[propValue] ? ' selected="selected"' : '', item[propText]));
		}

		select.html(builder.join(''));
	};

	self.make = function() {

		var options = [];

		(self.attr('data-options') || '').split(';').forEach(function(item) {
			item = item.split('|');
			options.push('<option value="{0}">{1}</option>'.format(item[1] === undefined ? item[0] : item[1], item[0]));
		});

		self.classes('ui-dropdown-container');

		var label = self.html();
		var html = '<div class="ui-dropdown"><span class="fa fa-sort"></span><select data-jc-bind="">{0}</select></div>'.format(options.join(''));
		var builder = [];

		if (label.length) {
			var icon = self.attr('data-icon');
			builder.push('<div class="ui-dropdown-label{0}">{1}{2}:</div>'.format(isRequired ? ' ui-dropdown-label-required' : '', icon ? '<span class="fa {0}"></span> '.format(icon) : '', label));
			builder.push('<div class="ui-dropdown-values">{0}</div>'.format(html));
			self.html(builder.join(''));
		} else
			self.html(html).addClass('ui-dropdown-values');

		select = self.find('select');
		container = self.find('.ui-dropdown');

		var ds = self.attr('data-source');
		if (!ds)
			return;

		var prerender = function() {
			var value = self.get(self.attr('data-source'));
			!NOTMODIFIED(self.id, value) && self.render(value || EMPTYARRAY);
		};

		self.watch(ds, prerender, true);
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = self.isInvalid();
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.toggleClass('ui-dropdown-invalid', invalid);
	};
});

COMPONENT('textbox', function() {

	var self = this;
	var isRequired = self.attr('data-required') === 'true';
	var validation = self.attr('data-validate');
	var input;
	var container;

	self.validate = function(value) {

		if (input.prop('disabled') || !isRequired)
			return true;

		var type = typeof(value);

		if (type === 'undefined' || type === 'object')
			value = '';
		else
			value = value.toString();

		EMIT('reflow', self.name);

		switch (self.type) {
			case 'email':
				return value.isEmail();
			case 'url':
				return value.isURL();
			case 'currency':
			case 'number':
				return value > 0;
		}

		return validation ? self.evaluate(value, validation, true) ? true : false : value.length > 0;
	};

	!isRequired && self.noValid();

	self.required = function(value) {
		self.find('.ui-textbox-label').toggleClass('ui-textbox-label-required', value);
		self.noValid(!value);
		isRequired = value;
		!value && self.state(1, 1);
	};

	self.make = function() {

		var attrs = [];
		var builder = [];
		var tmp;

		attrs.attr('type', self.type === 'password' ? self.type : 'text');
		attrs.attr('placeholder', self.attr('data-placeholder'));
		attrs.attr('maxlength', self.attr('data-maxlength'));
		attrs.attr('data-jc-keypress', self.attr('data-jc-keypress'));
		attrs.attr('data-jc-keypress-delay', self.attr('data-jc-keypress-delay'));
		attrs.attr('data-jc-bind', '');
		attrs.attr('name', self.path);

		tmp = self.attr('data-align');
		tmp && attrs.attr('class', 'ui-' + tmp);
		self.attr('data-autofocus') === 'true' && attrs.attr('autofocus');

		var content = self.html();
		var icon = self.attr('data-icon');
		var icon2 = self.attr('data-control-icon');
		var increment = self.attr('data-increment') === 'true';

		builder.push('<input {0} />'.format(attrs.join(' ')));

		if (!icon2 && self.type === 'date')
			icon2 = 'fa-calendar';
		else if (self.type === 'search') {
			icon2 = 'fa-search ui-textbox-control-icon';
			self.event('click', '.ui-textbox-control-icon', function() {
				self.$stateremoved = false;
				$(this).removeClass('fa-times').addClass('fa-search');
				self.set('');
			});
			self.getter2 = function(value) {
				if (self.$stateremoved && !value)
					return;
				self.$stateremoved = value ? false : true;
				self.find('.ui-textbox-control-icon').toggleClass('fa-times', value ? true : false).toggleClass('fa-search', value ? false : true);
			};
		}

		icon2 && builder.push('<div><span class="fa {0}"></span></div>'.format(icon2));
		increment && !icon2 && builder.push('<div><span class="fa fa-caret-up"></span><span class="fa fa-caret-down"></span></div>');
		increment && self.event('click', '.fa-caret-up,.fa-caret-down', function() {
			var el = $(this);
			var inc = -1;
			if (el.hasClass('fa-caret-up'))
				inc = 1;
			self.change(true);
			self.inc(inc);
		});

		self.type === 'date' && self.event('click', '.fa-calendar', function(e) {
			e.preventDefault();
			window.$calendar && window.$calendar.toggle($(this).parent().parent(), self.find('input').val(), function(date) {
				self.set(date);
			});
		});

		if (!content.length) {
			self.classes('ui-textbox ui-textbox-container');
			self.html(builder.join(''));
			input = self.find('input');
			container = self.find('.ui-textbox');
			return;
		}

		var html = builder.join('');
		builder = [];
		builder.push('<div class="ui-textbox-label{0}">'.format(isRequired ? ' ui-textbox-label-required' : ''));
		icon && builder.push('<span class="fa {0}"></span> '.format(icon));
		builder.push(content);
		builder.push(':</div><div class="ui-textbox">{0}</div>'.format(html));

		self.html(builder.join(''));
		self.classes('ui-textbox-container');
		input = self.find('input');
		container = self.find('.ui-textbox');
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = self.isInvalid();
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.toggleClass('ui-textbox-invalid', invalid);
	};
});

COMPONENT('repeater', function() {

	var self = this;
	var recompile = false;

	self.readonly();

	self.make = function() {
		var element = self.find('script');

		if (!element.length) {
			element = self.element;
			self.element = self.element.parent();
		}

		var html = element.html();
		element.remove();
		self.template = Tangular.compile(html);
		recompile = html.indexOf('data-jc="') !== -1;
	};

	self.setter = function(value) {

		if (!value || !value.length) {
			self.empty();
			return;
		}

		var builder = [];
		for (var i = 0, length = value.length; i < length; i++) {
			var item = value[i];
			item.index = i;
			builder.push(self.template(item).replace(/\$index/g, i.toString()));
			//.replace(/\$/g, self.path + '[' + i + ']'));
		}

		self.html(builder);
		recompile && COMPILE();
	};
});

COMPONENT('error', function() {
	var self = this;
	var element;

	self.readonly();

	self.make = function() {
		self.append('<ul class="ui-error hidden"></ul>');
		element = self.find('ul');
	};

	self.setter = function(value) {

		if (!(value instanceof Array) || !value.length) {
			element.addClass('hidden');
			return;
		}

		var builder = [];
		for (var i = 0, length = value.length; i < length; i++)
			builder.push('<li><span class="fa fa-times-circle"></span> ' + value[i].error + '</li>');

		element.empty();
		element.append(builder.join(''));
		element.removeClass('hidden');
	};
});

COMPONENT('template', function() {
	var self = this;
	self.readonly();
	self.make = function(template) {

		if (template) {
			self.template = Tangular.compile(template);
			return;
		}

		var script = self.find('script');

		if (!script.length) {
			script = self.element;
			self.element = self.element.parent();
		}

		self.template = Tangular.compile(script.html());
		script.remove();
	};

	self.setter = function(value) {
		if (NOTMODIFIED(self.id, value))
			return;
		if (!value)
			return self.classes('hidden');
		KEYPRESS(function() {
			self.html(self.template(value)).removeClass('hidden');
		}, 100, self.id);
	};
});

COMPONENT('page', function() {
	var self = this;
	var isProcessed = false;
	var isProcessing = false;

	self.readonly();

	self.hide = function() {
		self.set('');
	};

	self.setter = function(value) {

		if (isProcessing)
			return;

		var el = self.element;
		var is = el.attr('data-if') == value;
		var reload = self.attr('data-reload');

		if (isProcessed || !is) {
			el.toggleClass('hidden', !is);
			is && reload && self.get(reload)();
			self.release(!is);
			return;
		}

		SETTER('loading', 'show');
		isProcessing = true;

		IMPORT(el.attr('data-template'), el, function() {
			isProcessing = false;

			var init = el.attr('data-init');
			if (init) {
				var fn = GET(init || '');
				typeof(fn) === 'function' && fn(self);
			}

			reload && self.get(reload)();
			isProcessed = true;
			setTimeout(function() {
				el.toggleClass('hidden', !is);
			}, 200);
			SETTER('loading', 'hide', 1000);
		});
	};
});

COMPONENT('form', function() {

	var self = this;
	var autocenter;

	if (!MAN.$$form) {
		window.$$form_level = window.$$form_level || 1;
		MAN.$$form = true;
		$(document).on('click', '.ui-form-button-close', function() {
			SET($(this).attr('data-path'), '');
			window.$$form_level--;
		});

		$(window).on('resize', function() {
			FIND('form', true).forEach(function(component) {
				!component.element.hasClass('hidden') && component.resize();
			});
		});

		$(document).on('click', '.ui-form-container', function(e) {
			var el = $(e.target);
			if (!(el.hasClass('ui-form-container-padding') || el.hasClass('ui-form-container')))
				return;
			var form = $(this).find('.ui-form');
			var cls = 'ui-form-animate-click';
			form.addClass(cls);
			setTimeout(function() {
				form.removeClass(cls);
			}, 300);
		});
	}

	self.readonly();
	self.submit = function() { self.hide(); };
	self.cancel = function() { self.hide(); };
	self.onHide = function(){};

	var hide = self.hide = function() {
		self.set('');
		self.onHide();
	};

	self.resize = function() {
		if (!autocenter)
			return;
		var ui = self.find('.ui-form');
		var fh = ui.innerHeight();
		var wh = $(window).height();
		var r = (wh / 2) - (fh / 2);
		if (r > 30)
			ui.css({ marginTop: (r - 15) + 'px' });
		else
			ui.css({ marginTop: '20px' });
	};

	self.make = function() {
		var width = self.attr('data-width') || '800px';
		var enter = self.attr('data-enter');
		autocenter = self.attr('data-autocenter') === 'true';
		self.condition = self.attr('data-if');

		$(document.body).append('<div id="{0}" class="hidden ui-form-container"><div class="ui-form-container-padding"><div class="ui-form" style="max-width:{1}"><div class="ui-form-title"><span class="fa fa-times ui-form-button-close" data-path="{2}"></span>{3}</div>{4}</div></div>'.format(self._id, width, self.path, self.attr('data-title')));

		var el = $('#' + self._id);
		el.find('.ui-form').get(0).appendChild(self.element.get(0));
		self.classes('-hidden');
		self.replace(el);

		self.event('scroll', function() {
			EMIT('reflow', self.name);
		});

		self.find('button').on('click', function() {
			window.$$form_level--;
			switch (this.name) {
				case 'submit':
					self.submit(hide);
					break;
				case 'cancel':
					!this.disabled && self[this.name](hide);
					break;
			}
		});

		enter === 'true' && self.event('keydown', 'input', function(e) {
			e.keyCode === 13 && !self.find('button[name="submit"]').get(0).disabled && self.submit(hide);
		});
	};

	self.setter = function() {

		setTimeout2('noscroll', function() {
			$('html').toggleClass('noscroll', $('.ui-form-container').not('.hidden').length ? true : false);
		}, 50);

		var isHidden = !EVALUATE(self.path, self.condition);
		self.toggle('hidden', isHidden);
		EMIT('reflow', self.name);

		if (isHidden) {
			self.release(true);
			self.find('.ui-form').removeClass('ui-form-animate');
			return;
		}

		self.resize();
		self.release(false);

		var el = self.find('input[type="text"],select,textarea');
		el.length && el.eq(0).focus();

		window.$$form_level++;
		self.css('z-index', window.$$form_level * 10);
		self.element.scrollTop(0);

		setTimeout(function() {
			self.find('.ui-form').addClass('ui-form-animate');
		}, 300);

		// Fixes a problem with freezing of scrolling in Chrome
		setTimeout2(self.id, function() {
			self.css('z-index', (window.$$form_level * 10) + 1);
		}, 1000);
	};
});

COMPONENT('repeater-group', function() {

	var self = this;
	var template_group;
	var group;

	self.readonly();

	self.make = function() {
		group = self.attr('data-group');
		self.element.find('script').each(function(index) {
			var element = $(this);
			var html = element.html();
			element.remove();
			if (index)
				template_group = Tangular.compile(html);
			else
				self.template = Tangular.compile(html);
		});
	};

	self.setter = function(value) {

		if (!value || !value.length) {
			self.empty();
			return;
		}

		if (NOTMODIFIED(self.id, value))
			return;

		var length = value.length;
		var groups = {};

		for (var i = 0; i < length; i++) {
			var name = value[i][group];
			if (!name)
				name = '0';

			if (groups[name])
				groups[name].push(value[i]);
			else
				groups[name] = [value[i]];
		}

		var index = 0;
		var indexgroup = 0;
		var builder = '';
		var keys = Object.keys(groups);

		keys.sort();
		keys.forEach(function(key) {
			var arr = groups[key];
			var tmp = '';

			for (var i = 0, length = arr.length; i < length; i++) {
				var item = arr[i];
				item.index = index++;
				tmp += self.template(item).replace(/\$index/g, index.toString()).replace(/\$/g, self.path + '[' + index + ']');
			}

			if (key !== '0') {
				var options = {};
				options[group] = key;
				options.length = arr.length;
				options.index = indexgroup++;
				options.body = tmp;
				builder += template_group(options);
			}

		});

		self.empty().append(builder);
	};
});

COMPONENT('dropdowncheckbox', function() {

	var self = this;
	var required = self.attr('data-required') === 'true';
	var container;
	var data = [];
	var values;
	var prepared = false;

	if (!window.$dropdowncheckboxtemplate)
		window.$dropdowncheckboxtemplate = Tangular.compile('<div><label><input type="checkbox" value="{{ index }}" /><span>{{ text }}</span></label></div>');

	var template = window.$dropdowncheckboxtemplate;

	self.validate = function(value) {
		return required ? value && value.length > 0 : true;
	};

	self.make = function() {

		var options = [];
		var element = self.element;
		var arr = (self.attr('data-options') || '').split(';');

		for (var i = 0, length = arr.length; i < length; i++) {
			var item = arr[i].split('|');
			var value = item[1] === undefined ? item[0] : item[1];
			if (self.type === 'number')
				value = parseInt(value);
			var obj = { value: value, text: item[0], index: i };
			options.push(template(obj));
			data.push(obj);
		}

		var content = element.html();
		var icon = self.attr('data-icon');
		var html = '<div class="ui-dropdowncheckbox"><span class="fa fa-sort"></span><div class="ui-dropdowncheckbox-selected"></div></div><div class="ui-dropdowncheckbox-values hidden">' + options.join('') + '</div>';

		if (content.length) {
			element.empty();
			element.append('<div class="ui-dropdowncheckbox-label' + (required ? ' ui-dropdowncheckbox-label-required' : '') + '">' + (icon ? '<span class="fa ' + icon + '"></span> ' : '') + content + ':</div>');
			element.append(html);
		} else
			element.append(html);

		self.toggle('ui-dropdowncheckbox-container');
		container = self.find('.ui-dropdowncheckbox-values');
		values = self.find('.ui-dropdowncheckbox-selected');

		self.event('click', '.ui-dropdowncheckbox', function(e) {

			var el = $(this);
			if (el.hasClass('ui-disabled'))
				return;

			container.toggleClass('hidden');

			if (window.$dropdowncheckboxelement) {
				window.$dropdowncheckboxelement.addClass('hidden');
				window.$dropdowncheckboxelement = null;
			}

			if (!container.hasClass('hidden'))
				window.$dropdowncheckboxelement = container;

			e.stopPropagation();
		});

		self.event('click', 'input,label', function(e) {

			e.stopPropagation();

			var is = this.checked;
			var index = parseInt(this.value);
			var value = data[index];
			if (value === undefined)
				return;

			value = value.value;

			var arr = self.get();
			if (!(arr instanceof Array))
				arr = [];

			var index = arr.indexOf(value);
			if (is)
				index === -1 && arr.push(value);
			else
				index !== -1 && arr.splice(index, 1);

			self.reset(true);
			self.set(arr, undefined, 2);
			self.change(true);
		});

		var ds = self.attr('data-source');
		if (!ds) {
			prepared = true;
			return;
		}

		self.watch(ds, prepare);
		setTimeout(function() {
			prepare(ds, GET(ds));
		}, 500);
	};

	function prepare(path, value) {

		var clsempty = 'ui-dropdowncheckbox-values-empty';
		prepared = true;

		if (!value) {
			container.addClass(clsempty).empty().html(self.attr('data-empty'));
			return;
		}

		var kv = self.attr('data-source-value') || 'id';
		var kt = self.attr('data-source-text') || 'name';
		var builder = '';

		data = [];
		for (var i = 0, length = value.length; i < length; i++) {
			var isString = typeof(value[i]) === 'string';
			var item = { value: isString ? value[i] : value[i][kv], text: isString ? value[i] : value[i][kt], index: i };
			data.push(item);
			builder += template(item);
		}

		if (builder)
			container.removeClass(clsempty).empty().append(builder);
		else
			container.addClass(clsempty).empty().html(self.attr('data-empty'));

		self.setter(self.get());
	}

	self.setter = function(value) {

		if (!prepared || NOTMODIFIED(self.id, value))
			return;

		var label = '';
		var empty = self.attr('data-placeholder');

		if (value && value.length) {
			var remove = [];
			for (var i = 0, length = value.length; i < length; i++) {
				var selected = value[i];
				var index = 0;
				var is = false;

				while (true) {
					var item = data[index++];
					if (item === undefined)
						break;
					if (item.value != selected)
						continue;
					label += (label ? ', ' : '') + item.text;
					is = true;
				}

				!is && remove.push(selected);
			}

			var refresh = false;

			while (true) {
				var item = remove.shift();
				if (item === undefined)
					break;
				value.splice(value.indexOf(item), 1);
				refresh = true;
			}

			refresh && MAN.set(self.path, value);
		}

		container.find('input').each(function() {
			var index = parseInt(this.value);
			var checked = false;
			if (!value || !value.length)
				checked = false;
			else if (data[index])
				checked = data[index];
			if (checked)
				checked = value.indexOf(checked.value) !== -1;
			this.checked = checked;
		});

		!label && value && MAN.set(self.path, []);

		if (!label && empty) {
			values.html('<span>{0}</span>'.format(empty));
			return;
		}

		values.html(label);
	};

	self.state = function() {
		self.find('.ui-dropdowncheckbox').toggleClass('ui-dropdowncheckbox-invalid', self.isInvalid());
	};

	if (window.$dropdowncheckboxevent)
		return;

	window.$dropdowncheckboxevent = true;
	$(document).on('click', function() {
		if (window.$dropdowncheckboxelement) {
			window.$dropdowncheckboxelement.addClass('hidden');
			window.$dropdowncheckboxelement = null;
		}
	});
});

COMPONENT('codemirror', function() {

	var self = this;
	var required = self.attr('data-required') === 'true';
	var skipA = false;
	var skipB = false;
	var editor;
	var isTyping = false;
	var currentH;
	var maxlength;

	self.validate = function(value) {
		return required ? value && value.length > 0 : true;
	};

	self.released = function(is) {
		if (is) {
			if (isMOBILE)
				editor.val('');
			else
				editor.setValue('');
		}
	};

	self.getValue = function() {
		var value = isMOBILE ? editor.val() : editor.getValue();
		return value.length > maxlength ? value.substring(0, maxlength) : value;
	};

	self.codemirror = function() {
		return editor;
	};

	self.focus = function() {
		editor.focus();
		return this;
	};

	self.enter = function() {};
	self.upload = function() {};
	self.typing = function() {};
	self.edit = function() {};
	self.change2 = function() {};

	self.make = function() {

		var height = self.attr('data-height');
		self.html('<div class="ui-codemirror"></div>');

		var container = self.find('.ui-codemirror');
		maxlength = (self.attr('data-maxlength') || '').parseInt();

		if (isMOBILE) {
			self.append('<textarea maxlength="{0}" placeholder="{1}"></textarea>'.format(maxlength, self.attr('data-placeholder')));
			editor = self.find('textarea');

			editor.getSelection = function() {
				return editor.val();
			};

			editor.getValue = function() {
				return editor.val();
			};

			editor.replaceSelection = function(val) {
				insertTextarea(editor.get(0), val);
			};

			editor.on('keypress', function() {
				if (isTyping) {
					setTimeout2(self.id + 'typing', function() {
						isTyping = false;
					}, 5000);
					return;
				}
				isTyping = true;
				self.typing();
			});

			editor.on('keydown', function(e) {

				if (e.keyCode === 13 && (e.metaKey || e.ctrlKey)) {
					self.enter(1) !== CodeMirror.Pass && e.preventDefault();
					return;
				}

				if (e.keyCode === 13) {
					self.enter(0) !== CodeMirror.Pass && e.preventDefault();
					return;
				}

				if (e.keyCode === 27) {
					self.edit(false);
					return;
				}

				if (e.keyCode === 38) {
					!editor.val() && self.edit(true);
					return;
				}
			});

			editor.on('change', function() {
				if (self.release())
					return;

				setTimeout2(self.id, function() {
					var val = editor.val();
					skipA = true;
					self.reset(true);
					self.dirty(false);
					self.set(val);
					CACHE('codemirror.' + NAVIGATION.url, val, '7 days');
				}, 200);
			});

			return;
		}

		var options = {};

		options.autoSuggest = [];
		options.autoSuggest.push({
			mode: 'markdown',
			startChar: '@',
			listCallback: function(linker) {
				var reg = /-/g;
				linker = linker.replace(reg, '');
				var arr = [];
				if (current.route.type === 'user') {
					arr.push({ text: current.route.item.linker, displayText: current.route.item.name });
				} else {
					if (common.history && common.history.length) {
						var has = {};
						common.history.forEach(function(item) {
							if (!has[item.user.id] && item.user.id !== user.id && item.user.linker.replace(reg, '').indexOf(linker) !== -1) {
								has[item.user.id] = true;
								arr.push({ text: item.user.linker, displayText: item.user.name });
							}
						});
					} else {
						for (var i = 0, length = current.users.length; i < length; i++) {
							if (arr.length > 9)
								break;
							var item = current.users[i];
							if (item.id !== user.id && item.linker.replace(reg, '').indexOf(linker) !== -1)
								arr.push({ text: item.linker, displayText: item.name });
						}
					}
				}
				arr.length && arr.quicksort('displayText');
				return arr;
			}
		});

		options.lineNumbers = self.attr('data-linenumbers') === 'true';
		options.lineWrapping = true;
		options.mode = self.attr('data-type') || 'htmlmixed';
		options.indentUnit = 4;
		options.placeholder = self.attr('data-placeholder');
		options.extraKeys = {};

		options.extraKeys['Enter'] = function() {
			return self.enter(0);
		};

		options.extraKeys['Cmd-Enter'] = function() {
			return self.enter(1);
		};

		options.extraKeys['Up'] = function() {
			if (editor.getValue())
				return CodeMirror.Pass;
			self.edit(true);
		};
		options.extraKeys['Esc'] = function() {
			self.edit(false);
			return CodeMirror.pass;
		};

		options.extraKeys['Ctrl-Enter'] = function() {
			return self.enter(1);
		};

		editor = CodeMirror(container.get(0), options);
/*
		var linker = /\w/;
		var pos = -1;

		editor.on('inputRead', function(editor, change) {
			// console.log(change);

			if (change.text[0] === '@') {
				pos = change.from.ch + 1;
				return CodeMirror.Pass;
			}

			if (pos > change.from.ch)
				pos = -1;

			console.log(pos, change.from.ch);
		});
		*/

		editor.on('dragover', function() {
			self.element.addClass('ui-codemirror-dragdrop');
		});

		editor.on('dragleave', function() {
			self.element.removeClass('ui-codemirror-dragdrop');
		});

		editor.on('drop', function(editor, e) {
			self.element.removeClass('ui-codemirror-dragdrop');
			self.upload(editor, e);
		});

		maxlength && editor.setOption('maxlength', maxlength);

		editor.on('update', function() {
			var h = editor.getScrollerElement().clientHeight;
			if (currentH !== h) {
				currentH = h;
				EMIT('resize');
			}
		});

		editor.on('keypress', function(e) {

			if (isTyping) {
				setTimeout2(self.id + 'typing', function() {
					isTyping = false;
				}, 5000);
				return;
			}
			isTyping = true;
			self.typing();
		});

		height !== 'auto' && editor.setSize('100%', height || '100px');

		editor.on('change', function(a, b) {

			if (self.release())
				return;

			if (skipB && b.origin !== 'paste') {
				skipB = false;
				return;
			}

			setTimeout2(self.id, function() {
				var val = editor.getValue();
				skipA = true;
				self.reset(true);
				self.dirty(false);
				self.set(val);
				CACHE('codemirror.' + NAVIGATION.url, val, '7 days');
			}, 200);
		});

		editor.on('beforeChange', function(cm, change) {
			var maxlength = cm.getOption('maxlength');
			if (maxlength && change.update) {
				var str = change.text.join('\n');
				var delta = str.length-(cm.indexFromPos(change.to) - cm.indexFromPos(change.from));
				if (delta <= 0)
					return true;
				delta = cm.getValue().length + delta - maxlength;
				if (delta) {
					str = str.substr(0, str.length - delta);
					change.update(change.from, change.to, str.split('\n'));
				}
			}
		});

		skipB = true;
	};

	self.reload = function() {
		var val = CACHE('codemirror.' + NAVIGATION.url) || '';
		setTimeout2(self.id, function() {
			self.set(val);
		}, 500);
	};

	self.setter = function(value, path, type) {

		if (skipA === true) {
			skipA = false;
			return;
		}

		type && CACHE('codemirror.' + NAVIGATION.url, value, '7 days');

		if (isMOBILE) {
			editor.val(value || '');
			return;
		}

		skipB = true;
		editor.setValue(value || '');
		editor.refresh();
		skipB = true;

		CodeMirror.commands['selectAll'](editor);
		skipB = true;
		editor.setValue(editor.getValue());
		editor.setCursor(editor.lineCount(), 0);
		skipB = true;

		setTimeout(function() {
			editor.refresh();
		}, 200);

		setTimeout(function() {
			editor.refresh();
		}, 1000);
	};

	self.state = function() {
		self.find('.ui-codemirror').toggleClass('ui-codemirror-invalid', self.isInvalid());
	};
});

COMPONENT('confirm', function() {
	var self = this;
	var is = false;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.toggle('ui-confirm hidden', true);
		self.event('click', 'button', function() {
			self.hide($(this).attr('data-index').parseInt());
		});

		self.event('click', function(e) {
			if (e.target.tagName !== 'DIV')
				return;
			var el = self.find('.ui-confirm-body');
			el.addClass('ui-confirm-click');
			setTimeout(function() {
				el.removeClass('ui-confirm-click');
			}, 300);
		});
	};

	self.confirm = function(message, buttons, fn) {
		self.callback = fn;

		var builder = [];

		buttons.forEach(function(item, index) {
			builder.push('<button data-index="{1}">{0}</button>'.format(item, index));
		});

		self.content('ui-confirm-warning', '<div class="ui-confirm-message">{0}</div>{1}'.format(message.replace(/\n/g, '<br />'), builder.join('')));
	};

	self.hide = function(index) {
		self.callback && self.callback(index);
		self.classes('-ui-confirm-visible');
		setTimeout2(self.id, function() {
			self.classes('hidden');
		}, 1000);
	};

	self.content = function(cls, text) {
		!is && self.html('<div><div class="ui-confirm-body"></div></div>');
		self.find('.ui-confirm-body').empty().append(text);
		self.classes('-hidden');
		setTimeout2(self.id, function() {
			self.classes('ui-confirm-visible');
		}, 5);
	};
});

COMPONENT('loading', function() {
	var self = this;
	var pointer;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.classes('ui-loading');
	};

	self.show = function() {
		clearTimeout(pointer);
		self.classes('-hidden');
		return self;
	};

	self.hide = function(timeout) {
		clearTimeout(pointer);
		pointer = setTimeout(function() {
			self.classes('+hidden');
		}, timeout || 1);
		return self;
	};
});

COMPONENT('search', function() {

	var self = this;
	var options_class;
	var options_selector;
	var options_attribute;
	var options_delay;

	self.readonly();
	self.make = function() {
		options_class = self.attr('data-class') || 'hidden';
		options_selector = self.attr('data-selector');
		options_attribute = self.attr('data-attribute') || 'data-search';
		options_delay = (self.attr('data-delay') || '200').parseInt();
	};

	self.setter = function(value) {

		if (!options_selector || !options_attribute || value == null)
			return;

		KEYPRESS(function() {

			var elements = self.find(options_selector);

			if (!value) {
				elements.removeClass(options_class);
				return;
			}

			var search = value.toLowerCase().toSearch();
			var hide = [];
			var show = [];

			elements.toArray().waitFor(function(item, next) {
				var el = $(item);
				var val = (el.attr(options_attribute) || '').toSearch();
				if (val.indexOf(search) === -1)
					hide.push(el);
				else
					show.push(el);
				next();
			}, function() {

				hide.forEach(function(item) {
					item.toggleClass(options_class, true);
				});

				show.forEach(function(item) {
					item.toggleClass(options_class, false);
				});
			});

		}, options_delay, 'search' + self.id);
	};
});

COMPONENT('binder', function() {

	var self = this;
	var keys;
	var keys_unique;

	self.readonly();
	self.blind();

	self.make = function() {
		self.watch('*', self.autobind);
		self.scan();

		self.on('component', function() {
			setTimeout2(self.id, self.scan, 200);
		});

		self.on('destroy', function() {
			setTimeout2(self.id, self.scan, 200);
		});
	};

	self.autobind = function(path) {
		var mapper = keys[path];
		var template = {};
		mapper && mapper.forEach(function(item) {
			var value = self.get(item.path);
			template.value = value;
			item.classes && classes(item.element, item.classes(value));
			item.visible && item.element.toggleClass('hidden', item.visible(value) ? false : true);
			item.html && item.element.html(item.html(value));
			item.template && item.element.html(item.template(template));
		});
	};

	function classes(element, val) {
		var add = '';
		var rem = '';
		val.split(' ').forEach(function(item) {
			switch (item.substring(0, 1)) {
				case '+':
					add += (add ? ' ' : '') + item.substring(1);
					break;
				case '-':
					rem += (rem ? ' ' : '') + item.substring(1);
					break;
				default:
					add += (add ? ' ' : '') + item;
					break;
			}
		});
		rem && element.removeClass(rem);
		add && element.addClass(add);
	}

	function decode(val) {
		return val.replace(/\&\#39;/g, '\'');
	}

	self.prepare = function(code) {
		return code.indexOf('=>') === -1 ? FN('value=>' + decode(code)) : FN(decode(code));
	};

	self.scan = function() {
		keys = {};
		keys_unique = {};
		self.find('[data-b]').each(function() {

			var el = $(this);
			var path = el.attr('data-b');
			var arr = path.split('.');
			var p = '';

			var classes = el.attr('data-b-class');
			var html = el.attr('data-b-html');
			var visible = el.attr('data-b-visible');
			var obj = el.data('data-b');

			keys_unique[path] = true;

			if (!obj) {
				obj = {};
				obj.path = path;
				obj.element = el;
				obj.classes = classes ? self.prepare(classes) : undefined;
				obj.visible = visible ? self.prepare(visible) : undefined;

				if (self.attr('data-b-template') === 'true') {
					var tmp = el.find('script[type="text/html"]');
					var str = '';
					if (tmp.length)
						str = tmp.html();
					else
						str = el.html();
					if (str.indexOf('{{') !== -1) {
						obj.template = Tangular.compile(str);
						tmp.length && tmp.remove();
					}
				} else
					obj.html = html ? self.prepare(html) : undefined;

				el.data('data-b', obj);
			}

			for (var i = 0, length = arr.length; i < length; i++) {
				p += (p ? '.' : '') + arr[i];
				if (keys[p])
					keys[p].push(obj);
				else
					keys[p] = [obj];
			}
		});

		Object.keys(keys_unique).forEach(function(key) {
			self.autobind(key, self.get(key));
		});

		return self;
	};
});

COMPONENT('websocket', function() {

	var reconnect_timeout;
	var self = this;
	var ws, url;
	var queue = [];
	var sending = false;

	self.online = false;
	self.readonly();

	self.make = function() {
		reconnect_timeout = (self.attr('data-reconnect') || '2000').parseInt();
		url = self.attr('data-url');
		if (!url.match(/^(ws|wss)\:\/\//))
			url = (location.protocol.length === 6 ? 'wss' : 'ws') + '://' + location.host + (url.substring(0, 1) !== '/' ? '/' : '') + url;
		setTimeout(self.connect, 500);
		self.destroy = self.close;
	};

	self.send = function(obj) {
		queue.push(encodeURIComponent(JSON.stringify(obj)));
		self.process();
		return self;
	};

	self.process = function(callback) {

		if (!ws || sending || !queue.length || ws.readyState !== 1) {
			callback && callback();
			return;
		}

		sending = true;
		var async = queue.splice(0, 3);
		async.waitFor(function(item, next) {
			ws.send(item);
			setTimeout(next, 5);
		}, function() {
			callback && callback();
			sending = false;
			queue.length && self.process();
		});
	};

	self.close = function(isClosed) {
		if (!ws)
			return self;
		self.online = false;
		ws.onopen = ws.onclose = ws.onmessage = null;
		!isClosed && ws.close();
		ws = null;
		EMIT('online', false);
		return self;
	};

	function onClose() {
		self.close(true);
		setTimeout(self.connect, reconnect_timeout);
	}

	function onMessage(e) {
		var data;
		try {
			data = JSON.parse(decodeURIComponent(e.data));
			self.attr('data-jc-path') && self.set(data);
		} catch (e) {
			window.console && console.warn('WebSocket "{0}": {1}'.format(url, e.toString()));
		}
		data && EMIT('message', data);
	}

	function onOpen() {
		self.online = true;
		self.process(function() {
			EMIT('online', true);
		});
	}

	self.connect = function() {
		ws && self.close();
		setTimeout2(self.id, function() {
			ws = new WebSocket(url);
			ws.onopen = onOpen;
			ws.onclose = onClose;
			ws.onmessage = onMessage;
		}, 100);
		return self;
	};
});

COMPONENT('typing', function() {
	var self = this;
	var cache = {};
	var empty = true;
	var count = 0;
	var max;

	self.readonly();

	self.make = function() {

		max = (self.attr('data-max') || '4').parseInt();

		self.classes('ui-typing hidden-xs');
		var scr = self.find('script');
		self.template = Tangular.compile(scr.html());
		scr.remove();
		setInterval(function() {
			if (empty)
				return;
			var dt = new Date();
			Object.keys(cache).forEach(function(id) {
				if (cache[id] > dt)
					return;
				delete cache[id];
				count--;
				self.find('div[data-id="{0}"]'.format(id)).remove();
			});
		}, 5000);
	};

	self.clear = function() {
		count = 0;
		cache = {};
		self.empty();
	};

	self.insert = function(user) {
		if (count > max)
			return;
		var is = cache[user.id] ? true : false;
		cache[user.id] = new Date().add('5 seconds');
		empty = false;
		count++;
		!is && self.append(self.template(user));
	};
});

COMPONENT('importer', function() {
	var self = this;
	var imported = false;
	var reload = self.attr('data-reload');

	self.readonly();
	self.setter = function() {

		if (!self.evaluate(self.attr('data-if')))
			return;

		if (imported) {
			if (reload)
				EXEC(reload);
			else
				self.setter = null;
			return;
		}

		imported = true;
		IMPORT(self.attr('data-url'), function() {
			if (reload)
				EXEC(reload);
			else
				self.remove();
		});
	};
});

COMPONENT('audio', function() {
	var self = this;
	var can = false;
	var volume = 0.5;
	var cache = {};

	self.items = [];
	self.readonly();
	self.singleton();

	self.make = function() {
		var audio = document.createElement('audio');
		if (audio.canPlayType && audio.canPlayType('audio/mpeg').replace(/no/, ''))
			can = true;
	};

	self.play = function(url) {

		if (!can || cache[url])
			return;

		var audio = new window.Audio();

		audio.src = url;
		audio.volume = volume;
		audio.play();
		cache[url] = true;

		audio.onended = function() {
			audio.$destroy = true;
			delete cache[url];
			self.cleaner();
		};

		audio.onerror = function() {
			audio.$destroy = true;
			delete cache[url];
			self.cleaner();
		};

		audio.onabort = function() {
			audio.$destroy = true;
			delete cache[url];
			self.cleaner();
		};

		self.items.push(audio);
		return self;
	};

	self.cleaner = function() {
		var index = 0;
		while (true) {
			var item = self.items[index++];
			if (item === undefined)
				return self;
			if (!item.$destroy)
				continue;
			item.pause();
			item.onended = null;
			item.onerror = null;
			item.onsuspend = null;
			item.onabort = null;
			item = null;
			index--;
			self.items.splice(index, 1);
		}
	};

	self.stop = function(url) {

		delete cache[url];

		if (!url) {
			self.items.forEach(function(item) {
				item.$destroy = true;
			});
			return self.cleaner();
		}

		var index = self.items.findIndex('src', url);
		if (index === -1)
			return self;
		self.items[index].$destroy = true;
		return self.cleaner();
	};

	self.setter = function(value) {

		if (value === undefined)
			value = 0.5;
		else
			value = (value / 100);

		if (value > 1)
			value = 1;
		else if (value < 0)
			value = 0;

		volume = value ? +value : 0;
		for (var i = 0, length = self.items.length; i < length; i++) {
			var a = self.items[i];
			if (!a.$destroy)
				a.volume = value;
		}
	};
});

COMPONENT('pictureupload', function() {

	var self = this;
	var width = +self.attr('data-width');
	var height = +self.attr('data-height');
	var url = self.attr('data-url') || location.pathname;
	var empty;
	var img;

	self.noValidate();

	self.make = function() {

		var canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;

		var bg = self.attr('data-background');
		if (bg) {
			var ctx = canvas.getContext('2d');
			ctx.fillStyle = bg;
			ctx.fillRect(0, 0, width, height);
		}

		empty = canvas.toDataURL('image/png');
		canvas = null;

		var html = self.html();
		var icon = self.attr('data-icon');
		self.toggle('ui-pictureupload');
		self.html((html ? '<div class="ui-pictureupload-label">{0}{1}:</div>'.format(icon ? '<i class="fa {0}"></i>'.format(icon) : '', html) : '') + '<input type="file" accept="image/*" class="hidden" /><img src="{0}" class="img-responsive" alt="" />'.format(empty, width, height));

		img = self.find('img');

		img.on('click', function() {
			self.find('input').trigger('click');
		});

		self.event('change', 'input', function(evt) {
			self.upload(evt.target.files);
		});

		self.event('dragenter dragover dragexit drop dragleave', function (e) {

			e.stopPropagation();
			e.preventDefault();

			switch (e.type) {
				case 'drop':
					break;
				case 'dragenter':
				case 'dragover':
					return;
				case 'dragexit':
				case 'dragleave':
				default:
					return;
			}

			self.upload(e.originalEvent.dataTransfer.files);
		});
	};

	self.upload = function(files) {

		if (!files.length)
			return;

		var el = this;
		var data = new FormData();
		data.append('file', files[0]);
		data.append('width', width);
		data.append('height', height);

		UPLOAD(url, data, function(response, err) {

			SETTER('loading', 'hide', 100);

			if (err) {
				SETTER('message', 'warning', self.attr('data-error-large'));
				return;
			}

			el.value = '';
			self.set(response, undefined, 2);
			self.change(true);
		});
	};

	self.setter = function(value) {
		if (value)
			img.attr('src', (self.attr('data-path') || '{0}').format(value));
		else
			img.attr('src', empty);
	};
});

COMPONENT('nativenotifications', function() {
	var self = this;
	var autoclosing;
	var system = false;
	var N = window.Notification;

	self.singleton();
	self.readonly();
	self.items = [];

	self.make = function() {
		if (!N)
			return;
		system = N.permission === 'granted';
		!system && N.requestPermission(function (permission) {
			system = permission === 'granted';
		});
	};

	self.append = function(title, message, callback, img) {

		if (!system || !self.get())
			return;

		var obj = { id: Math.floor(Math.random() * 100000), date: new Date(), callback: callback };
		var options = {};

		options.body = message.replace(/(<([^>]+)>)/ig, '');
		self.items.push(obj);

		self.autoclose();

		if (img === undefined)
			options.icon = '/icon.png';
		else if (img != null)
			options.icon = img;

		obj.system = new N(title, options);
		obj.system.onclick = function() {

			window.focus();
			self.items = self.items.remove('id', obj.id);

			if (obj.callback) {
				obj.callback();
				obj.callback = null;
			}

			obj.system.close();
			obj.system.onclick = null;
			obj.system = null;
		};
	};

	self.autoclose = function() {

		if (autoclosing)
			return self;

		autoclosing = setTimeout(function() {
			clearTimeout(autoclosing);
			autoclosing = null;
			var obj = self.items.shift();
			if (obj) {
				obj.system.onclick = null;
				obj.system.close();
				obj.system = null;
			}
			self.items.length && self.autoclose();
		}, +self.attr('data-timeout') || 8000);
	};
});

COMPONENT('clipboardimage', function() {

	var self = this;
	var ctx, img, canvas, maxW, maxH, quality;

	self.singleton();
	self.readonly();
	self.blind();

	self.make = function() {
		self.classes('hidden');
		self.append('<canvas></canvas><img src="data:image/png;base64,R0lGODdhAQABAIAAAHnrWAAAACH5BAEAAAEALAAAAAABAAEAAAICTAEAOw==" />');
		canvas = self.find('canvas').get(0);
		ctx = canvas.getContext('2d');
		img = self.find('img').get(0);
		maxW = (self.attr('data-width') || '1280').parseInt();
		maxH = (self.attr('data-height') || '1024').parseInt();
		quality = (self.attr('data-quality') || '90').parseInt() * 0.01;

		$(window).on('paste', function(e) {
			var item = e.originalEvent.clipboardData.items[0];
			if (item.kind !== 'file' || item.type.substring(0, 5) !== 'image')
				return;
			var blob = item.getAsFile();
			var reader = new FileReader();
			reader.onload = function(e) {
				img.onload = function() {
					self.resize();
				};
				img.src = e.target.result;
			};
			reader.readAsDataURL(blob);
		});
	};

	self.resize = function() {
		var dpr = window.devicePixelRatio;

		if (dpr > 1) {
			canvas.width = img.width / dpr;
			canvas.height = img.height / dpr;
		} else {
			canvas.width = img.width;
			canvas.height = img.height;
		}

		if (canvas.width > maxW) {
			canvas.width = maxW;
			canvas.height = (maxW / (img.width / img.height)) >> 0;
		} else if (canvas.height > maxH) {
			canvas.height = maxH;
			canvas.width = (maxH / (img.width / img.height)) >> 0;
		}

		ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
		EMIT('clipboardimage', canvas.toDataURL('image/jpeg', quality));
	};
});

COMPONENT('fontawesome', function() {
	var self = this;
	var icons = '500px,address-book,address-book-o,address-card,address-card-o,adjust,adn,align-center,align-justify,align-left,align-right,amazon,ambulance,american-sign-language-interpreting,anchor,android,angellist,angle-double-down,angle-double-left,angle-double-right,angle-double-up,angle-down,angle-left,angle-right,angle-up,apple,archive,area-chart,arrow-circle-down,arrow-circle-left,arrow-circle-o-down,arrow-circle-o-left,arrow-circle-o-right,arrow-circle-o-up,arrow-circle-right,arrow-circle-up,arrow-down,arrow-left,arrow-right,arrow-up,arrows,arrows-alt,arrows-h,arrows-v,asl-interpreting,assistive-listening-systems,asterisk,at,audio-description,automobile,backward,balance-scale,ban,bandcamp,bank,bar-chart,bar-chart-o,barcode,bars,bath,bathtub,battery,battery-0,battery-1,battery-2,battery-3,battery-4,battery-empty,battery-full,battery-half,battery-quarter,battery-three-quarters,bed,beer,behance,behance-square,bell,bell-o,bell-slash,bell-slash-o,bicycle,binoculars,birthday-cake,bitbucket,bitbucket-square,bitcoin,black-tie,blind,bluetooth,bluetooth-b,bold,bolt,bomb,book,bookmark,bookmark-o,braille,briefcase,btc,bug,building,building-o,bullhorn,bullseye,bus,buysellads,cab,calculator,calendar,calendar-check-o,calendar-minus-o,calendar-o,calendar-plus-o,calendar-times-o,camera,camera-retro,car,caret-down,caret-left,caret-right,caret-square-o-down,caret-square-o-left,caret-square-o-right,caret-square-o-up,caret-up,cart-arrow-down,cart-plus,cc,cc-amex,cc-diners-club,cc-discover,cc-jcb,cc-mastercard,cc-paypal,cc-stripe,cc-visa,certificate,chain,chain-broken,check,check-circle,check-circle-o,check-square,check-square-o,chevron-circle-down,chevron-circle-left,chevron-circle-right,chevron-circle-up,chevron-down,chevron-left,chevron-right,chevron-up,child,chrome,circle,circle-o,circle-o-notch,circle-thin,clipboard,clock-o,clone,close,cloud,cloud-download,cloud-upload,cny,code,code-fork,codepen,codiepie,coffee,cog,cogs,columns,comment,comment-o,commenting,commenting-o,comments,comments-o,compass,compress,connectdevelop,contao,copy,copyright,creative-commons,credit-card,credit-card-alt,crop,crosshairs,css3,cube,cubes,cut,cutlery,dashboard,dashcube,database,deaf,deafness,dedent,delicious,desktop,deviantart,diamond,digg,dollar,dot-circle-o,download,dribbble,drivers-license,drivers-license-o,dropbox,drupal,edge,edit,eercast,eject,ellipsis-h,ellipsis-v,empire,envelope,envelope-o,envelope-open,envelope-open-o,envelope-square,envira,eraser,etsy,eur,euro,exchange,exclamation,exclamation-circle,exclamation-triangle,expand,expeditedssl,external-link,external-link-square,eye,eye-slash,eyedropper,fa,facebook,facebook-f,facebook-official,facebook-square,fast-backward,fast-forward,fax,feed,female,fighter-jet,file,file-archive-o,file-audio-o,file-code-o,file-excel-o,file-image-o,file-movie-o,file-o,file-pdf-o,file-photo-o,file-picture-o,file-powerpoint-o,file-sound-o,file-text,file-text-o,file-video-o,file-word-o,file-zip-o,files-o,film,filter,fire,fire-extinguisher,firefox,first-order,flag,flag-checkered,flag-o,flash,flask,flickr,floppy-o,folder,folder-o,folder-open,folder-open-o,font,font-awesome,fonticons,fort-awesome,forumbee,forward,foursquare,free-code-camp,frown-o,futbol-o,gamepad,gavel,gbp,ge,gear,gears,genderless,get-pocket,gg,gg-circle,gift,git,git-square,github,github-alt,github-square,gitlab,gittip,glass,glide,glide-g,globe,google,google-plus,google-plus-circle,google-plus-official,google-plus-square,google-wallet,graduation-cap,gratipay,grav,group,h-square,hacker-news,hand-grab-o,hand-lizard-o,hand-o-down,hand-o-left,hand-o-right,hand-o-up,hand-paper-o,hand-peace-o,hand-pointer-o,hand-rock-o,hand-scissors-o,hand-spock-o,hand-stop-o,handshake-o,hard-of-hearing,hashtag,hdd-o,header,headphones,heart,heart-o,heartbeat,history,home,hospital-o,hotel,hourglass,hourglass-1,hourglass-2,hourglass-3,hourglass-end,hourglass-half,hourglass-o,hourglass-start,houzz,html5,i-cursor,id-badge,id-card,id-card-o,ils,image,imdb,inbox,indent,industry,info,info-circle,inr,instagram,institution,internet-explorer,intersex,ioxhost,italic,joomla,jpy,jsfiddle,key,keyboard-o,krw,language,laptop,lastfm,lastfm-square,leaf,leanpub,legal,lemon-o,level-down,level-up,life-bouy,life-buoy,life-ring,life-saver,lightbulb-o,line-chart,link,linkedin,linkedin-square,linode,linux,list,list-alt,list-ol,list-ul,location-arrow,lock,long-arrow-down,long-arrow-left,long-arrow-right,long-arrow-up,low-vision,magic,magnet,mail-forward,mail-reply,mail-reply-all,male,map,map-marker,map-o,map-pin,map-signs,mars,mars-double,mars-stroke,mars-stroke-h,mars-stroke-v,maxcdn,meanpath,medium,medkit,meetup,meh-o,mercury,microchip,microphone,microphone-slash,minus,minus-circle,minus-square,minus-square-o,mixcloud,mobile,mobile-phone,modx,money,moon-o,mortar-board,motorcycle,mouse-pointer,music,navicon,neuter,newspaper-o,object-group,object-ungroup,odnoklassniki,odnoklassniki-square,opencart,openid,opera,optin-monster,outdent,pagelines,paint-brush,paper-plane,paper-plane-o,paperclip,paragraph,paste,pause,pause-circle,pause-circle-o,paw,paypal,pencil,pencil-square,pencil-square-o,percent,phone,phone-square,photo,picture-o,pie-chart,pied-piper,pied-piper-alt,pied-piper-pp,pinterest,pinterest-p,pinterest-square,plane,play,play-circle,play-circle-o,plug,plus,plus-circle,plus-square,plus-square-o,podcast,power-off,print,product-hunt,puzzle-piece,qq,qrcode,question,question-circle,question-circle-o,quora,quote-left,quote-right,ra,random,ravelry,rebel,recycle,reddit,reddit-alien,reddit-square,refresh,registered,remove,renren,reorder,repeat,reply,reply-all,resistance,retweet,rmb,road,rocket,rotate-left,rotate-right,rouble,rss,rss-square,rub,ruble,rupee,s15,safari,save,scissors,scribd,search,search-minus,search-plus,sellsy,send,send-o,server,share,share-alt,share-alt-square,share-square,share-square-o,shekel,sheqel,shield,ship,shirtsinbulk,shopping-bag,shopping-basket,shopping-cart,shower,sign-in,sign-language,sign-out,signal,signing,simplybuilt,sitemap,skyatlas,skype,slack,sliders,slideshare,smile-o,snapchat,snapchat-ghost,snapchat-square,snowflake-o,soccer-ball-o,sort,sort-alpha-asc,sort-alpha-desc,sort-amount-asc,sort-amount-desc,sort-asc,sort-desc,sort-down,sort-numeric-asc,sort-numeric-desc,sort-up,soundcloud,space-shuttle,spinner,spoon,spotify,square,square-o,stack-exchange,stack-overflow,star,star-half,star-half-empty,star-half-full,star-half-o,star-o,steam,steam-square,step-backward,step-forward,stethoscope,sticky-note,sticky-note-o,stop,stop-circle,stop-circle-o,street-view,strikethrough,stumbleupon,stumbleupon-circle,subscript,subway,suitcase,sun-o,superpowers,superscript,support,table,tablet,tachometer,tag,tags,tasks,taxi,telegram,television,tencent-weibo,terminal,text-height,text-width,th,th-large,th-list,themeisle,thermometer,thermometer-0,thermometer-1,thermometer-2,thermometer-3,thermometer-4,thermometer-empty,thermometer-full,thermometer-half,thermometer-quarter,thermometer-three-quarters,thumb-tack,thumbs-down,thumbs-o-down,thumbs-o-up,thumbs-up,ticket,times,times-circle,times-circle-o,times-rectangle,times-rectangle-o,tint,toggle-down,toggle-left,toggle-off,toggle-on,toggle-right,toggle-up,trademark,train,transgender,transgender-alt,trash,trash-o,tree,trello,tripadvisor,trophy,truck,try,tty,tumblr,tumblr-square,turkish-lira,tv,twitch,twitter,twitter-square,umbrella,underline,undo,universal-access,university,unlink,unlock,unlock-alt,unsorted,upload,usb,usd,user,user-circle,user-circle-o,user-md,user-o,user-plus,user-secret,user-times,users,vcard,vcard-o,venus,venus-double,venus-mars,viacoin,viadeo,viadeo-square,video-camera,vimeo,vimeo-square,vine,vk,volume-control-phone,volume-down,volume-off,volume-up,warning,wechat,weibo,weixin,whatsapp,wheelchair,wheelchair-alt,wifi,wikipedia-w,window-close,window-close-o,window-maximize,window-minimize,window-restore,windows,won,wordpress,wpbeginner,wpexplorer,wpforms,wrench,xing,xing-square,y-combinator,y-combinator-square,yahoo,yc,yc-square,yelp,yen,yoast,youtube,youtube-play,youtube-square'.split(',');
	var container, recent, input, icon;
	var template = '<li data-search="{0}"><i class="fa fa-{0}"></i></li>';
	var opener = {};
	var is = false;

	self.singleton();
	self.readonly();
	self.blind();

	self.make = function() {
		self.classes('ui-fontawesome hidden');
		self.append('<div class="ui-fontawesome-search"><span><i class="fa fa-search clearsearch"></i></span><div><input type="text" maxlength="50" placeholder="{0}" /></div></div><div></div><ul class="ui-fontawesome-recentlist hidden"></ul><div class="ui-fontawesome-icons"><ul></ul></div>'.format(self.attr('data-search')));
		container = $(self.find('.ui-fontawesome-icons').find('ul').get(0));
		recent = $(self.find('.ui-fontawesome-recentlist').get(0));
		input = self.find('input');
		icon = self.find('.ui-fontawesome-search').find('.fa');

		self.event('click', '.clearsearch', function() {
			input.val('').trigger('keydown');
		});

		self.event('click', 'li', function() {
			var icon = $(this).find('.fa').attr('class').replace('fa ', '');

			var recent = CACHE(self.name) || [];
			var item = recent.findItem('name', icon);
			if (item) {
				item.count++;
				recent.quicksort('count', false);
			} else {
				recent.length > 13 && recent.pop();
				recent.push({ name: icon, count: 1 });
			}

			CACHE(self.name, recent, '1 month');
			self.hide();
			opener.callback && opener.callback(icon, opener.target);
			EMIT('fontawesome', icon, opener.target);
		});

		self.event('keydown', 'input', function() {
			var self = this;
			setTimeout2(self.id, function() {
				var hide = [];
				var show = [];
				var value = self.value.toSearch();
				container.find('li').each(function() {
					if (value && this.getAttribute('data-search').toSearch().indexOf(value) === -1)
						hide.push(this);
					else
						show.push(this);
				});
				$(hide).addClass('hidden');
				$(show).removeClass('hidden');
				icon.toggleClass('fa-times', value ? true : false).toggleClass('fa-search', value ? false : true);
			}, 300);
		});

		self.on('reflow', function() {
			is && self.hide();
		});
		self.on('resize', function() {
			is && self.hide();
		});
	};

	self.render = function() {
		var builder = [];
		for (var i = 0, length = icons.length; i < length; i++)
			builder.push(template.format(icons[i]));
		container.empty().html(builder.join(''));
	};

	self.clear = function() {
		container.empty();
		recent.empty();
	};

	self.hide = function() {
		if (!is)
			return;
		self.classes('hidden');
		self.clear();
		input.val('');
		icon.removeClass('fa-times').addClass('fa-search');
		is = false;
	};

	self.show = function(x, y, target, callback) {

		if (is && opener.x === x && opener.y === y) {
			opener.x = null;
			opener.y = null;
			self.hide();
			return;
		}

		if (typeof(target) === 'function') {
			callback = target;
			target = null;
		}

		opener.callback = callback;
		opener.target = target;
		opener.x = x;
		opener.y = y;

		if (!is) {
			self.render();
			self.render_recent();
		}

		is = true;
		self.element.css({ left: x, top: y }).removeClass('hidden');
		!isMOBILE && input.focus();
	};

	self.render_recent = function() {
		var items = CACHE(self.name);
		if (items) {
			var builder = [];
			items.forEach(function(item, index) {
				index < 13 && builder.push(template.format(item.name.replace('fa-', '')));
			});
			recent.empty().html(builder.join('')).removeClass('hidden');
		} else
			recent.addClass('hidden');
		self.toggle('ui-fontawesome-recent', items && items.length ? true : false);
	};

});

COMPONENT('nosqlcounter', function() {
	var self = this;
	var count = (self.attr('data-count') || '0').parseInt();
	var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

	self.readonly();
	self.make = function() {
		self.toggle('ui-nosqlcounter hidden', true);
		var calendar = FIND('calendar');
		calendar && (months = calendar.months);
	};

	self.setter = function(value) {

		var is = !value || !value.length;
		self.toggle('hidden', is);

		if (is)
			return self.empty();

		var maxbars = 12;

		if (count === 0)
			maxbars = self.element.width() / 30 >> 0;
		else
			maxbars = count;

		if (WIDTH() === 'xs')
			maxbars = maxbars / 2;

		var dt = new Date();
		var current = dt.format('yyyyMM');
		var stats = null;

		if (self.attr('data-lastvalues') === 'true') {
			var max = value.length - maxbars;
			if (max < 0)
				max = 0;
			stats = value.slice(max, value.length);
		} else {
			stats = [];
			for (var i = 0; i < maxbars; i++) {
				var id = dt.format('yyyyMM');
				var item = value.findItem('id', id);
				stats.push(item ? item : { id: id, month: dt.getMonth() + 1, year: dt.getFullYear(), value: 0 });
				dt = dt.add('-1 month');
			}
			stats.reverse();
		}

		var max = stats.scalar('max', 'value');
		var bar = 100 / maxbars;
		var builder = [];
		var cls = '';

		stats.forEach(function(item, index) {
			var val = item.value;
			if (val > 999)
				val = (val / 1000).format(1, 2) + 'K';

			var h = (item.value / max) * 60;
			h += 40;

			cls = item.value ? '' : 'empty';

			if (item.id === current)
				cls += (cls ? ' ' : '') + 'current';

			if (index === maxbars - 1)
				cls += (cls ? ' ' : '') + 'last';

			builder.push('<div style="width:{0}%;height:{1}%" title="{3}" class="{4}"><span>{2}</span></div>'.format(bar.format(2, ''), h.format(0, ''), val, months[item.month - 1] + ' ' + item.year, cls));
		});

		self.html(builder);
	};
});

MAIN.parser(function(path, value, type) {

	if (type === 'date') {
		if (value instanceof Date)
			return value;

		if (!value)
			return null;

		var isEN = value.indexOf('.') === -1;
		var tmp = isEN ? value.split('-') : value.split('.');
		if (tmp.length !== 3)
			return null;
		var dt = isEN ? new Date(parseInt(tmp[0]) || 0, (parseInt(tmp[1], 10) || 0) - 1, parseInt(tmp[2], 10) || 0) : new Date(parseInt(tmp[2]) || 0, (parseInt(tmp[1], 10) || 0) - 1, parseInt(tmp[0], 10) || 0);
		return dt;
	}

	return value;
});

COMPONENT('calendar', function() {

	var self = this;
	var skip = false;
	var skipDay = false;
	var visible = false;

	self.days = self.attr('data-days').split(',');
	self.months = self.attr('data-months').split(',');
	self.first = parseInt(self.attr('data-firstday'));
	self.today = self.attr('data-today');
	self.months_short = [];

	for (var i = 0, length = self.months.length; i < length; i++) {
		var m = self.months[i];
		if (m.length > 4)
			m = m.substring(0, 3) + '.';
		self.months_short.push(m);
	}

	self.readonly();
	self.click = function() {};

	function getMonthDays(dt) {

		var m = dt.getMonth();
		var y = dt.getFullYear();

		if (m === -1) {
			m = 11;
			y--;
		}

		return (32 - new Date(y, m, 32).getDate());
	}

	function calculate(year, month, selected) {

		var d = new Date(year, month, 1);
		var output = { header: [], days: [], month: month, year: year };
		var firstDay = self.first;
		var firstCount = 0;
		var from = d.getDay() - firstDay;
		var today = new Date();
		var ty = today.getFullYear();
		var tm = today.getMonth();
		var td = today.getDate();
		var sy = selected ? selected.getFullYear() : -1;
		var sm = selected ? selected.getMonth() : -1;
		var sd = selected ? selected.getDate() : -1;
		var days = getMonthDays(d);

		if (from < 0)
			from = 7 + from;

		while (firstCount++ < 7) {
			output.header.push({ index: firstDay, name: self.days[firstDay] });
			firstDay++;
			if (firstDay > 6)
				firstDay = 0;
		}

		var index = 0;
		var indexEmpty = 0;
		var count = 0;
		var prev = getMonthDays(new Date(year, month - 1, 1)) - from;

		for (var i = 0; i < days + from; i++) {

			var obj = { isToday: false, isSelected: false, isEmpty: false, isFuture: false, number: 0, index: ++count };

			if (i >= from) {
				obj.number = ++index;
				obj.isSelected = sy === year && sm === month && sd === index;
				obj.isToday = ty === year && tm === month && td === index;
				obj.isFuture = ty < year;

				if (!obj.isFuture && year === ty) {
					if (tm < month)
						obj.isFuture = true;
					else if (tm === month)
						obj.isFuture = td < index;
				}

			} else {
				indexEmpty++;
				obj.number = prev + indexEmpty;
				obj.isEmpty = true;
			}

			output.days.push(obj);
		}

		indexEmpty = 0;
		for (var i = count; i < 42; i++)
			output.days.push({ isToday: false, isSelected: false, isEmpty: true, isFuture: false, number: ++indexEmpty, index: ++count });
		return output;
	}

	self.hide = function() {
		self.classes('hidden');
		visible = false;
		return self;
	};

	self.toggle = function(el, value, callback, offset) {
		if (self.element.hasClass('hidden'))
			self.show(el, value, callback, offset);
		else
			self.hide();
		return self;
	};

	self.show = function(el, value, callback, offset) {

		if (!el)
			return self.hide();

		var off = el.offset();
		var h = el.innerHeight();

		self.css({ left: off.left + (offset || 0), top: off.top + h + 12 }).removeClass('hidden');
		self.click = callback;
		self.date(value);
		visible = true;
		return self;
	};

	self.make = function() {

		self.classes('ui-calendar hidden');

		self.event('click', '.ui-calendar-today', function() {
			var dt = new Date();
			self.hide();
			self.click && self.click(dt);
		});

		self.event('click', '.ui-calendar-day', function() {
			var arr = this.getAttribute('data-date').split('-');
			var dt = new Date(parseInt(arr[0]), parseInt(arr[1]), parseInt(arr[2]));
			self.find('.ui-calendar-selected').removeClass('ui-calendar-selected');
			$(this).addClass('ui-calendar-selected');
			skip = true;
			self.hide();
			self.click && self.click(dt);
		});

		self.event('click', 'button', function(e) {

			e.preventDefault();
			e.stopPropagation();

			var arr = this.getAttribute('data-date').split('-');
			var dt = new Date(parseInt(arr[0]), parseInt(arr[1]), 1);
			switch (this.name) {
				case 'prev':
					dt.setMonth(dt.getMonth() - 1);
					break;
				case 'next':
					dt.setMonth(dt.getMonth() + 1);
					break;
			}
			skipDay = true;
			self.date(dt);
		});

		$(document.body).on('scroll', function() {
			visible && EXEC('$calendar.hide');
		});

		window.$calendar = self;

		self.on('reflow', function() {
			visible && EXEC('$calendar.hide');
		});
	};

	self.date = function(value) {

		if (typeof(value) === 'string')
			value = value.parseDate();

		var empty = !value;

		if (skipDay) {
			skipDay = false;
			empty = true;
		}

		if (skip) {
			skip = false;
			return;
		}

		if (!value)
			value = new Date();

		var output = calculate(value.getFullYear(), value.getMonth(), value);
		var builder = [];

		for (var i = 0; i < 42; i++) {

			var item = output.days[i];

			if (i % 7 === 0) {
				builder.length && builder.push('</tr>');
				builder.push('<tr>');
			}

			var cls = [];

			if (item.isEmpty)
				cls.push('ui-calendar-disabled');
			else
				cls.push('ui-calendar-day');

			!empty && item.isSelected && cls.push('ui-calendar-selected');
			item.isToday && cls.push('ui-calendar-day-today');
			builder.push('<td class="{0}" data-date="{1}-{2}-{3}">{3}</td>'.format(cls.join(' '), output.year, output.month, item.number));
		}

		builder.push('</tr>');

		var header = [];
		for (var i = 0; i < 7; i++)
			header.push('<th>{0}</th>'.format(output.header[i].name));

		self.html('<div class="ui-calendar-header"><button class="ui-calendar-header-prev" name="prev" data-date="{0}-{1}"><span class="fa fa-chevron-left"></span></button><div class="ui-calendar-header-info">{2} {3}</div><button class="ui-calendar-header-next" name="next" data-date="{0}-{1}"><span class="fa fa-chevron-right"></span></button></div><table cellpadding="0" cellspacing="0" border="0"><thead>{4}</thead><tbody>{5}</tbody></table>'.format(output.year, output.month, self.months[value.getMonth()], value.getFullYear(), header.join(''), builder.join('')) + (self.today ? '<div><a href="javascript:void(0)" class="ui-calendar-today">' + self.today + '</a></div>' : ''));
	};
});

COMPONENT('lazyload', function() {
	var self = this;
	var selector, container, offset;

	self.readonly();

	self.make = function() {
		selector = self.attr('data-selector');
		offset = +(self.attr('data-offset') || 50);
		container = $(self.attr('data-container') || window);
		container.on('scroll', self.refresh);
		setTimeout(function() {
			self.refresh();
		}, 1000);
	};

	self.refresh = function() {
		!self.release() && setTimeout2(self.id, self.prepare, 200);
	};

	self.released = self.refresh;
	self.setter = self.refresh;

	self.prepare = function() {
		var scroll = container.scrollTop();
		var beg = scroll - offset;
		var end = beg + container.height() + offset;
		self.find(selector).each(function() {
			if (this.getAttribute('data-lazyload'))
				return;
			var el = $(this);
			var top = (container !== window ? scroll : 0) + el.offset().top;
			if (top >= beg && top <= end) {
				el.attr('data-lazyload', true);
				EXEC(self.attr('data-exec'), el);
			}
		});
	};
});

MAIN.formatter(function(path, value, type) {

	if (type === 'date') {
		if (value instanceof Date)
			return value.format(this.attr('data-jc-format'));
		return value ? new Date(Date.parse(value)).format(this.attr('data-jc-format')) : value;
	}

	if (type !== 'currency')
		return value;

	if (typeof(value) !== 'number') {
		value = parseFloat(value);
		if (isNaN(value))
			value = 0;
	}

	return value.format(2);
});

function insertTextarea(el, text) {
	var val = el.value, endIndex, range;
	if (el.selectionStart !== undefined && el.selectionEnd !== undefined) {
		endIndex = el.selectionEnd;
		el.value = val.slice(0, el.selectionStart) + text + val.slice(endIndex);
		el.selectionStart = el.selectionEnd = endIndex + text.length;
	} else if (document.selection !== undefined && document.selection.createRange !== undefined) {
		el.focus();
		range = document.selection.createRange();
		range.collapse(false);
		range.text = text;
		range.select();
	}
}