'use strict';

var _ = require('underscore'),
    assert = require('assert'),
    util = require('util'),
    when = require('when'),
    timeout = require('when/timeout'),
    ContextConfiguration = require('./context-configuration').ContextConfiguration,
    ForwardConfiguration = require('./forward-configuration').ForwardConfiguration,
    FilterConfiguration = require('./filter-configuration').FilterConfiguration;

var ConfigurationBuilder = exports.ConfigurationBuilder = function(emitter){

    this._emitter = emitter || require('cluster-emitter');
};

ConfigurationBuilder.prototype.build = function(context, ref, options){

    assert.ok(ref, 'ref must be provided');

    options = options || {
        'timeout': 5000
    };

    var _this = this,
        _context = {'env':'DEV', 'configRuntimeRoot':'config.runtime.root'};

    _.extend(_context, context || {});

    var prod = _.isEqual('PROD', _context.env),
        _ref = {};

    _.extend(_ref, ref || {});

    var tillBuilt = when.defer(),
        forward = getUnderRuntimeRoot(_context.configRuntimeRoot, _ref);

    if(forward){
        tillBuilt.resolve(forward);
    }
    else{

        var emitter = _this._emitter;
        emitter.on('config-read', function onRead(message){
                if(isExpected(_ref, message)){
                    if(!forward){//1st time
                        
                        forward = new ForwardConfiguration([new ContextConfiguration(message.properties, message.validContexts || [])]);
                        tillBuilt.resolve(forward);
                        putUnderRuntimeRoot(_context.configRuntimeRoot, _ref, forward);
                    }
                    else{//updates
                        
                        if(!message.error){//reject changes of error response
                            forward.swap([new ContextConfiguration(message.properties, message.validContexts || [])]);
                        }
                    }
                }
            });

        emitter.emit('read-config', {
            'pid': process.pid,
            'base': _ref.base,
            'domain': _ref.domain,
            'target': _ref.target,
            'project': _ref.project,
            'config': _ref.config,
            'version': _ref.version
        });
    }

    return timeout(options.timeout, tillBuilt.promise);
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

    return util.format('/%s/%s/%s/%s/%s', ref.domain, ref.target, ref.project, ref.config, ref.version);
}

function isExpected(origin, message){

    return _.isEqual(_.pick(origin, 'base', 'project', 'config', 'version'),
                    _.pick(message, 'base', 'project', 'config', 'version'));
}

