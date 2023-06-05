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

const expect = require('chai').expect;

const CommandProcessor = require('../lib/commandProcessor');

describe("CommandProcessor tests", function () {
    this.timeout(0);

    function _callback(filePath, code) {
        console.log(`${filePath} ${code}`);
    }

    const _filePath = 'this is a file path';

    it('Should run command with error', async function () {
        const cmd = CommandProcessor.execShellCommand('ffmpeg', _filePath, _callback);

        let err = null;

        try {
            await cmd;
        } catch (e) {
            err = e;
        }

        expect(err).to.not.be.null;
    });

    it('Should run command with no error (dir)', async function () {
        const cmd = CommandProcessor.execShellCommand('dir', _filePath, _callback);

        const code = await cmd;

        expect(code).to.be.equal(0);
    });

    it('Should run command with no error (ffmpeg)', async function () {
        const cmdText = 'ffmpeg -y -i "H:\\temp\\SourceFolder\\Music\\10,000 Maniacs\\10,000 Maniacs - MTV Unplugged\\01.flac" -ab 256k "H:\\temp\\TargetFolder\\01.mp3"';

        const cmd = CommandProcessor.execShellCommand(cmdText, _filePath, _callback);

        const code = await cmd;

        expect(code).to.be.equal(0);
    });
});
