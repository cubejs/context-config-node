'use strict';

var EventEmitter = require("events").EventEmitter,
    NodeConfig = require("../lib/node-config.js").NodeConfig,
    Q = require("q"),
    Builder = require("../lib/app.js").ConfigurationBuilder,
    should = require("should");


// Trap all uncaught exception here.
process.on("uncaughtException", function (error) {
    console.log(error.stack || error);
});

describe("NodeConfig", function(){

    describe("#load", function () {

        var emitter = new EventEmitter();
        var deferred = Q.defer();

        it("should load config and send config-read message back", function(done){
            emitter.on("config-read", function(message){
                deferred.resolve(message);
            });
            deferred.promise.then(function(message){
                should.exists(message, "message shouldn't be null");
                (message.type).should.equal("config-read");
                (message.target).should.equal("Global");
                (message.config).should.equal("SRP");
                (message.properties.length).should.equal(2);
                done();
            })
            .fail(function(error){
                done(error);
            }).done();

            new NodeConfig(process.cwd() + "/test/config", emitter).load({
                "domain":"E|qa.ebay.com",
                "target":"Global",
                "project":"search",
                "config":"SRP",
                "version":"1.0.0"
            });

        });

        it("should load config by ConfigBuilder", function(done){

            var builder = new Builder(emitter);

            // someone reads some other variation with different target
            builder.build({}, {
                "domain":"E|qa.ebay.com",
                "target":"Target1",
                "project":"search",
                "config":"SRP",
                "version":"1.0.0"
            }).then(function(config) {
                should.exists(config, "message shouldn't be null");
                (config.get('k1')).should.equal("v1-t");
            })
            .fail(function(error){
                done(error);
            }).done();

            // this is our read
            builder.build({}, {
                "domain":"E|qa.ebay.com",
                "target":"Global",
                "project":"search",
                "config":"SRP",
                "version":"1.0.0"
            }).then(function(config) {
                should.exists(config, "message shouldn't be null");
                (config.get('k1')).should.equal("v1");
                done();
            })
            .fail(function(error){
                done(error);
            }).done();

            // simulate read of other config
            new NodeConfig(process.cwd() + "/test/config", emitter).load({
                "domain":"E|qa.ebay.com",
                "target":"Target1",
                "project":"search",
                "config":"SRP",
                "version":"1.0.0"
            });

            // simulate read of our config
            new NodeConfig(process.cwd() + "/test/config", emitter).load({
                "domain":"E|qa.ebay.com",
                "target":"Global",
                "project":"search",
                "config":"SRP",
                "version":"1.0.0"
            });

        });
    });
});
