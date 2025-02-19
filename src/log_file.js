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
const path = require('path');

const StringLiterals = require('./lib/stringLiterals');
const Files = require('./lib/files');

wireUpUI();

function wireUpUI() {
    const logFileContent = document.querySelector('#log_file_content');
    const closeButton = document.querySelector('#close');

    const settings = Files.getSettings();

    if (settings.targetFolder !== undefined) {
        const logPath = `${settings.targetFolder}${path.sep}${StringLiterals.LOG_FILENAME}`;

        try {
            const logFileText = fs.readFileSync(logPath, StringLiterals.ENCODING);
            logFileContent.innerHTML = `<pre>${logFileText}</pre>`;
        } catch (e) {
            console.error(e);
        }
    }

    const topButton = document.querySelector('#top');
    const bottomButton = document.querySelector('#bottom');

    topButton.addEventListener(StringLiterals.CLICK, () => {
        logFileContent.scrollTo(0, 0);
    });

    bottomButton.addEventListener(StringLiterals.CLICK, () => {
        logFileContent.scrollTo(0, logFileContent.scrollHeight);
    });

    closeButton.addEventListener(StringLiterals.CLICK, () => {
        window.close();
    });
}
