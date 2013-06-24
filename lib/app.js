'use strict';

var _ = require("underscore"),
    Q = require("q"),
    ContextConfiguration = require("./context-configuration.js").ContextConfiguration,
    ForwardConfiguration = require("./forward-configuration.js").ForwardConfiguration,
    FilterConfiguration = require("./filter-configuration.js").FilterConfiguration,
    util = require("util"),
    cluster = require("cluster"),
    assert = require("assert");

var CLUSTER_EMITTER = {
    on: function(event, handler){
        var wrapped = function(message){//worker listening to "message"
            if(_.isEqual(event, message.type)){
                handler(message);
            }
        };
        process.on("message", wrapped);
        return wrapped;
    },
    emit: function(event, message){
        _.extend(message, {
            type:"delegate",
            delegate:event,
            expect:"config-read",
            notification:true,
        });
        process.send(message);
    },//pseudo event emitter in cluster
    removeListener: function(event, handler){
        process.removeListener("message", handler);
    }
};

var DEFAULT_EMITTER = {
    on: function(event, handler){
        process.on(event, handler);
        return handler;
    },
    emit: function(event, message){
        process.emit(event, message);
    },
    removeListener: function(event, handler){
        process.removeListener(event, handler);
    }
}

var ConfigurationBuilder = exports.ConfigurationBuilder = function(emitter){

    this._emitter = emitter || (cluster.isWorker ? CLUSTER_EMITTER : DEFAULT_EMITTER);
};

ConfigurationBuilder.prototype.build = function(context, ref){

    assert.ok(ref, "ref must be provided");
    var self = this;
    
    var _context = {"env":"DEV", "configRuntimeRoot":"config.runtime.root"};
    _.extend(_context, context || {});

    var prod = _.isEqual("PROD", _context.env);
    
    var _ref = {};
    _.extend(_ref, ref || {});

    var deferred = Q.defer(),
        unregister = null,
        timeOut = setTimeout(function(){
            emitter.removeListener("config-read", unregister);
            deferred.reject(new Error("timeout after 5s"));//timeout
        }, 5000);//TIME OUT IN 3 SECONDS

    var forward = getUnderRuntimeRoot(_context.configRuntimeRoot, _ref);
    if(forward){
        clearTimeout(timeOut);
        deferred.resolve(forward);
    }
    else{
        var emitter = self._emitter,
            handler = function(message){
                if(isExpected(_ref, message)){
                    if(!forward){//1st time
                        clearTimeout(timeOut);

                        forward = new ForwardConfiguration([new ContextConfiguration(message.properties, message.validContexts || [])]);
                        deferred.resolve(forward);
                        putUnderRuntimeRoot(_context.configRuntimeRoot, _ref, forward);
                    }
                    else{//updates
                        if(!message.error){//reject changes of error response
                            forward.swap([new ContextConfiguration(message.properties, message.validContexts || [])]);
                        }
                    }
                }
            };
            
        unregister = emitter.on("config-read", handler);
        unregister = _.isFunction(unregister) ? unregister : handler;

        emitter.emit("read-config", {
            "pid":process.pid,
            "base":_ref.base,
            "domain":_ref.domain,
            "target":_ref.target,
            "project":_ref.project,
            "config":_ref.config,
            "version":_ref.version
        });
    }

    return deferred.promise;
};

function getUnderRuntimeRoot(configRuntimeRoot, ref){
    var processRuntimeRoot = process[configRuntimeRoot] || {};
    return processRuntimeRoot[getPathUnderRuntimeRoot(ref)];
}

function putUnderRuntimeRoot(configRuntimeRoot, ref, put){
    var processRuntimeRoot = process[configRuntimeRoot] || {};
    processRuntimeRoot[getPathUnderRuntimeRoot(ref)] = put;
    process[configRuntimeRoot] = processRuntimeRoot;
}

function getPathUnderRuntimeRoot(ref){
    return util.format("/%s/%s/%s/%s/%s", ref.domain, ref.target, ref.project, ref.config, ref.version);
}

function isExpected(origin, message){
    return _.isEqual(_.pick(origin, "project", "config", "version"),
                    _.pick(message, "project", "config", "version"));
}

exports.ForwardConfiguration = ForwardConfiguration;
exports.FilterConfiguration = FilterConfiguration;
exports.ContextConfiguration = ContextConfiguration;
exports.NodeConfig = require("./node-config.js").NodeConfig;
exports.BitSet = require("./bitset.js").BitSet;