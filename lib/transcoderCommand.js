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

const StringLiterals = require('../lib/stringLiterals');
const AudioFileUtils = require('../lib/audioFileUtils');

module.exports = class TranscoderCommand {
    static createCommand(metadata, settings, targetRootFolder, sourceFilePath, album, bitRate = StringLiterals.EMPTY_STRING) {
        const targetFilePath = AudioFileUtils.getTargetFilePath(metadata, settings, sourceFilePath, targetRootFolder);

        const isMP3 = AudioFileUtils.isMP3(sourceFilePath);

        const bitRateArg = isMP3 ? StringLiterals.EMPTY_STRING : ` -b:a ${bitRate}`;
        const codecArg = isMP3 ? ' -codec copy' : StringLiterals.EMPTY_STRING;

        const ffmpegPath = settings.ffmpegPath;

        const command = `"${ffmpegPath}" -y -i "${sourceFilePath}"${bitRateArg}${codecArg} "${targetFilePath}"`;

        return {
            command,
            targetFilePath
        };
    }
};
