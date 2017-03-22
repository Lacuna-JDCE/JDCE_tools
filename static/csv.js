/*
	CSV tools
	v1.0
	Niels Groot Obbink

	Functions to handle CSV data output.
*/
let file_system = require('fs');



module.exports = function(enabled, directory, file)
{
	this.enabled = enabled;
	this.directory = directory;
	this.file = file;

	this.append = function(data)
	{
		if( ! this.enabled )
		{
			return;
		}

		data.unshift(this.directory);

		// Runtime in ns -> ms
		data[4] = (data[4] * 1e-6).toFixed(0);

		let line = data.join(',') + '\n';

		file_system.appendFileSync(this.file, line, function(error)
		{
			console.error('Failed to write to file', file, ':', error);
			process.exit(1);
		});
	};
};
