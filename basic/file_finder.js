/*
	File finder
	v1.0
	Niels Groot Obbink

	Finds all files with a certain extention (no dot) recursively in a directory.
*/

const path = require('path'),
      file_system = require('fs');



let find_files = function(directory, extention)
{
	let found_files = [];

	if( ! file_system.existsSync(directory) )
	{
		return [];
	}

	let files = file_system.readdirSync(directory);

	for(let i = 0; i < files.length; i++)
	{
		let file = path.join(directory, files[i]);

		if( file_system.lstatSync(file).isDirectory() )
		{
			found_files = found_files.concat( find_files(file, extention) );
		}else{
			// If it's not a directory, it's a file.
			if( file.split('.').pop() == extention )
			{
				found_files.push( file );
			}
		}
	}

	return found_files;
};


module.exports = find_files;
