/*jslint node: true, white: true */
"use strict";

/*!
 * crafity-config - Generic configuration provider
 * Copyright(c) 2010-2013 Crafity
 * Copyright(c) 2010-2013 Bart Riemens
 * Copyright(c) 2010-2013 Galina Slavova
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var core = require('crafity-core')
  , fs = require('crafity-filesystem')
  , Synchronizer = core.Synchronizer
  , Event = core.Event
  , homedir = process.env.HOME;

/**
 * Framework name.
 */
exports.fullname = 'crafity-process';

/**
 * Framework version.
 */
exports.version = '0.1.1';

/**
 * Initialize module
 */

exports.init = function (config) {
  var registeredProcesses = {}
    , Process = require('./lib/Process');

  function exit() {
    console.log('\u001b[31mStopping Child Processes\u001b[39m');
    core.objects.forEach(registeredProcesses, function (registeredProcess) {
      registeredProcess.commands.stop();
    });
  }

  function createProcess(info, callback) {
    try {
      if (info.cwd.indexOf("~") > -1) {
        info.cwd = info.cwd.replace('~', homedir);
      }
      var process = new Process(info)
        , fatal = true
        , fatalTimerId
        , numberOfRetries = config.numberOfRetries || 3
        , retryCount = 0;

      if (config.restartOnFail) {
        process.onstarting.subscribe(function () {
          retryCount++;
          clearTimeout(fatalTimerId);
          fatal = true;
          fatalTimerId = setTimeout(function () {
            fatal = false;
          }, config.fatalStartupTimeout || 5000);
        });

        process.onexit.subscribe(function () {
          if (!fatal) {
            retryCount = 1;
          }
          if (process.info.status === "Failed") {
            clearTimeout(fatalTimerId);
            if (!fatal || (fatal && retryCount < numberOfRetries)) {
              console.log("\u001b[31mProcess '" + info.name + "' terminated unexpectedly. Restarting process attempt " + retryCount + "/" + numberOfRetries + "\u001b[39m");
              process.commands.restart();
            } else if (fatal && retryCount >= numberOfRetries) {
              console.log("\u001b[31mAborting Process '" + info.name + "'. Too many errors\u001b[39m");
              retryCount = 0;
            }
          }
        });
      }

      if (info.git) {
        fs.readdir(fs.combine(info.cwd, info.git.path, ".git"), function (err) {
          process.info.git.available = !err;
          return callback(null, process);
        });
      } else {
        return callback(null, process);
      }
    } catch (err) {
      return callback(err);
    }
  }

  process.on('SIGTERM', exit);
  process.on('SIGHUP', exit);

  exports.onNewProcess = new Event('sync');
  exports.registerProcesses = function (processes, callback) {
    var synchronizer = new Synchronizer();

    callback = callback || function () {
      return false;
    };

    processes = [].concat(processes);

    try {
      processes.forEach(function (processInfo) {
        try {
          // Check if the process is not already registered
          var registeredProcess = registeredProcesses[processInfo.name];

          if (registeredProcess) {
            if (registeredProcess.info.cwd !== processInfo.cwd ||
              JSON.stringify(registeredProcess.info.args) !== JSON.stringify(processInfo.args) ||
              registeredProcess.info.autostart !== processInfo.autostart ||
              registeredProcess.info.cmd !== processInfo.cmd) {
              throw new Error("Process '" + processInfo.name + "' is already registered.");
            }
          } else {
            // Register the process
            createProcess(processInfo, synchronizer.register(processInfo.name, function (err, process) {
              if (err) { return console.error("err", err.stack, err); }
              registeredProcesses[processInfo.name] = process;

              exports.onNewProcess.raise(process);

              // And start the process automatically
              if (processInfo.autostart) {
                setTimeout(function () {
                  process.commands.start();
                }, 0);
              }
            }));
          }
        } catch (err) {
          console.log("err", err.stack, err);
        }
      });

      synchronizer.onfinish(function (err) {
        callback(err);
      });

    } catch (err) {
      return callback(err);
    }
  };
  exports.getProcesses = function () {
    return Object.keys(registeredProcesses).map(function (name) {
      return registeredProcesses[name];
    });
  };
  exports.getProcess = function (name) {
    if (!registeredProcesses[name]) {
      throw new Error("Process with name '" + name + "' is not registered.");
    }
    return registeredProcesses[name];
  };

  return exports;
};
