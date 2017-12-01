"use strict";

module.exports = {
    install_: function (session, logger) {
        return session.ssh.execCommand('sudo apt-get update --assume-yes').then(result => {
            if (result.code !== 0) {
                return Promise.reject(`Failed to update packages.\nError: ${result.stderr}`);
            }

            logger.verbose(result.stdout);
            logger.info('Installing dependencies for Docker ...');

            return session.ssh.execCommand('sudo apt-get install --assume-yes apt-transport-https ca-certificates curl software-properties-common');
        }).then(result => {
            if (result.code !== 0) {
                return Promise.reject(`Failed to install dependencies for Docker.\nError: ${result.stderr}`);
            }

            logger.verbose(result.stdout);
            logger.info('Installed dependencies for Docker.');

            return session.ssh.execCommand('curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -');
        }).then(result => {
            if (result.code !== 0) {
                return Promise.reject(`Failed to add Docker’s official GPG key.\nError: ${result.stderr}`);
            }

            logger.verbose(result.stdout);
            logger.info('Added Docker’s official GPG key.');

            if (session.processorType === 'x86_64') {
                return session.ssh.execCommand('sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"');
            }

            return Promise.reject('Unsupported processor arch: ' + session.processorType);
        }).then(result => {
            if (result.code !== 0) {
                return Promise.reject(`Failed to add Docker repository.\nError: ${result.stderr}`);
            }

            logger.verbose(result.stdout);
            logger.info('Added Docker’s repository.');

            return session.ssh.execCommand('sudo apt-get update --assume-yes && sudo apt-get install --assume-yes docker-ce');
        }).then(result => {
            if (result.code !== 0) {
                return Promise.reject(`Failed to install docker.\nError: ${result.stderr}`);
            }

            logger.verbose(result.stdout);
            logger.info('Docker is installed successfully.');
        });
    },

    uninstall_: function (session, logger) {
        return session.ssh.execCommand('sudo apt-get remove --assume-yes docker docker-engine docker.io docker-ce').then(result => {
            if (result.code !== 0) {
                return Promise.reject(`Failed to uninstall Docker.\nError: ${result.stderr}`);
            }

            logger.verbose(result.stdout);
            logger.info('Docker is uninstalled successfully.');
        });
    }
};