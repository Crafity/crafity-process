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
      assert.hasNoValue(err, "Didn't expect an error");
			assert.isDefined(data, "Expected package.json defined");
		});
	}

};

/**
 * Run the tests
 */
context.run(tests);
