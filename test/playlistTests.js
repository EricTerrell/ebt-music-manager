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

const fs = require('fs');

const ScanForMetadata = require("../lib/scanForMetadata");

describe("Playlist tests", async function () {
    this.timeout(0);

    it('fixup file paths', async function () {
        this.skip();

        const metadata = await ScanForMetadata.scan('D:\\Media\\Music Files',
            'L:\\');

        console.log('PLAYLISTS:\r\n\r\n');

        metadata.playlistFilePaths.forEach(playlistFilePath => {
            console.log(playlistFilePath);

            const content = fs.readFileSync(playlistFilePath).toString();

            const adjustedContent = content.replaceAll('D:\\Media\\Music', 'D:\\Media\\Music Files');

            fs.writeFileSync(playlistFilePath, adjustedContent);
        })
    });
});
