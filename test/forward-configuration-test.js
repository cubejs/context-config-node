'use strict';

var ForwardConfiguration = require('../lib/forward-configuration').ForwardConfiguration,
    ContextConfiguration = require('../lib/context-configuration').ContextConfiguration,
    should = require('should'),
    _ = require('underscore');

describe('ForwardConfiguration', function() {

    describe('#get(key)', function(){
        var internal = new ContextConfiguration([], []);
        internal.append({
            'key':'k1',
            'value':'v1'
        });

        var config = new ForwardConfiguration([internal]);

        it('should get v1 using k1 ', function(done){
            (config.get('k1')).should.equal('v1');
            done();
        });
    });

    describe('change', function(){
        var internal = new ContextConfiguration([], []);
        internal.append({
            'key':'k1',
            'value':'v1'
        });

        var config = new ForwardConfiguration([internal]);

        it('should get notified on #swap', function(done){

            var timeOut = setTimeout(function(){
                done(new Error('time out'));
            }, 1000);

            config.on('change', function(forwards){
                clearTimeout(timeOut);
                forwards.should.not.be.empty;
                done();
            });

            config.swap([internal]);
        });
    });
});
