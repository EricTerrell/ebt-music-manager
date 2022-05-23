/*
  EBT Music Manager
  (C) Copyright 2022, Eric Bergman-Terrell

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

    'busy': {
        'width': 500,
        'height': 280
    },

    'playlist': {
        'width': 1161,
        'height': 603
    },

    'renamePlaylist': {
        'width': 850,
        'height': 240
    },

    'about': {
        'width': 730,
        'height': 539
    },

    'main': {
        'width': 1200,
        'height': 849
    },

    'settings_ui': {
        'width': 1055,
        'height': 366
    }
};

module.exports = class WindowInfo {
    static saveWindowInfo(windowId, window) {
        const bounds = window.getBounds();

        const windowInfo = {
            width: bounds.width,
            height: bounds.height,
            x: bounds.x,
            y: bounds.y
        };

        WindowInfo._writeWindowInfo(windowId, windowInfo);
    }

    static loadWindowInfo(windowId) {
        try {
            return WindowInfo._readWindowInfo(windowId);
        } catch (error) {
            console.info(`WindowInfo.loadWindowInfo ${windowId} ${error}`);

            return defaultWindowInfo[windowId];
        }
    }

    static _getWindowInfoPath(windowId) {
        return FileUtils.getAppFilePath(`${windowId}_windowInfo.json`);
    }

    static _readWindowInfo(windowId) {
        const windowInfoPath = WindowInfo._getWindowInfoPath(windowId);

        const text = fs.readFileSync(windowInfoPath, Constants.READ_WRITE_FILE_OPTIONS)
            .toString(StringLiterals.ENCODING);

        return JSON.parse(text);
    }

    static _writeWindowInfo(windowId, windowInfo) {
        const windowInfoPath = WindowInfo._getWindowInfoPath(windowId);

        try {
            fs.writeFileSync(windowInfoPath, JSON.stringify(windowInfo));
        } catch (err) {
            console.log(`WindowInfo._writeWindowInfo ${windowId} ${windowInfoPath} ${JSON.stringify(windowInfo)} ${err}`);
        }
    }
};