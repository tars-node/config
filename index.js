/**
 * Tencent is pleased to support the open source community by making Tars available.
 *
 * Copyright (C) 2016THL A29 Limited, a Tencent company. All rights reserved.
 *
 * Licensed under the BSD 3-Clause License (the "License"); you may not use this file except 
 * in compliance with the License. You may obtain a copy of the License at
 *
 * https://opensource.org/licenses/BSD-3-Clause
 *
 * Unless required by applicable law or agreed to in writing, software distributed 
 * under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR 
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the 
 * specific language governing permissions and limitations under the License.
 */

"use strict";

var util = require("util");
var assert = require("assert");
var iconv = require("iconv-lite");
var EventEmitter = require("events").EventEmitter;

var Promise = require("@tars/utils").Promise;
var ConfigParser = require("@tars/utils").Config;
var TarsClient = require("@tars/rpc").Communicator.New();

var tars = require("./ConfigProxy").tars;

var FORMAT = {
	'C' : 'C',
	'JSON' : 'JSON',
	'TEXT' : 'TEXT'
};
var LOCATION = {
    'SERVER' : 'SERVER',
    'APP' : 'APP'
};
var CONFIG_OBJ = "tars.tarsconfig.ConfigObj";
var TIMEOUT = 30 * 1000;

function TarsConfig(obj) {
	var parser;

	obj = obj || process.env.TARS_CONFIG;

	assert(obj, 'TARS_CONFIG is not in env and init argument is neither an Object nor a String.');

	if (typeof obj === 'string' && obj !== '') {
		TarsClient.initialize(obj);
		parser = new ConfigParser();
		parser.parseFile(obj);
	} else {
		parser = obj;
	}

	assert(typeof parser === 'object', 'init argument not an TARSCnfigureObj');

	this.ConfigObj = parser.get('tars.application.server.config', CONFIG_OBJ);

	this.app = parser.get('tars.application.server.app');
	assert(this.app, 'app not found in TARS_CONFIG(tars.application.server.app)');

	this.server = parser.get('tars.application.server.server');
	assert(this.server, 'server not found in TARS_CONFIG(tars.application.server.server)');

	this.localip = parser.get('tars.application.server.localip');
	assert(this.localip, 'localip not found in TARS_CONFIG(tars.application.server.localip)');

	this.containername = parser.get('tars.application.server.container');

	if (parser.get('tars.application.enableset', '').toLowerCase() === 'y') {
		this.setdivision = parser.get('tars.application.setdivision');
		assert(this.setdivision, 'setdivision is empty in TARS_CONFIG(tars.application.setdivision)');
	}

	this.timeout = TIMEOUT;

	this.setMaxListeners(0);
}

util.inherits(TarsConfig, EventEmitter);

TarsConfig.prototype.FORMAT = FORMAT;
TarsConfig.prototype.LOCATION = LOCATION;

TarsConfig.prototype._init = function() {
	var ths = this;

	this._client = TarsClient.stringToProxy(tars.ConfigProxy, this.ConfigObj);
	this._client.setTimeout(this.timeout);

	process.on('message', function(obj) {
		if (obj.cmd === "tars.loadconfig") {
			ths.emit("configPushed", obj.data);
		}
	});
};

TarsConfig.prototype.loadServerConfig = function(options) {
	assert(!options || !options.isAppConfig, 'Can\'t load server config in app');

	return this._loadSingleConfig(this.server + ".conf", options);
};

TarsConfig.prototype._loadSingleConfig = function(filename, options) {
	var info = new tars.ConfigInfo(), opts = options || {};
	info.appname = this.app;
	info.servername = this.server;
	info.filename = filename;
	info.host = this.localip;
	if (this.setdivision) {
		info.setdivision = this.setdivision;
	}
	if (this.containername) {
		info.containername = this.containername;
	}
	if (LOCATION.hasOwnProperty(opts.location)) {
		info.bAppOnly = (opts.location === LOCATION.APP);
		if (info.bAppOnly) {
			info.servername = '';
		}
	} else {
		info.bAppOnly = false;
	}

	if (!this._client) {
		this._init();
	}

	return this._client.loadConfigByInfo(info).then(function(resp) {
		var content = iconv.decode(resp.response.arguments.config, "GBK"), format = FORMAT.C;

		if (FORMAT.hasOwnProperty(opts.format)) {
			format = opts.format;
		}
		switch (format) {
			case FORMAT.C : {
				var parser = new ConfigParser();
				parser.parseText(content, "utf8");
				return parser.data;
			}
			case FORMAT.JSON : {
				return JSON.parse(content);
			}
			case FORMAT.TEXT : {
				return content;
			}
		}
	});
};

TarsConfig.prototype._loadMultiConfig = function(fileList, options) {
	var ths = this;

	return Promise.all(fileList.map(function(filename) {
		return ths.loadConfig(filename, options).then(function(content) {
			return {
				"filename" : filename, 
				"content" : content
			};
		});
	}));
};

TarsConfig.prototype.loadList = function(options) {
	var info = new tars.GetConfigListInfo(), opts = options || {};
	info.appname = this.app;
	info.servername = this.server;
	if (this.setdivision) {
		info.setdivision = this.setdivision;
	}
	if (this.containername) {
		info.containername = this.containername;
	}
	if (LOCATION.hasOwnProperty(opts.location)) {
		info.bAppOnly = (opts.location === LOCATION.APP);
		if (info.bAppOnly) {
			info.servername = '';
		}
	} else {
		info.bAppOnly = false;
	}

	if (!this._client) {
		this._init();
	}

	return this._client.ListAllConfigByInfo(info).then(function(resp) {
		return resp.response.arguments.vf.value;
	});
};

TarsConfig.prototype.loadConfig = function(fileList, options) {
	var ths = this;

	if (Array.isArray(fileList)) {
		return this._loadMultiConfig(fileList, options);
	} else if (typeof fileList === 'string' && fileList !== '') {
		return this._loadSingleConfig(fileList, options);
	} else {
		assert(!options || !options.isAppConfig, 'Can\'t load all app config');
		return this.loadList(options).then(function(_fileList) {
			return ths._loadMultiConfig(_fileList, options);
		});
	}
};

module.exports = exports = TarsConfig;