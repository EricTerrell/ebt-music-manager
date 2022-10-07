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

module.exports = class LogFile {
    #filePath;

    constructor(filePath) {
        this.#filePath = filePath;

        fs.rmSync(this.#filePath, { force: true });
    }

    write(line) {
        console.log(line);

        fs.appendFileSync(this.#filePath, `${line}\r\n`, (error) => {
            console.error(error);
        });
    }
};
