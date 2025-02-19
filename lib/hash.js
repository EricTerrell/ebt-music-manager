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

const crypto = require('crypto');

const StringLiterals = require('./stringLiterals');

module.exports = class Hash {
    static generateHash(text) {
        const hash = crypto.createHmac('sha256', text)
            .digest('hex');

        return this.#formatDigest(hash);
    }

    static #formatDigest(digest) {
        const chunkSize = 4;

        let result = StringLiterals.EMPTY_STRING;

        while (digest.length >= chunkSize) {
            result += '-' + digest.substring(0, chunkSize);
            digest = digest.substring(chunkSize);
        }

        if (digest.length > 0) {
            result += '-' + digest;
        }

        return result.substring(1);
    }
};
