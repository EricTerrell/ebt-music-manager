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

module.exports = class StringLiterals {
    // Audio file types
    static get FLAC_FILE_TYPE() { return 'flac'; }
    static get MP3_FILE_TYPE() { return 'mp3'; }

    static get PLAYLIST_FILE_TYPE() { return 'm3u'; }

    static get MUSIC_TARGET_FOLDER() { return 'Music'; }
    static get PLAYLISTS_TARGET_FOLDER() { return 'Playlists'; }

    // HTML Attributes
    static get HREF() { return 'href'; }

    // HTML Element Events
    static get CLICK() { return 'click'; }
    static get KEYDOWN() { return 'keydown'; }
    static get ACTIVATE() { return 'activate'; }
    static get WINDOW_ALL_CLOSED() { return 'window-all-closed'; }
    static get READY() { return 'ready'; }
    static get INPUT() { return 'input'; }
    static get CHANGE() { return 'change'; }
    static get CLOSE() { return 'close'; }

    // Grid editor types
    static get GRID_EDITOR_INPUT() { return 'input'; }
    static get GRID_EDITOR_NUMBER() { return 'number'; }

    // Grid sorter types
    static get GRID_SORTER_NUMBER() { return 'number'; }

    // Platforms
    static get DARWIN() { return 'darwin'; }

    // Window events
    static get DID_FINISH_LOAD() { return 'did-finish-load'; }
    static get DESTROYED() { return 'destroyed'; }
    static get RESIZE() { return 'resize'; }
    static get MOVE() { return 'move'; }
    static get SECOND_INSTANCE() { return 'second-instance'; }
    static get CLOSED() { return 'closed'; }

    // Tabulator Table events
    static get ROW_CLICK() { return 'rowClick'; }
    static get ROW_MOVED() { return 'rowMoved'; }
    static get TABLE_BUILT() { return 'tableBuilt'; }

    // Channels
    static get CHILD_WINDOW_CHANNEL() { return 'child-window-channel'; }
    static get USER_CANCELLED() { return 'user-cancelled'; }
    static get REJECT_LICENSE_TERMS() { return 'reject-license-terms'; }
    static get ACCEPT_LICENSE_TERMS() { return 'accept-license-terms'; }
    static get NOTIFY_SETTINGS_CHANGED() { return 'notifySettingsChanged'; }
    static get BUSY() { return 'busy'; }
    static get PROGRESS_MESSAGE() { return 'progress-message'; }
    static get UPSERT_PLAYLIST() { return 'added-playlist'; }
    static get CHECK_FOR_UPDATES() { return 'check-for-updates'; }

    // Dialog Boxes
    static get DIALOG_QUESTION() { return 'question'; }
    static get DIALOG_ERROR() { return 'error'; }
    static get DIALOG_INFO() { return 'info'; }

    // keydown/keyup character values
    static get ESCAPE() { return 'Escape'; }
    static get ENTER() { return 'Enter'; }

    // Grid columns
    static get COLUMN_PLAYLIST_POSITION() { return 'playlistPosition'; }

    // Misc
    static get EMPTY_STRING() { return ''; }
    static get ENCODING() { return 'utf8'; }

    static get PLAYLIST_COMMENT_DELIMITER() { return '#'; }

    static get TRANSCODING_STATUS_FILENAME() { return 'transcodingstatus.json'; }

    static get METADATA_FILENAME() { return 'metadata.json'; }

    static get TYPE_ALL_TRACKS() { return 'ALL_TRACKS'; }

    static get ITEM_TYPE_PLAYLISTS() { return 'playlists'; }
    static get ITEM_TYPE_ALBUMS() { return 'albums'; }
    static get ITEM_TYPE_TRACKS() { return 'tracks'; }

    static get MENU_SEPARATOR() { return 'separator'; }

    static get LICENSE_TERMS() { return 'licenseTerms.json'; }

    static get SETTINGS_FILENAME() { return 'settings.json'; }

    static get LOADING_CACHED_METADATA() { return 'Loading cached audio file metadata'; }

    static get APP_NAME() { return 'EBT Music Manager'; }

    static get UPDATING_DISPLAY() { return 'Saving changes and updating display'; }

    static get COLUMN_DATETIME_FORMAT() { return 'DD tt'; }

    static get DATA() { return 'data'; }
    static get NOT_EQUAL() { return '___NOT_EQUAL___'; }
};
