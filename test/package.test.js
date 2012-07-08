/*!
 * package.test - package.json tests
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
	;

// Print out the name of the test module
console.log("Testing 'package.json' in current module... ");

/**
 * The tests
 */
var tests = {

	'The module must have package.json file': function () {

		fs.readFile("./package.json", function (err, data) {
			assert.isDefined(data, "Expected package.json defined");
		});
	}

};

/**
 * Run the tests
 */
context.run(tests);
