'use strict';

process.getLogger = function(){
    return {
        'info': function(){
            console.log.apply(console, arguments);
        },
        'debug': function(){
            console.log.apply(console, arguments);
        }
    }
};

var EventEmitter = require('events').EventEmitter,
    should = require('should'),
    fork = require('child_process').fork;

describe('Builder', function(){

    before(function(done){

        var emitter = require('cluster2').emitter;
            
        emitter.on('read-config', function(message){

            emitter.emit('config-read', {
                'config':'default',
                'type':'config-read',
                'properties':[{
                    'key':'k1',
                    'context': {'site':'en-US'},
                    'value':'v1'
                },
                {
                    'key':'k1',
                    'context': {'site':'de-DE'},
                    'value':'v2'
                }],
                'validContexts':['site']
            });
        });

        done();

    });

    describe('#build', function(){

        var emitter = new EventEmitter(),
            Builder = require('../lib/index').ConfigurationBuilder;

        emitter.on('read-config', function(message){

            emitter.emit('config-read', {
                'config':'single',
                'type':'config-read',
                'properties':[{
                    'key':'k1',
                    'context': {'site':'en-US'},
                    'value':'v1'
                },
                {
                    'key':'k1',
                    'context': {'site':'de-DE'},
                    'value':'v2'
                }],
                'validContexts':['site']
            });
        });

        var builder = new Builder(emitter);

        it('should build config correctly and callback', function(done){

            builder.build({

                }, 
                {
                    'config': 'single'
                })
                .then(function(config){
                    
                    should.exists(config);
                    (config.get('k1')).should.equal('v1');
                    done();

                }, done);
        });
    });

    describe('#build', function(){

        var Builder = require('../lib/index').ConfigurationBuilder,
            builder = new Builder();

        it('should build config correctly and callback', function(done){

            builder.build({

                }, 
                {
                    'config':'default'
                })
                .then(function(config){

                    should.exists(config);
                    (config.get('k1')).should.equal('v1');

                    done();

                }, done);
        });
    });

    describe('message', function(){

        it('should work exactly the same in cluster environment using messaging', function(done){
            
            var worker = fork(require.resolve('./app-worker'));

            require('cluster').emit('fork', worker);

            worker.on('message', function(message){

                done(message.error);
            });
        });
    });
});