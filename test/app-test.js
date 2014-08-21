var EventEmitter = require("events").EventEmitter,
    Builder = require("../lib/app.js").ConfigurationBuilder,
    cluster = require("cluster"),
    should = require("should");

describe("Builder", function(){

    describe("#build", function() {

        var emitter = new EventEmitter();
        emitter.on("read-config", function(message){

            emitter.emit("config-read", {
                "config":"single",
                "type":"config-read",
                "properties":[{
                    "key":"k1",
                    "context": {"site":"en-US"},
                    "value":"v1"
                },{
                    "key":"k1",
                    "context": {"site":"de-DE"},
                    "value":"v2"
                }],
                "validContexts":["site"]
            });
        });

        var builder = new Builder(emitter);

        it("should build config correctly and callback", function(done){

            builder.build({}, {config:"single"})
            .then(function(config){
                should.exists(config);
                (config.get("k1")).should.equal("v1");
                done();
            }).fail(function(error){
                done(error);
            }).done();
        });
    });


    describe("#build - boolean value", function() {

        var emitter = new EventEmitter();
        emitter.on("read-config", function(message){

            emitter.emit("config-read", {
                "config":"single-boolean",
                "type":"config-read",
                "properties":[{
                    "key":"b1",
                    "context": {"site":"en-US"},
                    "value": false
                },{
                    "key":"b1",
                    "context": {"site":"de-DE"},
                    "value": true
                }],
                "validContexts":["site"]
            });
        });

        var builder = new Builder(emitter);

        it("should build config correctly and callback", function(done){

            builder.build({}, {config:"single-boolean"})
            .then(function(config){
                should.exists(config);
                (config.get("b1")).should.equal(false);
                (config.get("b1", [{'site': 'de-DE'}])).should.equal(true);
                done();
            }).fail(function(error){
                done(error);
            }).done();
        });
    });

    if(cluster.isMaster){
        describe("#build", function(){

            process.on("read-config", function(message){

                process.emit("config-read", {
                    "config":"default",
                    "type":"config-read",
                    "properties":[{
                        "key":"k1",
                        "context": {"site":"en-US"},
                        "value":"v1"
                    },{
                        "key":"k1",
                        "context": {"site":"de-DE"},
                        "value":"v2"
                    }],
                    "validContexts":["site"]
                });
            });

            var builder = new Builder();

            it("should build config correctly and callback", function(done){

                builder.build({}, {config:"default"})
                .then(function(config){
                    should.exists(config);
                    (config.get("k1")).should.equal("v1");
                    done();
                }).fail(function(error){
                    done(error);
                }).done();
            });
        });
    }

    describe("message", function(){

        it("should work exactly the same in cluster environment using messaging", function(done){
            if(cluster.isMaster){

                var worker = cluster.fork();
                worker.on('message', function(message){
                    worker.send({
                        "config":"cluster",
                        "type":"config-read",
                        "properties":[{
                                "key":"k1",
                                "context": {"site":"en-US"},
                                "value":"v3"
                            }
                            ,{
                                "key":"k1",
                                "context": {"site":"de-DE"},
                                "value":"v4"
                            }],
                        "validContexts":["site"]
                    });
                });

                var timeOut = setTimeout(function(){
                    worker.process.kill('SIGTERM');
                }, 5000);

                cluster.on('exit', function(worker, code, signal) {
                    done();
                });
            }
            else{

                var builder = new Builder();
                builder.build({}, {config:"cluster"})
                .then(function(config){
                    should.exists(config);
                    (config.get("k1")).should.equal("v3");
                    done();
                })
                .fail(function(error){
                    done(error);
                })
                .done();
            }
        });
    });
});