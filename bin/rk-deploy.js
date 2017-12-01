#!/usr/bin/env node

const minimist = require('minimist');
const path = require('path');
const { Config, JsonConfigProvider } = require('rk-config');
const Manager = require('../');

let argv = minimist(process.argv.slice(2), {
    "string": [ "etcPath" ],
    "alias": {
        "etcPath": [ "etc", "c" ]
    },
    "default": {
        "etcPath": "./"
    }
});

let etcPath = argv['etcPath'];
let configLoader = new Config(new JsonConfigProvider(etcPath, 'config'));
let deployManager;

process.on('uncaughtException', (err) => {
    if (deployManager) {
        deployManager.logger.error(err);
    } else {
        console.error(err);
    }
});

configLoader.load().then(cfg => {
    deployManager = new Manager(cfg);
    return deployManager.run_();
}).then(() => deployManager.done_()).catch(err => {
    deployManager.logger.error(err);
    process.exit(1);
});