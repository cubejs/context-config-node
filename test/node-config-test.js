'use strict';

var EventEmitter = require("events").EventEmitter,
    NodeConfig = require("../lib/node-config.js").NodeConfig,
    Q = require("q"),
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
    });
});
