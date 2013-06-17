'use strict';

/**
 * https://wiki.vip.corp.ebay.com/display/RAPTOR/App+Data+1.2#AppData12-MongoServiceforusersofRaptorConfigMongoService
 *
 * @type {*}
 */
var _ = require("underscore"),
    assert = require("assert");

var loadConfig = function(root, message, self){
    
    var properties = _.reduce(['domain', 'target', 'project', 'config', 'version'], function(memoize, field){
        return memoize && message[field] ? memoize[message[field]] : null;
    }, root);

    //this is a bugfix which allows raptor-config & node-config to be enabled at the same time
    //a raptor-config's read request will be silently ignored by node-config, and vise versa
    if(properties){
        var response = {};
        _.extend(response, message);
        _.extend(response, {
            type:"config-read",
            message:message,
            properties:properties
        });
        
        self._emitter.emit("config-read", response);
    }
};

//constructor
var NodeConfig = exports.NodeConfig = function(dir, emitter){

    var self = this;
    //for persistence/coldcache purpose.
    self._dir = dir;

    assert.ok(emitter, "emitter must be provided");
    self._emitter = emitter;
    self._emitter.on("read-config", function(message){
        self.load(message);
    });

    process.env["NODE_CONFIG_DIR"] = dir;
    self._config = require("config");
};

//main api
NodeConfig.prototype.load = function(message){

    var self = this;
    loadConfig(self._config, message, self);

    self._config.watch(self._config, null, function(obj, prop, oldValue, newValue){
        loadConfig(self._config, message, self);
    });
};
