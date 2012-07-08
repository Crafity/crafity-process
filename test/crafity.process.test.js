/*!
 * crafity.process.test - Filesystem tests
 * Copyright(c) 2011 Crafity
 * Copyright(c) 2012 Galina Slavova
 * Copyright(c) 2012 Bart Riemens
 * MIT Licensed
 */

/**
 * Test dependencies.
 */
var jstest = require('crafity-jstest')
	, assert = jstest.assert
	, context = jstest.createContext()
	, fs = require('crafity-filesystem')
	, main = require('../main.js')
	;

// Print out the name of the test module
console.log("Testing 'main.js' in crafity-process... ");
console.log("main", main);

/**
 * The tests
 */
var tests = {

	'crafity-process must be the same as the default fs module': function () {

		assert.isDefined(main, "Expected main to be defined");
		assert.areEqual(require('../main.js'), main.__proto__, "Expected main to be the standard module");
	},

	'crafity-process must be the fullname of this module': function () {

		assert.areEqual("crafity-process", main.fullname, "Expected module name is crafity.imageinfo!");
	},

	'The module must have the same version as quoted in package.json': function () {

		fs.readFile("./package.json", function (err, data) {
			var json = JSON.parse(data.toString());
			console.log("package.version =", json.version);

			assert.isDefined(json.version, "Expected fs to be defined");
			assert.areEqual(main.version, json.version, "Expected the same module version!");
		});
	}

};

/**
 * Run the tests
 */
context.run(tests);
