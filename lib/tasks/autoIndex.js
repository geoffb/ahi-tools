var fs = require("fs");
var path = require("path");
var glob = require("glob");
var async = require("async");
var chalk = require("chalk");

var autoIndex = function (pathName, callback) {
	var pattern = pathName + "/*.@(js|json)";
	glob(pattern, function (err, files) {
		var data = "";
		for (var i = 0; i < files.length; ++i) {
			var file = files[i];
			var ext = path.extname(file);
			var name = path.basename(file, ext);
			if (name == "index") { continue; }
			var exportKey = name.substr(0, 1).toLowerCase() + name.substr(1);
			data += "exports." + exportKey + " = require(\"./" + name + "\");\n";
		}
		fs.writeFile(pathName + "/index.js", data, callback);
	});
};

var makeAutoIndexTask = function (pathName) {
	return function (callback) {
		console.log(chalk.grey("Creating auto index: " + pathName));
		autoIndex(pathName, callback);
	};
};

exports.build = function (manifest, callback) {
	if (manifest.autoIndexPaths) {
		var paths = manifest.autoIndexPaths;
		var tasks = [];
		for (var i = 0; i < paths.length; ++i) {
			tasks.push(makeAutoIndexTask(paths[i]));
		}
		async.parallel(tasks, callback);
	} else {
		callback && callback();
	}
};

exports.getIgnoredPaths = function (manifest) {
	var ignored = [];
	if (manifest.autoIndexPaths) {
		var paths = manifest.autoIndexPaths;
		for (var i = 0; i < paths.length; ++i) {
			ignored.push("**/" + paths[i] + "/index.js");
		}
	}
	return ignored;
};
