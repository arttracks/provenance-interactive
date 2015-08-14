## To run the application:

    bundle exec middleman
    <http://localhost:4567/>

---

## How to update the gallery interactive:

Get an export
Convert the export to json

```
cmoa
cd art_tracks_utils
arttracks convert <XML_FILE> --intranet
# once for each of the three exports
```

copy the data files into the provenance_reporter directory


run the provenance reporter

```
cmoa
cd provenance-reporter
bundle exec ruby test.rb

```

run the images script

```
bundle exec ruby images.rb
# note that you must be on CMOA internal network, and not connected to WIFI
```

copy the images in the gallery8 directory to `gallery_interactive`

```
cmoa
cd gallery_interactive
middleman server
# verify
git add .
git commit -m "this is my message"
rake build
rake publish
