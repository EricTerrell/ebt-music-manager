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

module.exports = class Constants {
    static get READ_WRITE_FILE_OPTIONS() { return { 'encoding': 'utf8' }; }

    static get SEQUENCE_EDITOR_PARAMS() {
        return {
            min: 1
        }
    }

    static get YES_NO_CANCEL() { return ['Yes', 'No', 'Cancel']; }
    static get OK() { return ['OK']; }

    static get OPEN_FOLDER_PROPERTIES() {
        return ['openDirectory'];
    }

    static get OPEN_FILE_PROPERTIES() {
        return ['openFile'];
    }

    static get VERSION_CHECK_INTERVAL_DAYS() { return 7; }

    static get GB() { return 1024 * 1024 * 1024; }
};
