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

const ScanForMetadata = require('../lib/scanForMetadata');
const ErrorHandler = require('../lib/errorHandler');

module.exports = class DeleteUtils {
    static deletePlaylist(playlistPath, metadata) {
        console.log(`DeleteUtils.deletePlaylist: playlistPath: "${playlistPath}"`);

        try {
            fs.rmSync(playlistPath);
        } catch (err) {
            ErrorHandler.displayError(err);
        }

        ScanForMetadata.deletePlaylist(playlistPath, metadata);
    }

    static deleteTrack(trackPath, metadata) {
        console.log(`DeleteUtils.deleteTrack: trackPath: "${trackPath}"`);

        try {
            fs.rmSync(trackPath);
        } catch (err) {
            ErrorHandler.displayError(err);
        }

        ScanForMetadata.deleteTrack(trackPath, metadata);
    }
};
