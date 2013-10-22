'use strict';

var _ = require('underscore'),
    util = require('util'),
	EventEmitter = require('events').EventEmitter;

/**
 * ForwardConfiguration is a proxy of the actual ContextConfiguration(s),
 * it forwards get request till any of this._forwards returns non-null
 * it allows runtime hotswaps of this._forwards to reflect the remote/file changes detected
 * @type {Function}
 */
var ForwardConfiguration = exports.ForwardConfiguration = function(forwards){

	var _this = this;
    _this._forwards = _.compact(forwards);

    _.invoke(
    	_.filter(_this._forwards, function(f){return _.isFunction(f.on)}),
    	'on', 
    	'change', 
    	function(event){
	     	_this.emit('change');
	    });//build up the change event chain upwards
};

util.inherits(ForwardConfiguration, EventEmitter);

/**
 * @param {String} key
 * @param {Iterator<List<KeyValue>>} contextsIterator
 * @param {Object} onMiss
 */
ForwardConfiguration.prototype.get = function(key, contextsIterator, onMiss){

    var found = _.reduce(this._forwards, function(memoize, forward){
        return memoize || forward.get(key, contextsIterator);
    }, null);

    return found || onMiss;
}

/**
 * @param forwards
 */
ForwardConfiguration.prototype.swap = function(forwards){
    this._forwards = _.compact(forwards);

    this.emit('change', this._forwards);
};