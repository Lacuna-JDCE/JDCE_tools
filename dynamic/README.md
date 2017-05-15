# JavaScript dynamic dead code elimination
This Node.js script dynamically analyses a web application within a directory and removes unsused functions.

```diff
- Warning: this tool re-writes files in the directory! Back up your code before running.
```



## Prerequisites
Requires a directory with a main HTML file. This file should have a _head_ tag.
Also assumes all JavaScript code is valid (i.e. no parse errors).



## Installing
```
npm install
```



## Running
```
node ./dynamic.js <directory> [options]
```
_directory_ is the directory the tool is run upon (mandatory). _options_ allow you to specify more settings:

| Long         | Short | Description                                             | Default             |
|--------------|-------|---------------------------------------------------------|---------------------|
| --index      | -i    | Specify the main HTML file.                             | index.html          |
| --csv        | -c    | Enable output to CSV file in addition to stdout.        |                     |
| --csvfile    | -f    | Specify CSV file to append data to (only with --csv).   | output.csv          |
| --timeout    | -t    | Specify browser runtime timeout (in milliseconds)       | 5000                |



The csv file has the following columns:
```
directory name, JS files processed, # functions, # functions removed, run time (in ms), error messages
```

### Example
Directory _foo_ with index file _app.html_, appending result data to _bar.csv_:
```
node dynamic.js foo --index app.html --csv --csvfile bar.csv
```
