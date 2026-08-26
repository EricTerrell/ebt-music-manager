/*
  EBT Music Manager
  (C) Copyright 2026, Eric Bergman-Terrell

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

module.exports = class TrackUtils {
    // Return the longest prefix for all tracks, or undefined if there is not a common prefix.
    static prefix(trackArray) {
        function startsWith(prefix) {
            return function(element) {
                return element.metadata.common.title.indexOf(prefix) === 0;
            }
        }

        for (let i = trackArray[0].metadata.common.title.length; i > 0; i--) {
            let prefix = trackArray[0].metadata.common.title.substring(0, i);

            // https://stackoverflow.com/questions/7759237/how-do-i-pass-an-extra-parameter-to-the-callback-function-in-javascript-filter
            let matches = trackArray.filter(startsWith(prefix)).length;

            if (matches === trackArray.length) {
                return prefix;
            }
        }

        return undefined;
    }
};