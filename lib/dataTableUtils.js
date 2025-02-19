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

const path = require('path');

const {DateTime} = require("luxon");

const StringLiterals = require('../lib/stringLiterals');
const Constants = require('../lib/constants');
const NumericUtils = require('../lib/numericUtils');
const Filter = require('../lib/filter');

module.exports = class DataTableUtils {
    static toTableData(metadata, selectedItemType, syncStatus, filterSettings) {
        let result = undefined;

        switch(selectedItemType) {
            case StringLiterals.ITEM_TYPE_PLAYLISTS: {
                result = this.#getItems(Filter.filterPlaylists(metadata, filterSettings), selectedItemType,
                    syncStatus[selectedItemType]);
            }
            break;

            case StringLiterals.ITEM_TYPE_ALBUMS: {
                result = this.#getItems(Filter.filterAlbums(metadata, filterSettings), selectedItemType,
                    syncStatus[selectedItemType]);
            }
            break;

            case StringLiterals.ITEM_TYPE_TRACKS: {
                result = undefined;
            }
            break;
        }

        return result;
    }

    static #formatData(data) {
        let result = StringLiterals.EMPTY_STRING;

        if (data !== undefined) {
            result = data.toString().replaceAll("'", "\'");
        }

        return result;
    }

    static trackArrayToTableData(trackArray, syncStatus) {
        const formatData = this.#formatData.bind(this);

        let sequence = 1;

        return trackArray.map(track => ({
                'sync': syncStatus !== undefined && syncStatus[track.audioFilePath] !== undefined ?
                    syncStatus[track.audioFilePath] : false,
                'name': `${formatData(track.audioFilePath)}`,
                'album': `${formatData(track.metadata?.common?.album)}`,
                'title': `${formatData(track.metadata?.common?.title)}`,
                'discNumber': `${formatData(track.metadata?.common?.disk?.no)}`,
                'trackNumber': `${formatData(track.metadata?.common?.track?.no)}`,
                'genre': `${formatData(track.metadata?.common?.genre)}`,
                'albumArtist': `${formatData(track.metadata?.common?.albumartist)}`,
                'artist': `${formatData(track.metadata?.common?.artist)}`,
                'year': `${formatData(track.metadata?.common?.year)}`,
                'date': `${formatData(track.metadata?.common?.date)}`,
                'composer': `${formatData(track.metadata?.common?.composer)}`,
                'modificationDateTime': DateTime.fromJSDate(new Date(track.metadata.mtimeMs)),
                'sequence': `${formatData(sequence++)}`
            }));
    }

    static compareTracks(a, b) {
        const a_fields = { discNumber: a.metadata?.common?.disk?.no, trackNumber: a.metadata?.common?.track?.no };
        const b_fields = { discNumber: b.metadata?.common?.disk?.no, trackNumber: b.metadata?.common?.track?.no };

        if (a_fields.discNumber !== b_fields.discNumber) {
            return a_fields.discNumber < b_fields.discNumber ? -1 : 1;
        } else if (a_fields.trackNumber !== b_fields.trackNumber) {
            return a_fields.trackNumber < b_fields.trackNumber ? -1 : 1;
        } else {
            return 0;
        }
    }

    static #getItems(items, type, syncStatus) {
        const playlistFileType = `.${StringLiterals.PLAYLIST_FILE_TYPE}`;

        const result = items.map(name => {
            const displayName = type === StringLiterals.ITEM_TYPE_ALBUMS ? name : path.basename(name, playlistFileType);

            return {
                'name': name,
                displayName,
                'type': type,
                'sync': (syncStatus !== undefined && syncStatus[name] !== undefined) ?
                    syncStatus[name] : false
            };
        });

        return result.sort((a, b) => a.displayName.localeCompare(b.displayName));
    }

    static async copyFieldValueToEntireColumn(field, value, table) {
        const updatedData = [];

        for (const rowData of table.getData()) {
            console.log(`rowData: ${JSON.stringify(rowData)}`);

            if (rowData[field] !== value) {
                rowData[field] = value;
                rowData.changed = true;

                updatedData.push(rowData);
            }
        }

        if (updatedData.length > 0) {
            await table.updateData(updatedData);
        }

        return updatedData.length;
    }

    static getEditedCells(table, entireColumnsUpdated = {}) {
        /*
        The entireColumnsUpdated contains field names for which every column has changed.

        This is a work-around for the following issue: when copyFieldValueToEntireColumn is called, followed by
        getEditedCells, sometimes changed cells are missed.

        When getInitialValue() is called for these missed cells, the value returned is the *new* value.
         */
        const editedCells = [];

        for (const row of table.getRows()) {
            for (const cell of row.getCells()) {
                const field = cell.getColumn().getDefinition().field;

                if (field !== 'changed' && field !== 'selected' && cell.getInitialValue() !== cell.getValue()) {
                    editedCells.push(cell);
                } else if (entireColumnsUpdated[field] !== undefined) {
                    editedCells.push(cell);
                }
            }
        }

        return editedCells;
    }

    static getRowsInDisplayedOrder(table) {
        return table
            .getRows()
            .map(row => ({
            row,
            'position': table.getRowPosition(row, true)
        }))
            .sort((a, b) => a.position - b.position)
            .map(item => (item.row));
    }

    static getTracksTableColumns(createContextMenu, cellEdited, syncStatusChangedTrack) {
        return [
            {field: StringLiterals.CHANGE_TRACK_ORDER, rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30},
            {title: "Selected", field: "selected", width: 100, responsive: 0, 'frozen': true, editor:  "tickCross",
                cellEdited: cellEdited, formatter: "tickCross",
                formatterParams: {
                    'allowEmpty': true
                },
                editorParams: {
                    'tristate': false
                }
            },
            {
                title: "Sync", field: "sync", width: 100, responsive: 0, 'frozen': true, editor: "tickCross",
                cellEdited: syncStatusChangedTrack, formatter: "tickCross",
                formatterParams: {
                    'allowEmpty': false
                },
                editorParams: {
                    'tristate': false
                }
            },
            {title: "Changed", field: "changed", width:100, responsive: 0, 'frozen': true, formatter:"tickCross",
                formatterParams: {
                    'allowEmpty': true
                }
            },
            {title: "Album", field: "album", width: 200, responsive: 0,
                editor: StringLiterals.GRID_EDITOR_INPUT, cellEdited: cellEdited,
                contextMenu: createContextMenu("Album")},
            {title: "Title", field: "title", width: 200, responsive: 0,
                editor: StringLiterals.GRID_EDITOR_INPUT, cellEdited: cellEdited},
            {title: "Disc #", field: "discNumber", width:100, responsive: 0,
                editor: StringLiterals.GRID_EDITOR_NUMBER, cellEdited: cellEdited,
                editorParams: Constants.SEQUENCE_EDITOR_PARAMS, sorter: StringLiterals.GRID_SORTER_NUMBER,
                contextMenu: createContextMenu("Disc #")},
            {title: "Track #", field: "trackNumber", width:100, responsive: 0,
                editor: StringLiterals.GRID_EDITOR_NUMBER, cellEdited: cellEdited,
                editorParams: Constants.SEQUENCE_EDITOR_PARAMS, sorter: StringLiterals.GRID_SORTER_NUMBER},
            {title: "Sequence", field: StringLiterals.COLUMN_SEQUENCE, width: 100, responsive: 0,
                sorter: StringLiterals.GRID_SORTER_NUMBER
            },
            {title: "Genre", field: "genre", width:100, responsive: 0,
                editor: StringLiterals.GRID_EDITOR_INPUT, cellEdited: cellEdited,
                contextMenu: createContextMenu("Genre")},
            {title: "Album Artist", field: "albumArtist", width:100, responsive: 0,
                editor: StringLiterals.GRID_EDITOR_INPUT, cellEdited: cellEdited,
                contextMenu: createContextMenu("Album Artist")},
            {title: "Artist", field: "artist", width:100, responsive: 0,
                editor: StringLiterals.GRID_EDITOR_INPUT, cellEdited: cellEdited,
                contextMenu: createContextMenu("Artist")},
            {title: "Composer", field: "composer", width:100, responsive: 0,
                editor: StringLiterals.GRID_EDITOR_INPUT, cellEdited: cellEdited,
                contextMenu: createContextMenu("Composer")},
            {title: "Date", field: "date", width:50, responsive: 0,
                editor: StringLiterals.GRID_EDITOR_INPUT, cellEdited: cellEdited,
                contextMenu: createContextMenu("Date")},
            {title: "File Path", field: "name", width: 50, responsive: 0},
            {title: "Modified", field: "modificationDateTime", sorter: 'datetime', formatter: 'datetime',
                formatterParams: {
                    inputFormat: "yyyy-MM-dd HH:ss",
                    outputFormat: StringLiterals.COLUMN_DATETIME_FORMAT,
                    invalidPlaceholder:"(invalid date)",
                    timezone:"America/Denver",
                }
            }
        ];
    }

    static #getUpdatesArray(keys, value) {
        return keys.map(key => {
            const update = {};
            update[key] = value;

            return update;
        });
    }

    static getUpdatesForField(field, value) {
        let updates = undefined;

        switch (field) {
            case 'title': {
                updates = this.#getUpdatesArray(['title', 'TITLE'], value);
            }
                break;

            case 'trackNumber': {
                updates = this.#getUpdatesArray(['track'], NumericUtils.zeroPad(value, 3));
            }
                break;

            case 'discNumber': {
                updates = this.#getUpdatesArray(['DISC'], NumericUtils.zeroPad(value, 3));
            }
                break;

            case 'album': {
                updates = this.#getUpdatesArray(['album'], value);
            }
                break;

            case 'albumArtist': {
                updates = this.#getUpdatesArray(['albumartist', 'ALBUM ARTIST', 'album_artist'], value);
            }
                break;

            case 'artist': {
                updates = this.#getUpdatesArray(['ARTIST'], value);
            }
                break;

            case 'genre': {
                updates = this.#getUpdatesArray(['GENRE'], value);
            }
                break;

            case 'date': {
                updates = this.#getUpdatesArray(['DATE'], value);
            }
                break;

            case 'composer': {
                updates = this.#getUpdatesArray(['COMPOSER'], value);
            }
                break;
        }

        return updates;
    }
};

