'use strict';

var _ = require("underscore");

/**
 * ForwardConfiguration is a proxy of the actual ContextConfiguration(s),
 * it forwards get request till any of this._forwards returns non-null
 * it allows runtime hotswaps of this._forwards to reflect the remote/file changes detected
 * @type {Function}
 */
var ForwardConfiguration = exports.ForwardConfiguration = function(forwards){

    this._forwards = _.compact(forwards);
};


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
};