/*
  EBT Music Manager
  (C) Copyright 2024, Eric Bergman-Terrell

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

const {ipcRenderer} = require('electron');

const StringLiterals = require('./lib/stringLiterals');
const Cancel = require('./lib/cancel');
const WindowUtils = require('./lib/windowUtils');

const okButton = document.querySelector('#ok');
const cancelButton = document.querySelector('#cancel');
const logFileButton = document.querySelector('#log-file');

ipcRenderer.on(StringLiterals.PROGRESS_MESSAGE, (event, data) => {
    if (data.message !== undefined) {
        document.querySelector('#message').innerHTML = data.message;
    }

    if (data.message2 !== undefined) {
        document.querySelector('#message2').innerHTML = data.message2;
    }

    if (data.percent !== undefined && !isNaN(data.percent)) {
        document.querySelector('#percent').innerHTML = `${data.percent.toFixed(2)}&percnt; complete`;
    }

    if (data.completed) {
        cancelButton.disabled = true;
        okButton.disabled = false;
        logFileButton.style.display = StringLiterals.DISPLAY_INLINE;
    }
});

ipcRenderer.on(StringLiterals.BUSY_DIALOG_CONFIGURE, (event, options) => {
    if (options.noCancel) {
        cancelButton.disabled = okButton.disabled = true;
    }
});

wireUpUI();

function wireUpUI() {
    logFileButton.addEventListener(StringLiterals.CLICK, displayLogFile);

    cancelButton.addEventListener(StringLiterals.CLICK, async () => {
        console.log('user clicked cancel button');

        cancelButton.disabled = true;

        const message = document.querySelector('#message');

        message.innerHTML = 'Cancelling...';

        Cancel.cancel();
    });

    okButton.addEventListener(StringLiterals.CLICK, () => {
        ipcRenderer.invoke(StringLiterals.BUSY, {
            'displayDialog': false
        }).then();
    })
}

function displayLogFile() {
    WindowUtils.createWindow('log_file', true);
}
