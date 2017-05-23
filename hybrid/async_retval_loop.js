/*
	Async loop
	Niels Groot Obbink

	Executes the functions in array one by one, passing the result, settings object and callback function as arguments.
*/

module.exports = function(functions, settings, callback)
{
	let i = -1,
	    length = functions.length;

	let loop = function(result)
	{
		i++;

		if( i == length )
		{
			callback();
			return;
		}

		settings.fingerprint = settings.fingerprints[i + 1];

		functions[i](settings, loop);
	}
 
	loop();
};
