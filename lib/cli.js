#!/usr/bin/env node
var path = require("path");
var fs = require("fs-extra");
var minimist = require("minimist");
var async = require("async");
var connect = require("connect");
var serveStatic = require("serve-static");
var chalk = require("chalk");
var browserify = require("browserify");
var watchify = require("watchify");

var argv = minimist(process.argv.slice(2));
var command = argv._[0];

var toolsPath = path.resolve(__dirname + "/..");
var sourcePath = path.resolve(process.cwd());
var buildPath = path.resolve("build");

var manifest = require(sourcePath + "/ahi.json");

var b = browserify(watchify.args);
var w = watchify(b);
w.add(sourcePath + "/" + manifest.main);

var bundle = function (callback) {
	var wstream = fs.createWriteStream(buildPath + "/game.js");
	wstream.once("finish", function () {
		callback && callback();
	});
	w.bundle().pipe(wstream);
};

w.on("update", function () {
	bundle();
});

async.series([
	function (callback) {
		fs.remove(buildPath, callback);
	},
	function (callback) {
		fs.mkdir(buildPath, callback);
	},
	function (callback) {
		fs.copy(toolsPath + "/templates/index.html", buildPath + "/index.html", callback);
	},
	function (callback) {
		fs.copy(sourcePath + "/media", buildPath + "/media", callback);
	},
	function (callback) {
		bundle(callback);
	}
], function () {
	var app = connect();
	app.use(serveStatic(buildPath));
	app.listen(8080);

	console.log(chalk.gray("Listening on 8080..."));
});
