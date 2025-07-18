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
const {dialog} = remote;

const StringLiterals = require('./stringLiterals');
const Constants = require('./constants');

module.exports = class ErrorHandler {
    static displayError(err) {
        const options = {
            type: StringLiterals.DIALOG_ERROR,
            title: 'Error',
            message: `${err}`,
            buttons: Constants.OK,
            defaultId: 0,
            cancelId: 2
        };

        dialog.showMessageBoxSync(remote.getCurrentWindow(), options);
    }
};