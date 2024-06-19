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

const StringLiterals = require('../lib/stringLiterals');
const Constants = require('../lib/constants');
const Files = require('../lib/files');
const {pd: prettyData} = require('pretty-data');

module.exports = class SyncStatus {
    static load() {
        let syncStatus = this.getDefault();

        try {
            const settings = Files.getSettings();

            const filePath = path.join(settings.targetFolder, StringLiterals.SYNC_STATUS_FILENAME);
            syncStatus = JSON.parse(fs.readFileSync(filePath, Constants.READ_WRITE_FILE_OPTIONS));
        } catch (e) {
            console.error(e);
        }

        return syncStatus;
    }

    static save(syncStatus) {
        const settings = Files.getSettings();
        const filePath = path.join(settings.targetFolder, StringLiterals.SYNC_STATUS_FILENAME);

        fs.writeFileSync(filePath, prettyData.json(JSON.stringify(syncStatus)), Constants.READ_WRITE_FILE_OPTIONS);
    }

    static deleteObsoleteData(syncStatus, metadata) {
        const filteredPlaylists =
            Object.entries(syncStatus.playlists).filter(([sourceFilePath /*, value */]) =>
                fs.existsSync(sourceFilePath));

        syncStatus.playlists = Object.fromEntries(filteredPlaylists);

        const filteredTracks =
            Object.entries(syncStatus.tracks).filter(([sourceFilePath /*, value */]) =>
                fs.existsSync(sourceFilePath));

        syncStatus.tracks = Object.fromEntries(filteredTracks);

        const filteredAlbums =
            Object.entries(syncStatus.albums).filter(([album /*, value */]) =>
                metadata.albums[album] !== undefined);

        syncStatus.albums = Object.fromEntries(filteredAlbums);
    }

    static getDefault() {
        return { [StringLiterals.ITEM_TYPE_PLAYLISTS]: {}, [StringLiterals.ITEM_TYPE_ALBUMS]: {},
            [StringLiterals.ITEM_TYPE_TRACKS]: {} };
    }
};
