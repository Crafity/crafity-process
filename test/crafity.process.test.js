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
	, context = jstest.createContext("Crafity process tests")
	, fs = require('crafity-filesystem')
	, main = require('../main.js')
	;

/**
 * The tests
 */
var tests = {

};

/**
 * Run the tests
 */
context.run(tests);
