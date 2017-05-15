/*
	JavaScript dynamic dead code elimination tool.
	Niels Groot Obbink
*/

'use strict';


let HtmlEditor = require('./html_editor'),
    file_finder = require('./file_finder'),
	JsEditor = require('./js_editor'),
    Browser = require('./browser');


module.exports =
{
	settings:
	{
		logger_name: '___jdce_logger'
	},
 

	run: function(settings, callback)
	{
		// Keep a timer, so we know how long the tool took to run.
		let start_time = process.hrtime();

		// Save statistics, so we can return them to our caller later.
		let stats = 
		{
			js_files: 0,
			function_count: 0,
			functions_removed: 0,
			run_time: 0
		};

		// Log call is formatted 'identifier|file|start|end'.
		let js_head_code = `
			var ` + this.settings.logger_name + ` = function(file_name, start, end)
			{
				console.log('` + this.settings.logger_name + `|' + file_name + '|' + start + '|' + end);
			};
		`;

		// Create a new HTML editor instance. We'll reset the HTML source later.
		let html = new HtmlEditor();

		// Retrieve HTML source.
		html.load(settings.html_path);

		// Add the script tag to the begining of the <head> tag.
		html.add( '<script>' + js_head_code + '</script>', html.location.HEAD_FIRST );

		// Overwrite the old source.
		html.save();

		// Get all JS files.
		let script_files = file_finder(settings.directory, 'js'),
		    script_editors = {};

		stats.js_files = script_files.length;

		// Process each script.
		script_files.forEach(function(logger_name)
		{
			return function(file)
			{
				// Create a new script editor instance and save it so we can remove the unused functions afterwards.
				let js = new JsEditor();

				// Save it, so we can access it later (and restore the original source).
				script_editors[file] = js;

				js.load(file);

				// Gather total function count.
				stats.function_count += js.functions.length;

				// Add a log call to each function in this script. The only argument (a function) specifies the format.
				js.add_log_calls(function(file, start, end)
				{
					return logger_name + '("' + file + '", ' + start + ', ' + end + ');';
				});

				js.save();
			}
		}(this.settings.logger_name));



		// Create a new Browser instance, and a list of all log calls.
		let browser = new Browser(),
		    log_calls = [],
		    logger_name = this.settings.logger_name;

		// Open the web app, and deal with the results.
		browser.start();

		browser.load(settings.html_path, settings.timeout, function(console_logs)
		{
			parse_logs(console_logs, logger_name);
			cleanup();
			return_results();
		});



		function parse_logs(logs, logger_name)
		{
			let logs_per_file = {};

			logs.forEach(function(log)
			{
				// logs are formatted 'identifier|file|start|stop'.
				let regex = /([^\|]+)\|([^\|]+)\|([0-9]+)\|([0-9]+)/g;
				let result = regex.exec(log);	// [data, logger_name, file_name, start, end]

				// Only look for logs that start with our log identifier.
				if(result === null ||  result[1] != logger_name)
				{
					return;
				}

				let file = result[2],
				    start = result[3],
				    end = result[4];

				if( ! logs_per_file.hasOwnProperty(file) )
				{
					logs_per_file[ file ] = [];
				}

				// Comparison function
				let exists = function(entry)
				{
					return entry.start == start && entry.end == end;
				};

				// Functions can be called twice or more, so remove duplicate entries before inserting.
				if( ! logs_per_file[ file ].some( exists ) )
				{
					logs_per_file[ file ].push(
					{
						start: start,
						end: end
					});
				}
			});

			handle_logs(logs_per_file);
		}



		function handle_logs(logs)
		{
			for(let file in logs)
			{
				if(logs.hasOwnProperty(file))
				{
					// Create a new script editor instance.
					let js = script_editors[file];

					// The script is already load()ed (but the source was changed).
					// First, reset to original source code.
					js.restore(file);

					// Retrieve uncalled functions, based on the list of called functions.
					let uncalled_functions = js.get_uncalled_functions( logs[file] );

					let removed = js.remove_functions( uncalled_functions );

					// Save the amount of removed functions in the stats.
					stats.functions_removed += removed;

					js.save();
				}
			}
		}



		function cleanup()
		{
			// Remove inserted script tag from the HTML source.
			html.restore();

			// Close the browser.
			browser.stop();
		}



		function return_results()
		{
			// Calculate run time and save it in the stats object.
			let end_time = process.hrtime(start_time);
			stats.run_time = ((end_time[0] * 1e9 + end_time[1]) * 1e-6).toFixed(0);

			// Return statistics to caller.
			callback( stats );
		}
	}
};
