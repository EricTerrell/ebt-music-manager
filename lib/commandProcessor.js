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

const { exec } = require("child_process");

const AudioFileUtils = require('./audioFileUtils');
const Cancel = require('./cancel');
const ProgressMessage = require('./progressMessage');

module.exports = class CommandProcessor {
    static execShellCommand(command, sourceFilePath, targetFilePath, callback, log) {
        return new Promise((resolve, reject) => {
            Cancel.checkForCancellation();

            ProgressMessage.send(`Converting file "${sourceFilePath}" to "${targetFilePath}"`);

            const execResults = exec(command, {}, (error, stdout, stderr) => {
                if (error) {
                    log(`ERROR: ${error}`);
                    reject(error);
                } else if (stdout) {
                    // console.log(`STDOUT: ${stdout}`);
                } else if (stderr) {
                    // console.error(`STDERR: ${stderr}`);
                }
            });

            execResults.on('close', code => {
                callback(sourceFilePath, targetFilePath, code === 0);

                resolve(code);
            });

            execResults.on('error', error => {
                log(`ERROR: error: ${error}`);
            });
        });
    }
};
