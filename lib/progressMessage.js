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

const StringLiterals = require('./stringLiterals');

module.exports = class ProgressMessage {
    static send(message, message2 = undefined, percent = undefined, completed = false) {
        if (ipcRenderer !== undefined) {
            const formatMessage = this.#formatMessage.bind(this);

            ipcRenderer.invoke(StringLiterals.PROGRESS_MESSAGE, {
                message: formatMessage(message),
                message2: formatMessage(message2),
                percent,
                completed
            }).then();
        }
    }

    static #formatMessage(message) {
        return message === undefined ? message : message.replaceAll('\\r\\n', '<br/>');
    }
};
