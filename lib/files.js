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
const FileUtils = require('./fileUtils');
const StringLiterals = require('./stringLiterals');

module.exports = class Files {
    static getCancelPath() {
        return FileUtils.getAppFilePath(StringLiterals.CANCEL_FILENAME);
    }

    static #getSettingsPath() {
        return FileUtils.getAppFilePath(StringLiterals.SETTINGS_FILENAME);
    }

    static getDefaultSettings() {
        return {
            lastVersionCheck: new Date('2019-01-01T00:00:00'),
            checkForUpdates: true,
            audioFileTypeActions: [
                {
                    fileType: StringLiterals.FLAC_FILE_TYPE,
                    action: StringLiterals.CONVERT_TO_MP3
                },
                {
                    fileType: StringLiterals.MP3_FILE_TYPE,
                    action: StringLiterals.COPY
                }
            ]
        };
    }

    static getSettings() {
        try {
            const text = fs.readFileSync(Files.#getSettingsPath(), StringLiterals.ENCODING)
                .toString(StringLiterals.ENCODING);

            return JSON.parse(text);
        } catch (err) {
            console.log(`getSettings ${Files.#getSettingsPath()} ${err}`);

            return Files.getDefaultSettings();
        }
    }

    static saveSettings(settings) {
        try {
            console.info(`Files.saveSettings: ${JSON.stringify(settings)}`);

            fs.writeFileSync(Files.#getSettingsPath(), JSON.stringify(settings));
        } catch (err) {
            console.log(`saveSettings ${Files.#getSettingsPath()} ${JSON.stringify(settings)} ${err}`);
        }
    }

    static #getLicenseTermsPath() {
        return FileUtils.getAppFilePath(StringLiterals.LICENSE_TERMS);
    }

    static getLicenseTerms() {
        try {
            const text = fs.readFileSync(Files.#getLicenseTermsPath(), StringLiterals.ENCODING)
                .toString(StringLiterals.ENCODING);

            return JSON.parse(text);
        } catch (err) {
            console.log(`getLicenseTerms ${Files.#getLicenseTermsPath()} ${err}`);

            return {
                userAccepted: false
            }
        }
    }

    static saveLicenseTerms(licenseTerms) {
        try {
            fs.writeFileSync(Files.#getLicenseTermsPath(), JSON.stringify(licenseTerms));
        } catch (err) {
            console.log(`saveLicenseTerms: path: ${Files.#getLicenseTermsPath()} ${err}`);
        }
    }
};