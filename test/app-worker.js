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

var cluster = require('cluster');
    cluster.isMaster = false;
    cluster.isWorker = true;

var Builder = require('../lib/index').ConfigurationBuilder,
    should = require('should'),
    emitter = require('cluster2/emitter'),
    builder = new Builder(emitter);

builder.build({

    }, 
    {
        'config':'cluster'
    })
    .then(function(config){
        
        console.log('app-worker: %j', config);

        should.exists(config);
        (config.get('k1')).should.equal('v3');

        process.send({
            'type': 'success'
        });

        console.log('!');
        process.exit(0);
    })
    .otherwise(function(error){

        process.send({
            'type': 'error',
            'error': error
        });

        console.log('!!');
        process.exit(-1);
    });