# JavaScript dead code elimination
This Node.js script dynamically analyses a web application within a directory and removes unsused functions. It only checks for function calls within a certain time (default 5 seconds) of startup. All functions that are not called are removed. Only works on .js files, not JavaScript code embedded in a HTML document.

```diff
- Warning: this tool re-writes all .js files in the directory! Back up your code before running.
```



## Prerequisites
Requires a directory with a main HTML file. This file should have an `<head>` tag.
Also assumes all JS files are valid (i.e. no parse errors).



## Installation
Requires the following applications on the host system:
+ Xvfb (`xvfb`)
+ Chromium (`chromium-browser`)



## Running
```
node jdce.js <directory> [options]
```
_directory_ is the directory the tool is run upon (mandatory). _options_ allow you to specify more settings:

| Long      | Short | Description                                    | Default    |
|-----------|-------|------------------------------------------------|------------|
| --timeout | -t    | Specify the Chromium run time in milliseconds. | 5000       |
| --index   | -i    | Specify the main HTML file.                    | index.html |


Example: directory _foo_ with index file _app.html_ and a run time of 10 seconds:
```
node jdce.js foo --index app.html --timeout 10000
```
