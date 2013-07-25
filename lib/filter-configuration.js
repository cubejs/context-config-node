'use strict';

var ForwardConfiguration = require('./forward-configuration.js').ForwardConfiguration,
    _ = require("underscore"),
	EventEmitter = require("events").EventEmitter,
	util = require("util"),
    any = function(candidate){
        return true;
    };

/**
 * FilterConfiguration is a proxy of the actual ContextConfiguration(s),
 * it candidates get request till any of this._candidates returns non-null
 * it allows runtime hotswaps of this._candidates to reflect the remote/file changes detected
 * @type {Function}
 */
var FilterConfiguration = exports.FilterConfiguration = function(candidates){

	var _this = this;
    _this._candidates = _.compact(candidates);

    _.invoke(
    	_.filter(_this._candidates, function(f){return _.isFunction(f.on)}),
    	'on', 
    	'change', 
    	function(event){
	     	_this.emit('change');
	    });//build up the change event chain upwards
};

util.inherits(FilterConfiguration, EventEmitter);

/**
 * @param {String} key
 * @param {Iterator<List<KeyValue>>} contextsIterator
 * @param {Object} onMiss
 */
FilterConfiguration.prototype.get = function(key, contextsIterator, onMiss){

    var found = _.reduce(this._candidates, function(memoize, forward){
        return memoize || forward.get(key, contextsIterator);
    }, null);

    return found || onMiss;
}

/**
 * @param candidates
 */
FilterConfiguration.prototype.use = function(criteria){
    
    return new ForwardConfiguration(
        _.filter(this._candidates, 
            criteria ? function(c){
                return criteria.apply(null, [c.criteria]);
            } : any));
};