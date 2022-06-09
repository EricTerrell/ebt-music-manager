# EBT Music Manager

EBT Music Manager allows you to edit playlists and audio file metadata. EBT Music Manager can play your playlists, 
albums, and tracks. EBT Music Manager allows you to sync
your music to a folder, which can be copied to mobile devices. The sync process:

1) Writes playlists to the target folder
2) Copies .mp3 files to the target folder
3) Converts .flac files to .mp3 format, and copies the .mp3 files to the target folder

EBT Music Manager runs on 64-bit Windows. EBT Music Manager is open source.

EBT Music Manager is built on the [`Electron`](https://github.com/electron/electron) framework.

# Copyright

EBT Music Manager

&#169; Copyright 2022, [`Eric Bergman-Terrell`](https://www.ericbt.com)

# Screenshots

![`EBT Music Manager Screenshot`](https://www.ericbt.com/artwork/ebt-music-manager/main.png "Main Window")

![`EBT Music Manager Screenshot`](https://www.ericbt.com/artwork/ebt-music-manager/settings.png "Settings")

![`EBT Music Manager Screenshot`](https://www.ericbt.com/artwork/ebt-music-manager/add-tracks-to-playlist.png "Adding Tracks to Playlist")

![`EBT Music Manager Screenshot`](https://www.ericbt.com/artwork/ebt-music-manager/filter.png "Filtering")

![`EBT Music Manager Screenshot`](https://www.ericbt.com/artwork/ebt-music-manager/playback.png "Playback")

# Links

* [`website`](https://www.ericbt.com/ebt-music-manager)
* [`binaries`](https://www.ericbt.com/ebt-music-manager/download)
* [`installation`](https://www.ericbt.com/ebt-music-manager/installation)
* [`version history`](https://www.ericbt.com/ebt-music-manager/versionhistory)
* [`github repo`](https://github.com/EricTerrell/ebt-music-manager)

# Installation

See [`installation`](https://www.ericbt.com/ebt-music-manager/installation).

# Quick Start

First, install [`ffmpeg`](https://ffmpeg.org/) version 5.xx.

To run EBT Music Manager:

```sh
git clone https://github.com/EricTerrell/ebt-music-manager.git
cd ebt-music-manager
npm install
npm start
```

Once EBT Music Manager is running, click Settings. Specify the Source and Target folders, the path to ffmpeg, and the desired bit rate and concurrency.

# Building

To build a version of EBT Music Manager suitable for distribution:

```
npm run build
```

# Version History

See [`version history`](https://www.ericbt.com/ebt-music-manager/versionhistory).

# Linux and OSX Versions

There are no barriers to creating Linux and OSX versions. If you would like to help test a Linux or OSX version, contact me at EBTMusicManager@EricBT.com.

# License

[`GPL3`](https://www.gnu.org/licenses/gpl-3.0.en.html)

# Feedback

Please submit your feedback to EBTMusicManager@EricBT.com.