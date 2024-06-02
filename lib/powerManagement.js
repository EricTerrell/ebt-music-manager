/*
  EBT Music Manager
  (C) Copyright 2024, Eric Bergman-Terrell

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
const child_process = require('child_process');

const StringLiterals = require('./stringLiterals');
const Files = require('../lib/files');
const LogFile = require('../lib/logFile');

module.exports = class PowerManagement {
    static preventSleep() {
        const scriptPath = './resources/preventSleep.ps1';

        // Script will only exist for Windows version
        if (!fs.existsSync(scriptPath)) {
            return undefined;
        }

        const args = ['-executionpolicy', 'unrestricted', '-file', scriptPath];

        PowerManagement.#log(`PowerManagement.preventSleep:\r\n\tscriptPath: ${scriptPath}\r\n\targs: ${JSON.stringify(args)}`);

        const childProcess = child_process.spawn('PowerShell', args);

        childProcess.on(StringLiterals.CLOSE, function (code) {
            const message = `child process exited with code ${code}`;
            PowerManagement.#log(message);
        });

        childProcess.stdout.on(StringLiterals.DATA, (data) => {
            PowerManagement.#log(`child process stdout ${data}`);
        });

        childProcess.stderr.on(StringLiterals.DATA, (data) => {
            PowerManagement.#log(`child process stderr ${data}`);
        });

        PowerManagement.#log(`PowerManagement.preventSleep pid: ${childProcess.pid}`);

        return childProcess.pid;
    }

    static allowSleep(pid) {
        PowerManagement.#log(`PowerManagement.allowSleep child process pid: ${pid}`);

        const result = process.kill(pid);

        PowerManagement.#log(`PowerManagement.allowSleep result: ${result}`);
    }

    static #log(message) {
        console.log(message);

        const settings = Files.getSettings();

        if (fs.existsSync(settings.targetFolder)) {
            const logFilePath = path.join(settings.targetFolder, StringLiterals.LOG_FILENAME);

            const logFile = new LogFile(logFilePath, true);
            logFile.write(`${message}\r\n`);
        }
    }
};