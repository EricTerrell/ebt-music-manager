/*
  EBT Music Manager
  (C) Copyright 2023, Eric Bergman-Terrell

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

// See the following for rules for various operating systems:
// https://gist.github.com/doctaphred/d01d05291546186941e1b7ddc02034d3
// https://docs.microsoft.com/en-us/windows/win32/fileio/filesystem-functionality-comparison?redirectedfrom=MSDN#limits

const fs = require("fs");
const path = require("path");

const Cancel = require('./cancel');
const StringLiterals = require('./stringLiterals');

module.exports = class FileSystemUtils {
    static {
        this.illegalFileNameCharacters = '<>:"/\\|?*';
    }

    static containsIllegalFileNameCharacters(str) {
        const isIllegalChar = (ch) => this.illegalFileNameCharacters.indexOf(ch) !== -1;

        return str
            .split(StringLiterals.EMPTY_STRING)
            .some(isIllegalChar);
    }

    static validFileName(fileName) {
        let validFileName = StringLiterals.EMPTY_STRING;

        for (let ch of fileName) {
            if (this.illegalFileNameCharacters.indexOf(ch) === -1) {
                validFileName += ch;
            } else {
                validFileName += '#';
            }
        }

        validFileName = validFileName.trim();

        // OSX: File and folder names are not permitted to begin with a dot "."
        if (validFileName.startsWith('.')) {
            validFileName = validFileName.substring(1);
        }

        const maxFileNameLength = 255;

        if (validFileName.length > maxFileNameLength) {
            validFileName = validFileName.substring(0, maxFileNameLength);
        }

        return validFileName;
    }

    static getAllFilePaths(folderPath) {
        Cancel.checkForCancellation();

        let result = {};

        const items = fs.readdirSync(folderPath, { withFileTypes: true });

        for (const item of items) {
            const itemPath = path.join(folderPath, item.name);

            if (item.isFile()) {
                result[itemPath] = true;
            } else if (item.isDirectory()) {
                const directoryContents = FileSystemUtils.getAllFilePaths(itemPath);

                result = Object.assign({}, result, directoryContents);
            }
        }

        return result;
    }

    static getAllFolderPaths(folderPath) {
        Cancel.checkForCancellation();

        let result = {};

        const items = fs.readdirSync(folderPath, { withFileTypes: true });

        for (const item of items) {
            const itemPath = path.join(folderPath, item.name);

            if (item.isDirectory()) {
                result[itemPath] = true;

                const directoryContents = FileSystemUtils.getAllFolderPaths(itemPath);

                result = Object.assign({}, result, directoryContents);
            }
        }

        return result;
    }

    static removeFolder(folderPath) {
        if (fs.existsSync(folderPath)) {
            const options = {
                'recursive': true,
                'force': true
            };

            fs.rmSync(folderPath, options);
        }
    }

    static mkdir(folderPath) {
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
        }
    }
};
