'use strict';

var EventEmitter = require('events').EventEmitter,
    NodeConfig = require('../lib/node-config.js').NodeConfig,
    should = require('should'),
    when = require('when');

// Trap all uncaught exception here.
process.on('uncaughtException', function (error) {
    console.log(error.stack || error);
});

describe('NodeConfig', function(){

    before(function(done){

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

        done();
    });

    describe('#load', function () {

        var emitter = new EventEmitter(),
            tillDone = when.defer();

        it('should load config and send config-read message back', function(done){
            
            emitter.on('config-read', function(message){
                tillDone.resolve(message);
            });

            tillDone.promise.then(function(message){
                
                should.exists(message, 'message should not be null');
                (message.type).should.equal('config-read');
                (message.config).should.equal('SRP');
                (message.properties.length).should.equal(2);
                done();
            })
            .otherwise(function(error){
                
                done(error);
            });

            new NodeConfig(process.cwd() + '/test/config', emitter).load({
                'domain':'E|qa.ebay.com',
                'target':'Global',
                'project':'search',
                'config':'SRP',
                'version':'1.0.0'
            });
        });
    });
});
