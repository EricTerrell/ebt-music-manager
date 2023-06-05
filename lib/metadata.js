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

const ffMetadata = require('ffmetadata');

const Files = require('../lib/files');

module.exports = class Metadata {
    /**
     * Read metadata. Note: ffmetadata reads *much* slower than music-metadata. About 25x slower.
     * @param filePath path of audio file
     * @returns promise
     */
    static async read(filePath) {
        return new Promise(function(resolve, reject) {
            const options = {
                'coverPath': undefined
            };

            ffMetadata.setFfmpegPath(Files.getSettings().ffmpegPath);

            ffMetadata.read(filePath, options, function (err, data) {
                if (!err) {
                    console.log(data);
                    resolve(data);
                } else {
                    console.error(err);
                    reject(err);
                }
            });
        });
    }

    static async write(filePath, data) {
        return new Promise(function(resolve, reject) {
            const options = {
                'coverPath': undefined
            };

            ffMetadata.setFfmpegPath(Files.getSettings().ffmpegPath);

            ffMetadata.write(filePath, data, options,function (err) {
                if (!err) {
                    resolve();
                } else {
                    console.error(err);
                    reject(err);
                }
            });
        });
    }
};
