# JavaScript static dead code elimination
This Node.js script statically analyses a web application within a directory and removes unsused functions.

```diff
- Warning: this tool re-writes files in the directory! Back up your code before running.
```



## Prerequisites
Requires a directory with a main HTML file.
Also assumes all JS files are valid (i.e. no parse errors).



## Installing
```
git submodule update
```



## Running
```
node ./static.js <directory> [options]
```
_directory_ is the directory the tool is run upon (mandatory). _options_ allow you to specify more settings:

| Long         | Short | Description                                             | Default             |
|--------------|-------|---------------------------------------------------------|---------------------|
| --verbose    | -v    | Output per-file information about removed functions.    |                     |
| --csv        | -c    | Enable output to CSV file in addition to stdout.        |                     |
| --csvfile    | -f    | Specify CSV file to append data to (only with --csv).   | output.csv          |
| --index      | -i    | Specify the main HTML file.                             | index.html          |
| --strategy   | -s    | Specify call graph strategy: NONE, ONESHOT or DEMAND    | NONE                |


The csv file has the following columns:
```
directory name, JS files processed, # functions, # functions removed, run time (in ms), error messages
```

### Example
Directory _foo_ with index file _app.html_, appending result data to _bar.csv_:
```
node static.js foo --index app.html --csv --csvfile bar.csv
```
