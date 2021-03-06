"use strict";

const dockerHelpers = require('../dependencies/docker.js');

class MysqlByDocker {
    constructor(session, instanceName, logger, options) {
        this.session = session;
        this.instanceName = instanceName;
        this.logger = logger;
        this.options = options;
        this.imageName = this.options.imageName || 'mysql:latest';
    }

    deploy_(reinstallExistingComponent) {
        this.logger.info(`Deploying component "${this.instanceName}" to "${this.session.name}" ...`);

        return this.test_().then(installed => {
            if (!installed) return this.install_();
            
            if (reinstallExistingComponent) {
                this.logger.info(`Component "${this.instanceName}" exists and will be reinstalled as configured.`);

                return this.uninstall_().then(() => this.install_());
            } else {
                this.logger.info(`Component "${this.instanceName}" exists and the deployment process is skipped as configured.`);
            }
        }).then(() => {
            return dockerHelpers.isRunning_(this.session, this.instanceName, this.logger);
        }).then(running => {
            if (!running) return this.start_();
        });
    }

    test_() {
        this.logger.info(`Checking component "${this.instanceName}" ...`);

        return dockerHelpers.hasContainer_(this.session, this.instanceName, this.logger);
    }

    install_() {
        this.logger.info(`Installing component "${this.instanceName}" ...`);

        return dockerHelpers.ensureReady_(this.session, '17.0', this.logger).then(() => {
            this.logger.info(`Checking the latest version of image "${this.imageName}" ...`);
            return dockerHelpers.pullImage_(this.session, this.imageName, this.logger);
        });
    }
    
    uninstall_() {
        this.logger.info(`Uninstalling component "${this.instanceName}" ...`);

        return dockerHelpers.isRunning_(this.session, this.instanceName, this.logger).then(running => {
            if (running) return this.stop_();
        }).then(() => {
            return dockerHelpers.removeContainer_(this.session, this.instanceName, '', this.logger);
        })
    }

    start_() {
        this.logger.info(`Starting component "${this.instanceName}" ...`);
        
        let options = [];
        if (this.options.rootPassword) {
            options.push({ key: 'env', value: `MYSQL_ROOT_PASSWORD=${this.options.rootPassword}`});
        }
        
        return dockerHelpers.runImage_(this.session, this.imageName, this.instanceName, dockerHelpers.makeOptions(options), '', this.logger);
    }

    stop_() {
        this.logger.info(`Stopping component "${this.instanceName}" ...`);
        
        return dockerHelpers.stopContainer_(this.session, this.instanceName, '', this.logger);
    }
}

module.exports = MysqlByDocker;