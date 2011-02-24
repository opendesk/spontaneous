console.log('Loading DiscountField...')

Spontaneous.FieldTypes.DiscountField = (function($, S) {
	var dom = S.Dom;
	var TextCommand = new JS.Class({
		name: '',
		pre: '',
		post: '',

		extend: {
			get_state: function(input) {
				var start = input[0].selectionStart, end = input[0].selectionEnd, value = $(input).val(),
				before = value.substr(0, start), middle = value.substr(start, (end - start)), after = value.substr(end);
				return {
					start: start,
					end: end,
					before: before,
					middle: middle,
					selection: middle,
					after: after
				}
			}
		},

		initialize: function(input) {
			this.input = input;
		},
		execute: function(event) {
			this.wrap();
		},
		wrap: function() {
			var input = this.input, s = this.fix_selection(), start = s.start, end = s.end,
				before = s.before, middle = s.selection, after = s.after, wrapped;
			if ((end - start) <= 0 ) { return; }
			if (this.matches_selection(middle)) {
				wrapped  = this.remove(middle)
			} else {
				wrapped = this.surround(middle);
			}
			input.val(before + wrapped + after);
			input[0].selectionStart = start;
			input[0].selectionEnd = start + wrapped.length;
		},
		get_state: function() {
			return TextCommand.get_state(this.input);
		},
		fix_selection_whitespace: function(selected) {
			var m, d_start = 0, d_end = 0, l;
			m = /^( +)/.exec(selected);
			if (m) {
				l = m[1].length
				d_start = l;
				selected = selected.substr(l);
			}
			m = /( +)$/.exec(selected);
			if (m) {
				l = m[1].length
				d_end = -l;
				selected = selected.substr(0, selected.length-l);
			}
			return {ds: d_start, de: d_end, selected: selected};
		},
		expand_selection: function(state) {
			var selected = state.selection, m, start = state.start, end = state.end, ws;
			ws = this.fix_selection_whitespace(selected)
			start += ws.ds;
			end += ws.de;
			selected = ws.selected;
			if (selected.indexOf(this.pre) !== 0) {
				var sel;
				for (var i = 0, ii = this.pre.length; i < ii; i++) {
					sel = state.before.substr(-(i+1)) + selected;
					if (sel.indexOf(this.pre) === 0) {
						start -= (i+1);
						selected = sel;
						break;
					}
				}
			}
			if (selected.substr(-this.post.length) !== this.post) {
				var sel;
				for (var i = 0, ii = this.post.length; i < ii; i++) {
					sel = selected + state.after.substr(0, (i+1));
					if (sel.substr(-this.post.length) === this.post) {
						end += (i+1);
						selected = sel;
						break;
					}
				}
			}
			return {start: start, end: end, selection:selected};
		},
		fix_selection: function() {
			var state = this.get_state(), change = this.expand_selection(state)
			$.extend(state, change);
			this.update_state(state);
			return this.get_state();
		},
		update_state: function(state) {
			this.input[0].setSelectionRange(state.start, state.end);
		},
		surround: function(text) {
			return this.pre + text + this.post;
		},
		remove: function(text) {
			return text.substr(this.pre.length, text.length - this.pre.length - this.post.length);
		},
		value: function() {
			return this.input.val();
		},
		button: function() {
			if (!this._button) {
				var b = $(dom.a, {'class':this.name.toLowerCase()}).click(function(event) {
					this.execute(event);
					return false;
				}.bind(this)).text(this.name);
				this._button = b;
			}
			return this._button;
		},
		respond_to_selection: function(state) {
			var expanded = this.expand_selection(state);
			// console.log('>>>>> ', this.name, 'expanded', expanded.selection, this.matches_selection(expanded.selection));
			if (this.matches_selection(expanded.selection)) {
				// console.log('matches', this.name)
				this.button().addClass('active');
				return true;
			} else {
				this.clear_selection();
				return false;
			}
		},
		clear_selection: function() {
			this.button().removeClass('active');
		},
		matches_removal: function(selection) {
			return this.matches_selection(selection);
		},
		matches_selection: function(selection) {
			return (selection.indexOf(this.pre) === 0 && selection.lastIndexOf(this.post) === (selection.length - this.post.length))
		}
	});

	var Bold = new JS.Class(TextCommand, {
		name: 'Bold',
		pre: '**',
		post: '**'
		// fix_selection: function() {
		// 	var state = this.callSuper();
		// 	return this.get_state();
		// }
	});

	var Italic = new JS.Class(TextCommand, {
		name: 'Italic',
		pre: '_',
		post: '_'
	});

	var UL = new JS.Class(TextCommand, {
		name: 'UL',
		pre: '*',
		post: '',
		br: /\r?\n/,
		strip_bullet: /^ *(\d+\.|\*) */,
		is_list_entry:/(?:\r?\n)( *\*.+?)$/,
		surround: function(text) {
			var lines = text.split(this.br);
			for (var i = 0, ii = lines.length; i < ii; i++) {
				if (/^\s*$/.test(lines[i])) {
				} else {
					lines[i] = this.bullet_for(i) + lines[i].replace(this.strip_bullet, '');
				}
			}
			return lines.join("\n")
		},
		remove: function(text) {
			var lines = text.split(this.br);
			for (var i = 0, ii = lines.length; i < ii; i++) {
				lines[i] = lines[i].replace(this.strip_bullet, '');
			}
			return lines.join("\n")
		},
		expand_selection: function(state) {
			var selected = (state.selection || ''), m, start = state.start, end = state.end, br = /\r?\n/;
			if (!this.matches_selection(selected)) {
				m = this.strip_bullet.exec(selected);
				if (!m) {
					m = this.is_list_entry.exec(state.before);
					if (m) {
						start -= m[1].length;
						selected = m[1] + selected;
						m = /^(.*?)(?:\r?\n)/.exec(state.after);
						if (m) {
							end += m[1].length;
							selected += m[1];
						}
					}
				}
			}
			return {selection:selected, start:start, end:end};
		},
		bullet_for: function(n) {
			return "* ";
		},
		matches_selection: function(selection) {
			return /^ *\*/.test(selection)
		}

	});
	var OL = new JS.Class(UL, {
		name: 'OL',
		is_list_entry:/(?:\r?\n)( *\d+\..+?)$/,
		bullet_for: function(n) {
			return (n+1)+". ";
		},
		matches_selection: function(selection) {
			return /^ *\d+\./.test(selection)
		}
	});

	var H1 = new JS.Class(TextCommand, {
		name: "H1",
		pre: '',
		post: "=",
		scale: 1.0,
		surround: function(text) {
			// remove existing header (which must be different from this version)
			if (this.matches_removal(text)) { text = this.remove(text); }
			var line = '', n = Math.floor(this.input.attr('cols')*0.5), newline = /([\r\n]+)$/, newlines = newline.exec(text), undef;
			newlines = (!newlines || (newlines === undef) ? "" : newlines[1])
			for (var i = 0; i < n; i++) { line += this.post; }
			return text.replace(newline, '') + "\n" + line + newlines;
		},
		// removes either h1 or h2
		remove: function(text) {
			var r = new RegExp('[\r\n][=-]+'), s =  text.replace(r, '')
			return s.replace(/ +$/, '');
		},
		// matches either h1 or h2
		matches_removal: function(selection) {
			return (new RegExp('[\r\n][=\\-]+[\r\n ]*$')).exec(selection)
		},
		// matches only the current header class
		matches_selection: function(selection) {
			return (new RegExp('[\r\n]?'+this.post+'+[\r\n ]*$', 'm')).exec(selection)
		},
		expand_selection: function(state) {
			var selected = (state.selection || ''), m, start = state.start, end = state.end, br = /\r?\n/;
			if ((end - start) === 0) {
				// expand to select current line
				m = /(.+)$/.exec(state.before);
				if (m) {
					var s = m[1];
					start -= s.length;
					selected = m[1] + selected;
				}
				m = /^(.+)/.exec(state.after);
				if (m) {
					var s = m[1];
					end += s.length;
					selected += m[1];
				}
			}
			var lines = selected.split(br), underline = new RegExp('^[=-]+$'), found = false;
			for (var i = 0, ii = lines.length; i < ii; i++) {
				var l = lines[i];
				if (underline.test(l)) {
					found = true;
					break;
				}
			}
			if (!found) {
				// expand selection down by one line
				lines = state.after.split(br, 2);
				for (var i = 0, ii = lines.length; i < ii; i++) {
					var l = lines[i];
					if (underline.test(l)) {
						end += l.length + i;
						selected += l;
						break;
					}
				}
			} else {
				// make sure that we have the whole of the underline included in the selection
				var r = new RegExp('^([=-]+)'), m = r.exec(state.after);
				if (m) {
					var extra = m[1];
					end += extra.length;
					selected += m[1];
				}
			}
			return {selection:selected, start:start, end:end};
		}
	});

	var H2 = new JS.Class(H1, {
		name: "H2",
		post: "-",
		scale: 1.2 // hyphens are narrower than equals and narrower than the average char
	});


	var LinkView = new JS.Class(Spontaneous.PopoverView, {
		initialize: function(editor, link_text, url) {
			this.editor = editor;
			this.link_text = link_text;
			this.url = url;
			this.callSuper();
		},
		width: function() {
			return 300;
		},
		position_from_event: function(event) {
			var t = $(event.currentTarget), o = t.offset();
			o.top += t.outerHeight();
			o.left += t.outerWidth() / 2;
			return o
		},
		view: function() {
			var __view = this, w = $(dom.div), text_input, url_input;
			var input = function(value) {
				var i = $(dom.input).keypress(function(event) {
					if (event.charCode === 13) {
						__view.insert_link(text_input, url_input); // sick
						return false;
					}
				}).val(value)
				return i;
			}
			text_input = input(this.link_text);
			url_input = input(this.url);

			cancel = $(dom.a, {'class':'button cancel'}).text('Cancel').click(function() {
				this.close();
				return false;
			}.bind(this)), insert = $(dom.a, {'class':'button'}).text('Insert').click(function() {
				this.insert_link(text_input, url_input);
				return false;
			}.bind(this))
			w.append($(dom.p).append(text_input)).append($(dom.p).append(url_input));
			w.append($(dom.p).append(cancel).append(insert));
			url_input.select();
			return w;
		},
		insert_link: function(text, url) {
			this.editor.insert_link(text.val(), url.val());
			this.close();
		},
		cancel: function() {
			this.close();
		},
		after_close: function() {
			this.editor.dialogue_closed();
		}
	});

	var Link = new JS.Class(TextCommand, {
		name: 'Link',
		link_matcher: /^\[([^\]]+)\]\(([^\)]+)\)$/,
		execute: function(event) {
			var input = this.input, s = this.fix_selection(), start = s.start, end = s.end,
			before = s.before, middle = s.middle, after = s.after, wrapped,
			m = this.link_matcher.exec(middle), text = middle, url;
			if (m) {
				text = m[1];
				url = m[2];
			}
			if (!this._dialogue) {
				this._dialogue = Spontaneous.Popover.open(event, new LinkView(this, text, this.preprocess_url(text, url)));
			} else {
				this._dialogue.close();
				this._dialogue = null;
			}
			this.input.focus();
			return false;
		},
		expand_selection: function(state) {
			var selected = state.selected, m, start = state.start, end = state.end;
			if (!this.matches_selection(state.selected)) {
				m = /(\[[^\)]*?)$/.exec(state.before);
				if (m) {
					start -= m[1].length;
					selected = m[1] + selected;
				}
				// TODO: this breaks if ')' in URL...
				m = /(^[^\)\[]*?\))/.exec(state.after);
				if (m) {
					end += m[1].length;
					selected += m[1];
				}
			}
			return {selection:selected, start:start, end:end};
		},
		preprocess_url: function(text, url) {
			if (!url) {
				url = this.postprocess_url(String(text)) || '';
			}
			return url;
		},
		postprocess_url: function(url) {
			if (url) {
				if (/^https?:/.test(url)) {
					url = url;
				} else if (/^[a-z-]+\.([a-z-]+\.)*[a-z]{2,}(\/[^ ]*)*$/i.exec(url)) { // look for urls without http:
					url = 'http://' + url;
				} else if (/^[^ @]+@([a-z-]+\.)+[a-z]{2,}$/i.exec(url)) { // email addresses
					url = 'mailto:' + url;
				} else {
					return false
				}
			}
			return url;
		},
		dialogue_closed: function() {
			this._dialogue = null;
			this.input.focus();
		},
		insert_link: function(text, url) {
			url = this.postprocess_url(url) || url;
			var edit = function(input_text) {
				return this.surround_with_link(text, url);
			}.bind(this);
			this.surround = edit;
			this.remove = edit;
			this.wrap();
		},
		surround_with_link: function(text, url) {
			if (url === '') {
				return text;
			} else {
				return '[' + text + '](' + url + ')';
			}
		},
		remove_link: function(text) {
			// we know that the text must match the regexp for us to arrive here
			var m = this.link_matcher.exec(text);
			return m[1];
		},
		matches_selection: function(selection) {
			return this.link_matcher.exec(selection);
		}
	});

	var DiscountField = new JS.Class(Spontaneous.FieldTypes.StringField, {
		actions: [Bold, Italic, H1, H2, UL, OL, Link],
		get_input: function() {
			if (!this.input) {
				this.input = $(dom.textarea, {'id':this.css_id(), 'name':this.form_name(), 'rows':10, 'cols':90}).text(this.unprocessed_value());
				this.input.select(this.on_select.bind(this)).click(this.on_select.bind(this))
			}
			return this.input;
		},
		on_focus: function() {
			if (!this.expanded) {
				this.input.data('original-height', this.input.innerHeight())
				var text_height = this.input[0].scrollHeight, max_height = 500, resize_height = Math.min(text_height, max_height);
				this.input.animate({'height':resize_height});
				this.expanded = true;
			}
			this.callSuper();
		},
		on_blur: function() {
			this.input.animate({ 'height':this.input.data('original-height') });
			this.expanded = false;
			this.callSuper();
		},
		toolbar: function() {
			this._wrapper = $(dom.div, {'class':'markdown-editor', 'id':'editor-'+this.css_id()});
			this._toolbar = $(dom.div, {'class':'md-toolbar'});
			this.commands = [];
			for (var i = 0, c = this.actions, ii = c.length; i < ii; i++) {
				var cmd_class = c[i], cmd = new cmd_class(this.get_input());
				this.commands.push(cmd);
				this._toolbar.append(cmd.button());
			}
			this._wrapper.append(this._toolbar);
			return this._wrapper;
		},
		edit: function() {
			this.expanded = false;
			// this._wrapper.append(this.input)
			return this.get_input();
		},
		// iterates through all the buttons and lets them highlight themselves depending on the
		// currently selected text
		on_select: function(event) {
			var state = TextCommand.get_state(this.input);
			$.each(this.commands, function() { this.clear_selection(); });
			for (var i = 0, c = this.commands, ii = c.length; i < ii; i++) {
				if (c[i].respond_to_selection(state)) { break;	}
			}
		}
	});

	return DiscountField;
})(jQuery, Spontaneous);

