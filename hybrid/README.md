# JavaScript dead code elimination
This Node.js script analyses a web application within a directory and removes unsused functions.

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
node ./hybrid.js <directory> [options]
```
_directory_ is the directory the tool is run upon (mandatory). _options_ allow you to specify more settings:

| Long         | Short | Description                                             | Default             |
|--------------|-------|---------------------------------------------------------|---------------------|
| --index      | -i    | Specify the main HTML file.                             | index.html          |
| --verbose    | -v    | Show output to stdout.                                  |                     |  
| --csv        | -c    | Enable output to CSV file in addition to stdout.        |                     |
| --csvfile    | -f    | Specify CSV file to append data to (only with --csv).   | output.csv          |
| --graph      | -g    | Enable function graph output.                           |                     |
| --graphfile  | -d    | Specify graph (DOT) output location (only with --graph) | output.dot          |
| --algorithm  | -a    | Specify algorithms (space separated).                   | static dynamic      |


The following algorithms are available:

| Name         | Description                   |
|--------------|-------------------------------|
| static       | Static analysis               |
| dynamic      | Dynamic analysis              |



The csv file has the following columns:
```
directory name, JS files processed, # functions, # functions removed, run time (in ms), error messages
```

The graph file is outputted in DOT format, which you can visualize e.g. [here](http://www.webgraphviz.com/).



### Example
Directory _foo_ with index file _app.html_, appending result data to _bar.csv_:
```
node hybrid.js foo --index app.html --csv --csvfile bar.csv
```

