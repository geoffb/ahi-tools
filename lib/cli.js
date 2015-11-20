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
var jade = require("jade");
var uglify = require("uglify-js");

var autoIndex = require("./tasks/autoIndex");

var argv = minimist(process.argv.slice(2));
var command = argv._[0];

var toolsPath = path.resolve(__dirname + "/..");
var sourcePath = path.resolve(process.cwd());
var buildPath = path.resolve("build");

var manifest = require(sourcePath + "/ahi.json");

var ignored = [];
ignored = ignored.concat(autoIndex.getIgnoredPaths(manifest));

if (argv.debug) {
	watchify.args.debug = true;
}

var b = browserify(watchify.args);
var w = watchify(b, {
	ignoreWatch: ignored
});
w.add(sourcePath + "/" + manifest.main);

var bundle = function (callback) {
	async.series([
		function (callback) {
			autoIndex.build(manifest, callback);
		},
		function (callback) {
			console.log(chalk.gray("Bundling JavaScript"));
			var wstream = fs.createWriteStream(buildPath + "/game.js");
			wstream.once("finish", function () {
				callback && callback();
			});
			w.bundle(function (err) {
				if (err) {
					console.log(chalk.red("ERROR: " + err.message));
				}
			}).pipe(wstream);
		},
		function (callback) {
			console.log(chalk.gray("Minifying JavaScript"));
			var result = uglify.minify(buildPath + "/game.js");
			fs.writeFile(buildPath + "/game.js", result.code, callback);
		}
	], callback);
};

w.on("update", function () {
	bundle();
});

console.log(chalk.gray("Building " + manifest.name));

async.series([
	function (callback) {
		fs.remove(buildPath, callback);
	},
	function (callback) {
		fs.mkdir(buildPath, callback);
	},
	function (callback) {
		console.log(chalk.gray("Creating HTML index"));
		//fs.copy(toolsPath + "/templates/index.html", buildPath + "/index.html", callback);
		var html = jade.renderFile(toolsPath + "/templates/index.jade", {
			manifest: manifest,
			pretty: true
		});
		fs.writeFile(buildPath + "/index.html", html, callback);
	},
	function (callback) {
		console.log(chalk.gray("Copying static assets"));
		var files = manifest.files;
		if (files && files.length > 0) {
			var tasks = [];
			for (var i = 0; i < files.length; ++i) {
				var name = files[i];
				tasks.push(function (callback) {
					fs.copy(sourcePath + "/" + name, buildPath + "/" + name, callback);
				});
			}
			async.series(tasks, callback);
		} else {
			callback && callback();
		}
	},
	function (callback) {
		bundle(callback);
	}
], function () {
	var app = connect();
	app.use(serveStatic(buildPath));
	app.listen(8080);

	console.log(chalk.gray("Listening on 8080"));
});
