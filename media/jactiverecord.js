jActiveRecord = Class.create({
	initialize: function(options) {
		this._instances = new Hash;
		if (options == null)
			this._create_options = {};	
		this._create_options = options;		
		this._create_instance();
	},
	
	create: function(options) {
		if (options) {
			var _options = options;
		}
		else {
			var _options = {}
		}
		return this.load(_options, ":create");
	},
	
	load: function(options, create_method) {
		create_method = create_method || ":load";
		
		var obj = new this._instance(options, this._create_options, this, create_method);
		if (obj.id) {
			this._instances.set(obj.id, obj);
		}
		return obj;
	},
	
	_create_instance: function() {
		this._instance = Class.create({
			initialize: function(options, create_options, parent_klass, create_method) {
				try {
					if (options) {
						
						$H(options).each(function(opt) {
							
							if (create_options.belongs_to && create_options.belongs_to[opt[0]] != null) {
								this[opt[0]] = create_options.belongs_to[opt[0]]().load(opt[1]);							
							}
							else if (create_options.has_many && create_options.has_many[opt[0]] != null) {
								this[opt[0]] = opt[1].collect( function(o) {
									return create_options.has_many[opt[0]]().load(o); 
								});
							}
							else {
								this[opt[0]] = opt[1];
							}
							
							//this[opt[0].replace(/_/g,"-").camelize()] = this[opt[0]]; // ********** just camelCase everything??
						}.bind(this));
						
						this.attributes = options;
						this.create_options = create_options;
						
						this._parent_klass = parent_klass;
						
						if (create_options.functions) {
							$H(create_options.functions).each(function(func) {
								this[func[0]] = func[1];
								//this[func[0].replace(/_/g,"-").camelize()] = this[func[0]]; // ********** just camelCase everything??
							}.bind(this));
						}
						
						if (this.init)
							this.init();
						
						if (this.create_options.observer_name_space) {
							document.fire(this.create_options.observer_name_space + create_method, this);
						}
					}
					else {
						throw "no_options";
					}
				}
				catch(ex) {
					// Stub for error handling.
					
					if (ex == "no_options") {
						
					}
				}	
			},
			
			observe: function(event_type, callback) {
				if (this.create_options.observer_name_space) {
					var _cb = function(event) {
						if (event.memo.id == this.id) {
							callback(event.memo);
						}
					}.bindAsEventListener(this);	
					document.observe(this.create_options.observer_name_space + ":" + event_type, _cb);
					var that = this;
					return { 
						observer_name: that.create_options.observer_name_space + ":" + event_type,
						callback_function: _cb,
						stopObserving: function() {
							document.stopObserving(this.observer_name, this.callback_function);
						}
					}
				}
				else {
					return false;
				}
			},
			
			update: function(attributes) {
				
				// it may be useful to store a "changed attributes" object, so you can tell in the observer callback what was changed
				
				$H(attributes).each(function(attr) {
					if (this[attr[0]] && typeof(this[attr[0]].update) == "function") {
						this[attr[0]].update(attr[1]);
					}
					else {	
						this[attr[0]] = attr[1];
					}
					this[attr[0].replace(/_/g,"-").camelize()] = this[attr[0]];// ********** just camelCase everything??
				}.bind(this));
				
				if (this.init)
					this.init();
				
				if (this.create_options.observer_name_space) {
					document.fire(this.create_options.observer_name_space + ":update", this);
				}
				
				return this;
			},
			
			reload: function(options) {
				options.send_method = ":reload";
				options.url = options.url || this.create_options.url;
				options.url = options.url + "/" + this.id;
				
				if (!options.method_type) {
					options.method_type = "get";
				}
				
				this._send(options);
			},
			
			_create: function(options) {
				options.send_method = ":save_on_create";
				
				if (!options.method_type) {
					options.method_type = "post";
				}
				
				this._send(options);
			},
			
			destroy: function(options) {
				options.send_method = ":destroy";
				options.url = options.url || this.create_options.url;
				options.url = options.url + "/" + this.id;
				
				if (!options.method_type) {
					options.method_type = "delete";
				}
				
				this._send(options);
			},
			
			save: function(options) {
				options.send_method = ":save";	
				
				if (!options.method_type) {
					if (this.id) {
						options.method_type = "put";
					}
					else {
						options.method_type = "post";
					}
				}
				
				this._send(options);

			},
			
			_send: function(options) {
				this._onSendResults = options.on_results;
				
				var url = options.url || this.create_options.url;
				
				var that = this;
				
				if (this.create_options.url_replacement) {
					url = url.replace("/:id/","/" + this[this.create_options.url_replacement] + "/");
				}
				
				// instead of just sending the whole object, send something that has all the methods trimmed off of it...
				
				var attributes = {};
				
				$H(this).each(function(e) {
					if (typeof(e[1]) != "function" && typeof(e[1]) != "object") {
						attributes[e[0]] = e[1];
					}
				});
				
				new Ajax.Request(url, {
					method: options.method_type,
					parameters: attributes,
					onSuccess: function(transport) { that._send_results(transport, options.send_method); },
					onFailure: function() { },
					onLoading: function() { }
				});
			},
			
			_send_results: function(transport, send_method) {
				
				var obj = eval ( "(" + transport.responseText + ")" );
				
				this.update(obj);
				
				if (obj.id) {
					this._instances.set(this.id, this);
				}
				
				if (this.init) {
					this.init();
				}
				
				if (this.create_options.observer_name_space) {
					document.fire(this.create_options.observer_name_space + send_method, this);
				}
				
				if (this._onSendResults) {
					this._onSendResults();
				}

			}

		});
		
	},
	
	remote_update: function(id, attributes) {
		if (this._instances.get(id)) {
			return this._instances.get(id).update(attributes); 
		}
		else {
			return false;
		}
	},
	
	observe: function(event_type, callback) {
		if (this._create_options.observer_name_space) {
			var _cb = function(event) { callback(event.memo) };			
			document.observe(this._create_options.observer_name_space + ":" + event_type, _cb);
			var that = this;
			return { 
				observer_name: that._create_options.observer_name_space + ":" + event_type,
				callback_function: _cb,
				stopObserving: function() {
					document.stopObserving(this.observer_name, this.callback_function);
				}
			}
		}
		else {
			return false;
		}
	},
	
	find: function(opt) {
		if (typeof(opt) == "number") {
			return this._instances.get(opt);
		}
		else {
			var article = this._instances.get(opt.id);
			var onFindResults = opt.on_find_results;
			// ability to search through cache...
			// if it doesn't find it, ajax for it...

			// the data will get stale over time, so have juggernaut broadcast updates to the cache... could get messy with comments!
		}
	},
	
	_find_results: function(transport) {
		
		// stub...
		if (this._create_options.after_find_event) {
			document.fire(this._create_options.observer_name_space + ":find", object);
		}
	}
	
});