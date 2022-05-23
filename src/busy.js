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

const {ipcRenderer} = require('electron');

const StringLiterals = require('./lib/stringLiterals');

const messageDiv = document.querySelector('#message');
const percentDiv = document.querySelector('#percent');
const okButton = document.querySelector('#ok');
const cancelButton = document.querySelector('#cancel');

ipcRenderer.on(StringLiterals.PROGRESS_MESSAGE, (event, data) => {
    if (data.message !== undefined) {
        messageDiv.innerHTML = data.message;
    }

    if (data.percent !== undefined) {
        percentDiv.innerHTML = `${data.percent.toFixed(2)}&percnt; complete`;
    }

    if (data.completed === true) {
        cancelButton.disabled = true;
        okButton.disabled = false;
    }
});

wireUpUI();

function wireUpUI() {
    cancelButton.addEventListener(StringLiterals.CLICK, async () => {
        cancelButton.disabled = true;

        const message = document.querySelector('#message');

        message.innerHTML = 'Cancelling...';

        // Send cancel notification to main process.
        ipcRenderer.invoke(StringLiterals.USER_CANCELLED)
            .then(() => {
                console.log(`busy.js: sent "${StringLiterals.USER_CANCELLED}" notification`);
            });
    });

    okButton.addEventListener(StringLiterals.CLICK, () => {
        ipcRenderer.invoke(StringLiterals.BUSY, {
            'displayDialog': false
        }).then();
    })
}
