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

    handlers:  {

    },

    registered: false,

    on: function(event, handler){

        CLUSTER_EMITTER.handlers[event] = CLUSTER_EMITTER.handlers[event] || [];
        CLUSTER_EMITTER.handlers[event].push(handler);

        if(!CLUSTER_EMITTER.registered){
            CLUSTER_EMITTER.registered = true;
            process.on('message', function(message){

                _.invoke(CLUSTER_EMITTER.handlers[message.type] || [], 'call', null, message);
            });
        }
        
        return handler;
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
        
        CLUSTER_EMITTER.handlers[event] = _.without(CLUSTER_EMITTER.handlers[event] || [], handler);
    }
};

var DEFAULT_EMITTER = {

    handlers: {

    },

    on: function(event, handler){

        DEFAULT_EMITTER.handlers[event] = DEFAULT_EMITTER.handlers[event] || [];
        DEFAULT_EMITTER.handlers[event].push(handler);

        if(DEFAULT_EMITTER.handlers[event].length === 1){

            process.on(event, function(){
                _.invoke(DEFAULT_EMITTER.handlers[event] || [], 'apply', null, arguments);
            });
        }

        return handler;
    },

    emit: function(event, message){
        process.emit(event, message);
    },

    removeListener: function(event, handler){

        DEFAULT_EMITTER.handlers[event] = _.without(DEFAULT_EMITTER.handlers[event] || [], handler);
    }
}

var ConfigurationBuilder = exports.ConfigurationBuilder = function(emitter){

    this._emitter = emitter || (cluster.isWorker ? CLUSTER_EMITTER : DEFAULT_EMITTER);
};

ConfigurationBuilder.prototype.build = function(context, ref, options){

    assert.ok(ref, "ref must be provided");

    options = options || {
        'timeout': 5000
    };

    var self = this;
    
    var _context = {"env":"DEV", "configRuntimeRoot":"config.runtime.root"};
    _.extend(_context, context || {});

    var prod = _.isEqual("PROD", _context.env);
    
    var _ref = {};
    _.extend(_ref, ref || {});

    var deferred = Q.defer();//TIME OUT IN 3 SECONDS

    var forward = getUnderRuntimeRoot(_context.configRuntimeRoot, _ref),
        timeOut = setTimeout(function(){
            
            forward = new ForwardConfiguration([]); //unfortunately, nothing in it.
            deferred.resolve(forward);
            putUnderRuntimeRoot(_context.configRuntimeRoot, _ref, forward);
            console.log("[context-config] timeout after:%d for:%j", options.timeout, _ref);//timeout

        }, options.timeout);

    if(forward){
        clearTimeout(timeOut);
        deferred.resolve(forward);
    }
    else{
        var emitter = self._emitter;
            
        emitter.on("config-read", function onRead(message){
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
            });

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
    return _.isEqual(_.pick(origin, "target", "project", "config", "version"),
                    _.pick(message, "target", "project", "config", "version"));
}

exports.ForwardConfiguration = ForwardConfiguration;
exports.FilterConfiguration = FilterConfiguration;
exports.ContextConfiguration = ContextConfiguration;
exports.NodeConfig = require("./node-config.js").NodeConfig;
exports.BitSet = require("./bitset.js").BitSet;
