/*jslint node:true*/

var processModule = require('child_process')
	, fs = require('crafity-filesystem')
	, core = require('crafity-core')
	, objects = core.objects
	, Event = core.Event;

module.exports = function Process(config) {
	var self = this
		, childProcess
		, statusses
		, output = []
		, lastErrorMessage = ""
		, currentLogger
		, restarting;

	this.onstop = new Event();
	this.onrestarting = new Event();
	this.onrestarted = new Event();
	this.onstarting = new Event();
	this.onstarted = new Event();
	this.onexit = new Event();

	this.onstdout = new Event();
	this.onstderr = new Event();

	this.setLogger = function (logger) {
		currentLogger = logger;
		if (!logger) { return; }
		self.onstdout.subscribe(function (data) {
			data = data.toString();
			data.split("\n").forEach(function (line) {
				if (line.length > 0) { logger.info(line); }
			});
		});
		self.onstderr.subscribe(function (data) {
			data = data.toString();
			data.split("\n").forEach(function (line) {
				if (line.length > 0) { logger.error(line); }
			});
		});
	};

	statusses = {
		Stopped: "Stopped",
		Stopping: "Stopping",
		Starting: "Starting",
		Running: "Running",
		Restarting: "Restarting",
		Failed: "Failed"
	};

	this.info = objects.extend(config, {
		git: config.git || "No",
		autostart: config.autostart,
		status: statusses.Stopped,
		output: "",
		lastrun: {
			exitCode: "",
			message: "",
			date: ""
		}
	});

	if (config.autorestart && config.autorestart.enabled && self.info.cwd) {
		var paths = (config.autorestart.paths || []).map(function (path) {
			return fs.combine(self.info.cwd || "", path);
		});
		[self.info.cwd].concat(paths).forEach(function (path) {
			console.log("Watching path for changes:", path);
			fs.watchFolder(path, config.autorestart, function (f) {
				self.commands.restart();
			});
		});
	}

	function startProcess() {
		if (!self.info.cmd) { return; }

		lastErrorMessage = "";
		if (self.info.args[0].match(/\.js$/i)) {
			childProcess = processModule.fork(fs.combine(self.info.cwd, self.info.args[0]), [], {
				cwd: self.info.cwd || null,
				encoding: 'utf8',
				timeout: 0,
				maxBuffer: 200 * 1024,
				killSignal: 'SIGHUP', //'SIGTERM', //
				env: process.env
			});
		} else {
			childProcess = processModule.spawn(self.info.cmd,
				self.info.args || [], {
					cwd: self.info.cwd || null,
					encoding: 'utf8',
					timeout: 0,
					maxBuffer: 200 * 1024,
					killSignal: 'SIGHUP', //'SIGTERM', //
					env: process.env
				});
			childProcess.stdout.on('data', function (data) {
				self.onstdout.raise(data);
			});

			childProcess.stderr.on('data', function (data) {
				self.onstderr.raise(data);
			});
		}
		self.info.status = statusses.Running;
		self.info.lastrun = {
			exitCode: "",
			message: "",
			date: new Date().toString()
		};

		childProcess.on('SIGTERM', exit);
		childProcess.on('SIGHUP', exit);
		childProcess.on('exit', exit);
		function exit(exitCode, message) {
			try {
				var args = Array.prototype.slice.call(arguments);
				if (exitCode === 0) {
					self.info.status = statusses.Stopped;
					self.onstdout.raise("\u001b[32mProcess '" + self.info.name + "' exited successful\u001b[39m");
				} else {
					self.info.status = statusses.Failed;
					self.onstdout.raise("\u001b[31mProcess '" + self.info.name + "' exited with error: " + JSON.stringify(args) + "\u001b[39m");
				}
				self.info.lastrun = {
					exitCode: exitCode,
					message: lastErrorMessage,
					date: new Date().toGMTString()
				};
				childProcess = undefined;
				self.onstop.raise();
				self.onexit.raise();
			} catch (err) {
				console.log("err", err.stack, err);
				callback(err);
			}
		}

	}

	this.commands = {
		start: function (callback) {
			callback = callback || new Function();
			try {
				if (self.info.status !== statusses.Running
					&& self.info.status !== statusses.Restarting
					&& self.info.status !== statusses.Starting
					&& self.info.status !== statusses.Failed) {
					self.onstdout.raise("\u001b[32mStarting process '" + self.info.name + "'\u001b[39m");
					self.info.status = statusses.Starting;
					self.onstarting.raise();
					startProcess();
					self.onstarted.raise();
				}
				callback();
			} catch (err) {
				console.log("err", err.stack, err);
				callback(err);
			}
		},
		stop: function (callback) {
			callback = callback || new Function();
			function cb() {
				self.onstop.unsubscribe(cb);
				callback();
			}

			try {
				if (self.info.status === statusses.Stopping) {
					self.onstop.subscribe(cb);
					return;
				}
				if (!childProcess ||
					self.info.status === statusses.Stopped ||
					self.info.status === statusses.failed) {
					self.info.status = statusses.Stopped;
					return callback();
				}
				self.info.status = statusses.Stopping;
				self.onstdout.raise("\u001b[31mStopping process '" + self.info.name + "'\u001b[39m");

				self.onstop.subscribe(cb);

				//process.kill(childProcess.pid, 'SIGHUP');
				childProcess.kill(0);

			} catch (err) {
				console.log("err", err.stack, err);
				self.onstop.unsubscribe(cb);
				callback(err);
			}
		},
		restart: function (callback) {
			callback = callback || new Function();
			self.onrestarted.subscribe(function () {
				self.onrestarted.unsubscribe(callback);
				callback.call(arguments);
				restarting = false;
			});
			if (restarting) {
				return;
			}
			try {
				restarting = true;
				self.info.status = statusses.Restarting;
				self.onrestarting.raise();
				self.onstdout.raise("\u001b[37mRestarting process '" + self.info.name + "'\u001b[39m");
				self.commands.stop(function () {
					setTimeout(function () {
						self.commands.start(self.onrestarted.raise);
					}, 0);
				});
			} catch (err) {
				console.log("err", err.stack, err);
				callback(err);
			}
		},
		pull: function (callback) {
			callback = callback || new Function();
			if (!self.info.git || !self.info.git.available) {
				self.onstdout.raise("\u001b[33mGit Pull is invoked on '" + self.info.name + "' but not supported\u001b[39m");
				return callback(new Error("No git support"));
			}
			self.commands.stop(function () {
				self.onstdout.raise("\u001b[33mGIT: " + self.info.name + "> git pull -f\u001b[39m");
				var p = new Process({ name: "git", cwd: fs.combine(self.info.cwd, self.info.git.path), cmd: "git", args: ["pull", "-f"]});
				//p.setLogger(currentLogger);
				p.onstdout.subscribe(self.onstdout.raise);
				p.onstderr.subscribe(self.onstderr.raise);
				p.onexit.subscribe(function () {
					self.onstdout.raise("GIT: " + self.info.name + "> git submodule update");
					var p = new Process({ name: "git", cwd: fs.combine(self.info.cwd, self.info.git.path), cmd: "git", args: ["submodule", "foreach", "git", "pull", "-f"]});
					//p.setLogger(currentLogger);
					p.onstdout.subscribe(self.onstdout.raise);
					p.onstderr.subscribe(self.onstderr.raise);
					p.onexit.subscribe(function () {
						self.commands.start(callback);
					});
					p.commands.start();
				});
				p.commands.start();
			});
		}
	};
}
