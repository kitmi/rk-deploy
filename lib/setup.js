"use strict";

module.exports = {
    timezone_: function (session, itemConfig, logger) {
        if (itemConfig.indexOf('/') <= 0) {
            return Promise.reject('Invalid timezone setting: ' + itemConfig);
        }

        return session.ssh.execCommand(`test -f "/usr/share/zoneinfo/${itemConfig}"`).then(result => {
            if (result.code !== 0) return Promise.reject('Unsupported time zone: ' + itemConfig);

            return session.ssh.execCommand(`sudo cp /usr/share/zoneinfo/${itemConfig} /etc/localtime`);
        }).then(result => {
            if (result.code !== 0) return Promise.reject(`Failed to change time zone.\nError: ${result.stderr}`);

            logger.info('Timezone set to: ' + itemConfig);
        });
    }
};