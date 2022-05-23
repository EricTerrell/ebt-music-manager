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
    static _getSettingsPath() {
        return FileUtils.getAppFilePath(StringLiterals.SETTINGS_FILENAME);
    }

    static getDefaultSettings() {
        return {
        };
    }

    static getSettings() {
        try {
            const text = fs.readFileSync(Files._getSettingsPath(), StringLiterals.ENCODING)
                .toString(StringLiterals.ENCODING);

            return JSON.parse(text);
        } catch (err) {
            console.log(`getSettings ${Files._getSettingsPath()} ${err}`);

            return Files.getDefaultSettings();
        }
    }

    static saveSettings(settings) {
        try {
            console.info(`Files.saveSettings: ${JSON.stringify(settings)}`);

            fs.writeFileSync(Files._getSettingsPath(), JSON.stringify(settings));
        } catch (err) {
            console.log(`saveSettings ${Files._getSettingsPath()} ${JSON.stringify(settings)} ${err}`);
        }
    }

    static _getLicenseTermsPath() {
        return FileUtils.getAppFilePath(StringLiterals.LICENSE_TERMS);
    }

    static getLicenseTerms() {
        try {
            const text = fs.readFileSync(Files._getLicenseTermsPath(), StringLiterals.ENCODING)
                .toString(StringLiterals.ENCODING);

            return JSON.parse(text);
        } catch (err) {
            console.log(`getLicenseTerms ${Files._getLicenseTermsPath()} ${err}`);

            return {
                userAccepted: false
            }
        }
    }

    static saveLicenseTerms(licenseTerms) {
        try {
            fs.writeFileSync(Files._getLicenseTermsPath(), JSON.stringify(licenseTerms));
        } catch (err) {
            console.log(`saveLicenseTerms: path: ${Files._getLicenseTermsPath()} ${err}`);
        }
    }
};