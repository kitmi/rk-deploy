"use strict";

const U = require('rk-utils');
const path = require('path');

class TaskList {
    
    constructor(manager, nodeName) {
        this.manager = manager;
        this.nodeName = nodeName;
        this.components = [];
    }    
    
    enqueueComponents(components) {
        this.components = this.components.concat(components);
    }
    
    execute_() {
        this.manager.logger.info(`Executing task list on node [${this.nodeName}] ...`);

        return this.manager.getSession_(this.nodeName).then(session => {

            let componentsDeploy = [];            

            U._.each(this.components, componentInfo => {
                componentsDeploy.push(() => this._getDeployer(session, componentInfo).deploy_(this.manager.reinstallExistingComponent));
            });

            return U.eachPromise(componentsDeploy);
        }).then(() => {
            this.manager.logger.info(`All deployment tasks for node [${this.nodeName}] are completed successully.`);
        });
    }

    _getDeployer(session, component) {
        let componentConfig = this.manager.getComponentSetting(component.name);
        if (!componentConfig) {
            throw new Error(`Component [${component.name}] not found in configuration.`);
        }

        let [ typeOfDeployer, instanceName ] = component.name.split('.');

        let Deployer = require(path.resolve(__dirname, './components', U.S(typeOfDeployer).camelize().s + '.js'));
        return new Deployer(session, instanceName, this.manager.logger, Object.assign({}, componentConfig, component.options));
    }
}

module.exports = TaskList;
