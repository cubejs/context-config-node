'use strict';

var _ = require("underscore"),
    assert = require("assert"),
    BitSet = require("./bitset.js").BitSet;

var ContextConfiguration = exports.ContextConfiguration = function(properties, contexts){
    var self = this;
    //a configuration is essentially a list(array) of rows, each row is a map of contexts, each context maps context value to the row key
    self._properties = []; //[{"_key_":"k", "context":{"site":"en-US"}, "value":"v"]
    self._columnFamily = {};
    self._knownContexts = contexts || [];

    _.each(properties, function(property){self.append(property);});
};

ContextConfiguration.prototype.append = function(property){
    var self = this;
    var row = self._properties.push(property) - 1;
    var normalized = normalize(self._knownContexts, property.context);
    normalized.unshift({"key":"_key_", "value":property.key});

    _.each(normalized, function(context){
        var column = self._columnFamily[context.key] || {};
        var refs = column[context.value] || new BitSet();
        refs.set(row);
        column[context.value] = refs;
        self._columnFamily[context.key] = column;
    });
};

/**
 * @param {String} key
 * @param {Iterator<List<KeyValue>>} contextsIterator
 * @param {Object} onMiss
 */
ContextConfiguration.prototype.get = function(key, contextsIterator, onMiss){

    var self = this;
    var head = new BitSet().or(self._columnFamily["_key_"][key] || miss);

    var pick = head.nextSetBit(0);
    if(pick < 0){
        return onMiss;
    }

    contextsIterator = contextsIterator || none;
    if(!_.has(contextsIterator, "hasNext")){
        contextsIterator = self.context(contextsIterator);
    }
    if(!contextsIterator.hasNext()){
        return self._properties[pick].value;
    }

    for(var contexts = contextsIterator.next(); contexts; contexts = contextsIterator.next()){
        var copy = new BitSet().or(head);
        var crossReferences = _.reduce(contexts, function(memoize, context){
                return memoize.and(self._columnFamily[context.key][context.value] || miss);
            },
            copy);

        pick = crossReferences.nextSetBit(0);
        if(pick >= 0){
            return self._properties[pick].value
        }
    }

    return onMiss;
}

ContextConfiguration.prototype.context = function(contexts){

    assert.ok(_.isArray(contexts), "contexts must be an array");

    if(contexts.length === 0){
        return none;
    }

    var head = contexts[0];
    if(_.isArray(head)){//list of fallbacks
        var at = 0;
        return {
            "hasNext": function(){return at < contexts.length;},
            "next": function(){
                var next = contexts[at];
                at += 1;
                return _.map(next, function(context){
                    var keys = _.keys(context);
                    var key = keys[0];
                    return {
                        "key" : key,
                        "value" : context[key]
                    };
                });
            }
        };
    }
    else{//single element
        var iterated = false;
        return {
            "hasNext": function(){return !iterated;},
            "next": function(){
                var next = !iterated ? contexts: null;
                iterated = true;
                return _.map(next, function(context){
                    var keys = _.keys(context);
                    var key = keys[0];
                    return {
                        "key" : key,
                        "value" : context[key]
                    };
                });
            }
        }
    }
};

var normalize = function(knowns, contexts){
    return _.map(knowns, function(known){
        var found = contexts[known] || "_null_";
        return {"key":known, "value": found};
    });
};

/** this is a pseudo BitSet which represents a all clear BitSet **/
var miss = {
    "set": function(pos){},
    "get": function(pos){return 0;},
    "cardinality": function(){return 0;},
    "and": function(bitSet){return miss;},
    "or": function(bitSet){return bitSet;},
    "xor": function(bitSet){return bitSet.xor(new BitSet(0));},
    "nextSetBit": function(pos){return -1;},
    "words": function(){return 0;},
    "length": function(){return 0;}
};

var none = {
    "hasNext" : function(){return false;},
    "next" : function(){return null;}
}