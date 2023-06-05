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

const path = require('path');

const StringLiterals = require('../lib/stringLiterals');
const AudioFileUtils = require('../lib/audioFileUtils');
const Hash = require('../lib/hash');
const Files = require('../lib/files');

module.exports = class TranscoderCommand {
    static createCommand(targetRootFolder, sourceFilePath, album, bitRate = StringLiterals.EMPTY_STRING) {
        const targetFolder = path.join(targetRootFolder, Hash.generateHash(album));
        const sourceFileType = path.extname(sourceFilePath);
        const targetFileName = `${path.basename(sourceFilePath, sourceFileType)}`;
        const targetFilePath = `${path.join(`${targetFolder}`, Hash.generateHash(targetFileName))}.${StringLiterals.MP3_FILE_TYPE}`;

        const isMP3 = AudioFileUtils.isMP3(sourceFilePath);

        const bitRateArg = isMP3 ? StringLiterals.EMPTY_STRING : ` -b:a ${bitRate}`;
        const codecArg = isMP3 ? ' -codec copy' : StringLiterals.EMPTY_STRING;

        const settings = Files.getSettings();
        const ffmpegPath = settings.ffmpegPath;

        const command = `"${ffmpegPath}" -y -i "${sourceFilePath}"${bitRateArg}${codecArg} "${targetFilePath}"`;

        return {
            command,
            targetFilePath
        };
    }
};
