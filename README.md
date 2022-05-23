# EBT Music Manager for Windows and Linux

EBT Music Manager allows you to edit playlists and audio file metadata. EBT Music Manager allows you to sync
your music to a folder, which can be copied to mobile devices. The sync process:

1) Writes playlists to the target folder
2) Copies .mp3 files to the target folder
3) Converts .flac files to .mp3 format, and copies the .mp3 files to the target folder

EBT Music Manager runs on Windows 10, and Linux. EBT Music Manager is open source.

EBT Music Manager is built on the [`Electron`](https://github.com/electron/electron) framework.

# Copyright

EBT Music Manager

&#169; Copyright 2022, [`Eric Bergman-Terrell`](https://www.ericbt.com)

# Screenshots

![`EBT Music Manager Screenshot`](https://www.ericbt.com/artwork/ebt-music-manager/main.png "EBT Music Manager Screenshot, Main Window")

![`EBT Music Manager Screenshot`](https://www.ericbt.com/artwork/ebt-music-manager/settings.png "EBT Music Manager Screenshot, Settings")

![`EBT Music Manager Screenshot`](https://www.ericbt.com/artwork/ebt-music-manager/add-tracks-to-playlist.png "EBT Music Manager Screenshot, Adding Tracks to Playlist")

# Links

[`github repo`](https://github.com/EricTerrell/ebt-music-manager)

# Quick Start

First, install [`ffmpeg`](https://ffmpeg.org/)

To run EBT Music Manager:

```sh
git clone https://github.com/EricTerrell/ebt-music-manager.git
cd ebt-music-manager
npm install
npm start
```

Once EBT Music Manager is running, click Settings. Specify the Source and Target folders, the path to ffmpeg, and the desired bit rate and concurrency.

# License

[`GPL3`](https://www.gnu.org/licenses/gpl-3.0.en.html)

# Feedback

Please submit your feedback to EBTMusicManager@EricBT.com.