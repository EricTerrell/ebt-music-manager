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

const StringLiterals = require("./stringLiterals");

module.exports = class Cancel {
    static isCancelled() {
        return this._cancelled;
    }

    static reset() {
        console.log('Cancel.reset');

        this._cancelled = false;
    }

    static cancel() {
        console.log('Cancel.cancel');

        this._cancelled = true;
    }

    static checkForCancellation() {
        if (Cancel.isCancelled()) {
            console.log(`Cancel.checkForCancellation: ${StringLiterals.USER_CANCELLED}`);

            throw new Error(StringLiterals.USER_CANCELLED);
        }
    }
};
