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

// See the following for rules for various operating systems: https://kb.acronis.com/content/39790

const fs = require("fs");
const path = require("path");

const Cancel = require('../lib/cancel');

module.exports = class FileSystemUtils {
    static {
        this.illegalCharacters = '/?<>\\:*|"^';
    }

    static validFolderName(folderName) {
        let validFolderName = '';

        for (let ch of folderName) {
            if (this.illegalCharacters.indexOf(ch) === -1) {
                validFolderName += ch;
            } else {
                validFolderName += '#';
            }
        }

        validFolderName = validFolderName.trim();

        // OSX: File and folder names are not permitted to begin with a dot "."
        if (validFolderName.startsWith('.')) {
            validFolderName = validFolderName.substring(1);
        }

        const maxFolderLength = 255;

        if (validFolderName.length > maxFolderLength) {
            validFolderName = validFolderName.substring(0, maxFolderLength);
        }

        // Filter out illegal chars.
        return validFolderName;
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
};
