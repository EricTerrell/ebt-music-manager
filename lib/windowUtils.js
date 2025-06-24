/*
  EBT Music Manager
  (C) Copyright 2025, Eric Bergman-Terrell

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

const remote = require('@electron/remote');
const WindowInfo = require('./windowInfo');
const MenuUtils = require('./menuUtils');
const path = require('path');
const StringLiterals = require("./stringLiterals");

module.exports = class WindowUtils {
    static createWindow(windowName, modal = false, onDestroyedCallback = undefined) {
        const windowId = windowName;
        const windowInfo = WindowInfo.loadWindowInfo(windowId);

        console.log(`creating window ${windowName}`);

        const window = new remote.BrowserWindow({
            width: windowInfo.width,
            height: windowInfo.height,
            x: windowInfo.x,
            y: windowInfo.y,
            parent: remote.getCurrentWindow(),
            modal: modal,
            minimizable: false,
            resizable: true,
            webPreferences: {
                enableRemoteModule: true,
                nodeIntegration: true,
                contextIsolation: false,
                preload: path.join(__dirname, './src/preload.js')
            }
        });

        MenuUtils.disableMenus(window);

        const htmlFilePath = path.join(__dirname, `../${windowName}.html`);
        const theUrl = `file:///${htmlFilePath}`;
        console.info(`WindowUtils.createWindow: ${theUrl}`);
        window.loadURL(theUrl).then();

        window.webContents.once(StringLiterals.DESTROYED, () => {
            if (onDestroyedCallback) {
                onDestroyedCallback();
            }
        });

        window.on(StringLiterals.RESIZE, (/* event */) => {
            WindowInfo.saveWindowInfo(windowId, window);
        });

        window.on(StringLiterals.MOVE, (/* event */) => {
            WindowInfo.saveWindowInfo(windowId, window);
        });

        window.on(StringLiterals.CLOSED, () => {
            console.log(`destroying window ${windowName}`);
            window.destroy();
        });

        return window;
    }
};
