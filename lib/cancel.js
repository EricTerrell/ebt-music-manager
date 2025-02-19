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

const fs = require('fs');

const StringLiterals = require('./stringLiterals');
const Constants = require('./constants');
const Files = require('./files');

module.exports = class Cancel {
    static isCancelled() {
        return fs.existsSync(Files.getCancelPath());
    }

    static reset() {
        console.log('Cancel.reset');

        try {
            fs.rmSync(Files.getCancelPath());
        } catch(err) {
            console.log(`Cancel.reset: error: ${err}`);
        }
    }

    static cancel() {
        console.log('Cancel.cancel');

        try {
            fs.appendFileSync(Files.getCancelPath(), StringLiterals.EMPTY_STRING, Constants.READ_WRITE_FILE_OPTIONS);
        } catch(err) {
            console.log(`Cancel.cancel: error: ${err}`);
        }
    }

    static checkForCancellation() {
        if (Cancel.isCancelled()) {
            console.log(`Cancel.checkForCancellation: cancelled`);

            Cancel.reset();

            throw new Error(StringLiterals.USER_CANCELLED);
        }
    }
};
