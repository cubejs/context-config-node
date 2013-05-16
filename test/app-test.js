var EventEmitter = require("events").EventEmitter,
    Builder = require("../lib/app.js").ConfigurationBuilder,
    cluster = require("cluster"),
    should = require("should");

describe("Builder", function(){

    describe("#build", function(){

        var emitter = new EventEmitter();
        emitter.on("read-config", function(message){

            emitter.emit("config-read", {
                "type":"config-read",
                "properties":[{
                    "key":"k1",
                    "context": {"site":"en-US"},
                    "value":"v1"
                }
                ,{
                    "key":"k1",
                    "context": {"site":"de-DE"},
                    "value":"v2"
                }],
                "validContexts":["site"]
            });
        });

        var builder = new Builder({

        }, emitter);

        it("should build config correctly and callback", function(done){

            builder.build(function(config){
                should.exists(config);
                (config.get("k1")).should.equal("v1");
                done();
            }, function(error){
                done(error);
            });
        });
    });

    describe("message", function(){

        it("should work exactly the same in cluster environment using messaging", function(done){
            if(cluster.isMaster){

                var worker = cluster.fork();
                worker.on('message', function(message){
                    worker.send({
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

                var builder = new Builder({});
                builder.build(function(config){
                    should.exists(config);
                    (config.get("k1")).should.equal("v3");
                    done();

                }, function(error){
                    done(error);
                });
            }
        });
    });
});