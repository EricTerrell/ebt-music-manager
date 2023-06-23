/*
  EBT Music Manager
  (C) Copyright 2023, Eric Bergman-Terrell

  This file is part of EBT Music Manager.

    EBT Music Manager is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    EBT Music Manager is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with EBT Music Manager.  If not, see <http://www.gnu.org/licenses/>.
*/

const fs = require('fs');
const Constants = require('./constants');
const FileUtils = require('./fileUtils');
const StringLiterals = require('./stringLiterals');

const defaultWindowInfo = {
    license_terms: {
        width: 897,
        height: 608
    },

    busy: {
        width: 500,
        height: 336
    },

    playlist: {
        width: 1161,
        height: 603
    },

    renamePlaylist: {
        width: 850,
        height: 240
    },

    check_for_updates: {
        width: 669,
        height: 223
    },

    about: {
        width: 730,
        height: 539
    },

    main: {
        width: 1200,
        height: 849
    },

    play: {
        width: 1200,
        height: 564
    },

    settings_ui: {
        width: 1083,
        height: 541
    },

    log_file: {
        width: 1000,
        height: 800
    }
};

module.exports = class WindowInfo {
    static saveWindowInfo(windowId, window) {
        const bounds = window.getBounds();

        const windowInfo = {
            width: bounds.width,
            height: bounds.height,
            x: bounds.x,
            y: bounds.y,
            isMaximized: window.isMaximized()
        };

        WindowInfo.#writeWindowInfo(windowId, windowInfo);
    }

    static loadWindowInfo(windowId) {
        let result = defaultWindowInfo[windowId];

        try {
            result = WindowInfo.#readWindowInfo(windowId);
        } catch (error) {
            console.info(`WindowInfo.loadWindowInfo ${windowId} ${error}`);
        }

        console.log(`WindowInfo.loadWindowInfo: result: ${JSON.stringify(result)}`);
        return result;
    }

    static #getWindowInfoPath(windowId) {
        return FileUtils.getAppFilePath(`${windowId}_windowInfo.json`);
    }

    static #readWindowInfo(windowId) {
        const windowInfoPath = WindowInfo.#getWindowInfoPath(windowId);

        const text = fs.readFileSync(windowInfoPath, Constants.READ_WRITE_FILE_OPTIONS).toString();

        return JSON.parse(text);
    }

    static #writeWindowInfo(windowId, windowInfo) {
        const windowInfoPath = WindowInfo.#getWindowInfoPath(windowId);

        try {
            fs.writeFileSync(windowInfoPath, JSON.stringify(windowInfo));
        } catch (err) {
            console.log(`WindowInfo._writeWindowInfo ${windowId} ${windowInfoPath} ${JSON.stringify(windowInfo)} ${err}`);
        }
    }
};