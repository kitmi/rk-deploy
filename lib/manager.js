"use strict";

const U = require('rk-utils');
const _ = U._;
const Ssh = require('node-ssh');
const winston = require('winston');
const winstonFlight = require('winstonflight');
const TaskList = require('./tasklist.js');
const Node = require('./dependencies/node.js');
const Setup = require('./setup.js');

class Manager {
    constructor(cfg) {
        this.config = cfg;
        this.sessionPool = {};
        
        if (this.config.logger) {
            let loggerConfig = Object.assign({}, this.config.logger, { transports: winstonFlight(this.config.logger.transports) });
            
            this.logger = new (winston.Logger)(loggerConfig);
        } else {
            //Dummy logger
            this.logger = new Proxy({});
        }

        this.targetNodes = {};

        this.reinstallExistingComponent = U.getValueByPath(this.config, 'general.reinstallExistingComponent', false);
    }

    run_() {
        this.logger.info('Start deployment process ...');

        let nodesSetup = [];

        U._.forOwn(this.config.deploy, (deploySetting, nodesRole) => {

            U._.each(deploySetting.targets, nodeName => {
                nodesSetup.push(this._setupNode_(nodeName, deploySetting.setup));

                let taskList = this._getNodeTaskList(nodeName);
                taskList.enqueueComponents(deploySetting.components);
            });
        });

        let doComponentDeployJobs = U._.map(this.targetNodes, taskList => () => taskList.execute_());

        return Promise.all(nodesSetup).then(() => U.eachPromise(doComponentDeployJobs));
    }

    done_() {
        let works = U._.map(this.sessionPool, session => session.ssh.dispose());
        return Promise.all(works);
    }

    getComponentSetting(componentName) {
        return U.getValueByPath(this.config.components, componentName);
    }

    getSession_(nodeName) {
        let session = this.sessionPool[nodeName];
        if (!session) {
            let nodeInfo = this.config.nodes[nodeName];
            if (!nodeInfo) {
                return Promise.reject(`Node [${nodeName}] not found in configuration.`);
            }

            let ssh = new Ssh();
            let session = {
                name: nodeName,
                ssh
            };

            return ssh.connect(nodeInfo).then(() => {
                this.logger.info('Connected to: ' + nodeInfo.host);
                return ssh.execCommand('lsb_release -a');
            }).then(result => {
                if (result.code !== 0) {
                    return Promise.reject(`Unable to detect the OS type of node [${nodeInfo.host}].`);
                }

                //Distributor ID: 'Ubuntu',
                //Description: 'Ubuntu 16.04.3 LTS',
                //Release: '16.04',
                //Codename: 'xenial'
                let os = {};

                result.stdout.split('\n').forEach(line => {
                    if (line.indexOf(':') > 0) {
                        let [k, v] = line.split(':');
                        os[k.trim()] = v.trim();
                    }
                });

                session['os'] = os;
                return ssh.execCommand('uname -m');
            }).then(result => {
                if (result.code !== 0) {
                    return Promise.reject(`Unable to detect the processor type of node [${nodeInfo.host}].`);
                }

                session['processorType'] = result.stdout;

                this.sessionPool[nodeName] = session;
                return session;
            });
        }

        return Promise.resolve(session);
    }

    _setupNode_(nodeName, settings) {
        let doSetupJobs = [];

        U._.forOwn(settings, (itemConfig, setupItem) => {
            let jobMethod = setupItem + '_';

            if (!(jobMethod in Setup)) {
                throw new Error('Unsupported setup item: ' + setupItem);
            }

            doSetupJobs.push(() => this.getSession_(nodeName).then(session => Setup[jobMethod](session, itemConfig, this.logger)));
        });

        return U.eachPromise(doSetupJobs);
    }
    
    _getNodeTaskList(nodeName) {
        let list = this.targetNodes[nodeName];
        if (!list) {
            list = new TaskList(this, nodeName);
            this.targetNodes[nodeName] = list;
        }

        return list;
    }    
}

module.exports = Manager;